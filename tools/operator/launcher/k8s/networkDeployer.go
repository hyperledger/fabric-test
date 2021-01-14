// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package k8s

import (
	"fmt"
	"io/ioutil"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"

	apiv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	//
	// Or uncomment to load specific auth plugins
	// _ "k8s.io/client-go/plugin/pkg/client/auth/azure"
	// _ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
	// _ "k8s.io/client-go/plugin/pkg/client/auth/oidc"
	// _ "k8s.io/client-go/plugin/pkg/client/auth/openstack"
)

type configmapData struct {
	MSP        map[string]string
	TLS        map[string]string
	Config     map[string]string
	Admincerts map[string]string
	CA         map[string]string
}

//CreateStatefulset --
func (k8s K8s) CreateStatefulset(launchConfig LaunchConfig, nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	ns := nsConfig.K8s.Namespace

	if launchConfig.Type != "ca" {
		certsTypes := []string{"msp", "tls", "config"}
		for _, t := range certsTypes {
			err := k8s.createConfigMap(launchConfig.Name, launchConfig.Type, t, ns, nsConfig, clientset)
			if err != nil {
				return err
			}
		}
		if nsConfig.K8s.DataPersistence == "true" {
			err := k8s.createPVC(launchConfig.Name, ns, nsConfig, clientset)
			if err != nil {
				return err
			}
		}
	}

	err := k8s.createService(launchConfig.Name, launchConfig.Type, ns, launchConfig.Ports, nsConfig, clientset)
	if err != nil {
		return err
	}

	var replicas int32 = 1
	statefulsetClient := clientset.AppsV1().StatefulSets(ns)
	statefulsetRes := &apiv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{
			Name: launchConfig.Name,
		},
		Spec: apiv1.StatefulSetSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"k8s-app": launchConfig.Name,
					"type":    launchConfig.Type,
				},
			},
			ServiceName: launchConfig.Name,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"k8s-app": launchConfig.Name,
						"type":    launchConfig.Type,
					},
				},
				Spec: corev1.PodSpec{
					Volumes:    launchConfig.Volumes,
					Containers: launchConfig.Containers,
				},
			},
		},
	}

	if nsConfig.Metrics && launchConfig.Type != "ca" && launchConfig.Type != "couchdb" {
		annotations := map[string]string{
			"prometheus.io/scrape": "true",
			"prometheus.io/path":   "metrics",
			"prometheus.io/port":   fmt.Sprintf(":%d", launchConfig.Ports[1]),
			"prometheus.io/scheme": "http",
		}
		statefulsetRes.Spec.Template.ObjectMeta.Annotations = annotations
	}

	logger.INFO("Creating Statefulset for ", launchConfig.Name)
	result, err := statefulsetClient.Create(statefulsetRes)
	if err != nil {
		return errors.Wrap(err, "failed to create statefulset")
	}
	logger.INFO("Created Statefulset ", result.GetName())

	return nil
}

func (k8s K8s) createConfigMap(name, componentType, certsType, namespace string, nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	configmapRes := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("%s-%s", name, certsType),
		},
		Data: k8s.certsLists(name, componentType, certsType, nsConfig),
	}

	_, err := clientset.CoreV1().ConfigMaps(namespace).Create(configmapRes)
	if err != nil {
		return errors.Wrap(err, "failed to create configmap")
	}
	return nil
}

//CreateNameSpace --
func (k8s K8s) CreateNameSpace(ns string, clientset *kubernetes.Clientset) error {

	nsSpec := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}}
	_, err := clientset.CoreV1().Namespaces().Create(nsSpec)
	if err != nil {
		return errors.Wrap(err, "failed to create namespace")
	}
	return nil
}

//DeleteNameSpace --
func (k8s K8s) DeleteNameSpace(ns string, clientset *kubernetes.Clientset) error {

	var gracePeriodSeconds int64 = 0
	var deletionPropagation metav1.DeletionPropagation = "Background"
	options := &metav1.DeleteOptions{GracePeriodSeconds: &gracePeriodSeconds, PropagationPolicy: &deletionPropagation}
	err := clientset.CoreV1().Namespaces().Delete(ns, options)
	if err != nil {
		return errors.Wrap(err, "failed to delete namespace")
	}
	status := make(chan string, 1)
	go func() {
		for {
			_, err = clientset.CoreV1().Namespaces().Get(ns, metav1.GetOptions{})
			if err != nil {
				status <- "deleted"
			}
			time.Sleep(10 * time.Second)
		}
	}()
	select {
	case res := <-status:
		logger.INFO("Namespace ", ns, " is ", res)
	case <-time.After(180 * time.Second):
		return errors.Wrap(err, " namespace is still in terminating phase")
	}
	return nil
}

func (k8s K8s) createPVC(name, ns string, nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	pvcRes := &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("%s-data", name),
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			StorageClassName: &nsConfig.K8s.StorageClass,
			AccessModes:      nsConfig.K8s.AccessMode,
			Resources: corev1.ResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceName("storage"): resource.MustParse(nsConfig.K8s.StorageCapacity),
				},
			},
		},
	}

	logger.INFO("Creating PVC...")
	_, err := clientset.CoreV1().PersistentVolumeClaims(ns).Create(pvcRes)
	if err != nil {
		return errors.Wrap(err, "failed to create pvc")
	}
	return nil
}

func (k8s K8s) createService(name, componentType, ns string, ports []int32, nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	servicePorts := make([]corev1.ServicePort, 0)
	var serviceType corev1.ServiceType
	if componentType == "couchdb" {
		sp := corev1.ServicePort{
			Name: "port0",
			Port: 5984,
		}
		serviceType = corev1.ServiceType("ClusterIP")
		servicePorts = append(servicePorts, sp)
	} else {
		for i, p := range ports {
			sp := corev1.ServicePort{
				Name: fmt.Sprintf("port%d", i),
			}
			if componentType == "ca" {
				sp.Port = 7054
			} else {
				sp.Port = p
			}
			if nsConfig.K8s.ServiceType == "NodePort" {
				sp.NodePort = p
			}
			serviceType = corev1.ServiceType(nsConfig.K8s.ServiceType)
			servicePorts = append(servicePorts, sp)
		}
	}
	serviceRes := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				"k8s-app": name,
			},
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{
				"k8s-app": name,
			},
			Type:  serviceType,
			Ports: servicePorts,
		},
	}

	_, err := clientset.CoreV1().Services(ns).Create(serviceRes)
	if err != nil {
		return errors.Wrap(err, "failed to create service")
	}
	return nil
}

//CreateSecret --
func (k8s K8s) CreateSecret(name string, nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	ns := nsConfig.K8s.Namespace
	channelArtifactPath := paths.ChannelArtifactsDir(nsConfig.ArtifactsLocation)
	path := paths.JoinPath(channelArtifactPath, "genesis.block")
	data, err := ioutil.ReadFile(path)
	if err != nil {
		logger.ERROR("Failed to read genesis block")
		return err
	}
	secretRes := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("%s", name),
		},
		Data: map[string][]byte{
			"genesis.block": data,
		},
	}

	_, err = clientset.CoreV1().Secrets(ns).Create(secretRes)
	if err != nil {
		return errors.Wrap(err, "failed to create secret")
	}
	return nil
}

func (k8s K8s) listPods(ns string, clientset *kubernetes.Clientset) ([]corev1.Pod, error) {

	result, err := clientset.CoreV1().Pods(ns).List(metav1.ListOptions{})
	if err != nil {
		return nil, errors.Wrap(err, "failed to list pods")
	}
	return result.Items, nil
}

//NodeStatus --
func (k8s K8s) NodeStatus(clientset *kubernetes.Clientset) (corev1.NodeStatus, error) {

	var nodeStatus corev1.NodeStatus
	nodesList, err := clientset.CoreV1().Nodes().List(metav1.ListOptions{})
	if err != nil {
		return nodeStatus, errors.Wrap(err, "failed to list nodes")
	}
	node, err := clientset.CoreV1().Nodes().Get(nodesList.Items[0].ObjectMeta.Name, metav1.GetOptions{})
	if err != nil {
		return nodeStatus, errors.Wrap(err, "failed to get status of node")
	}
	return node.Status, nil
}

//ServiceStatus --
func (k8s K8s) ServiceStatus(ns, serviceName string, clientset *kubernetes.Clientset) (*corev1.Service, error) {

	service, err := clientset.CoreV1().Services(ns).Get(serviceName, metav1.GetOptions{})
	if err != nil {
		return &corev1.Service{}, errors.Wrap(err, "failed to get service spec")
	}
	return service, nil
}

func (k8s K8s) readData(componentName, orgName, componentType, filePath string) string {

	cryptoConfigPath := paths.CryptoConfigDir(k8s.Config.ArtifactsLocation)
	path := paths.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s/%ss/%s.%s/%s", componentType, orgName, componentType, componentName, orgName, filePath))
	d, _ := ioutil.ReadFile(fmt.Sprintf("%s", path))
	return string(d)
}

func (k8s K8s) certsLists(componentName, componentType, certsType string, nsConfig networkspec.Config) map[string]string {

	var cm configmapData
	c := strings.Split(componentName, "-")
	orgName := c[len(c)-1]
	if certsType == "msp" {
		cm.MSP = map[string]string{
			"cacerts":    k8s.readData(componentName, orgName, componentType, fmt.Sprintf("msp/cacerts/ca.%s-cert.pem", orgName)),
			"signcerts":  k8s.readData(componentName, orgName, componentType, fmt.Sprintf("msp/signcerts/%s.%s-cert.pem", componentName, orgName)),
			"keystore":   k8s.readData(componentName, orgName, componentType, "msp/keystore/priv_sk"),
			"tlscacerts": k8s.readData(componentName, orgName, componentType, fmt.Sprintf("msp/tlscacerts/tlsca.%s-cert.pem", orgName)),
		}
		if nsConfig.EnableNodeOUs {
			cm.MSP["config"] = k8s.readData(componentName, orgName, componentType, "msp/config.yaml")
		}
		return cm.MSP
	} else if certsType == "tls" {
		cm.TLS = map[string]string{
			"server.crt": k8s.readData(componentName, orgName, componentType, "tls/server.crt"),
			"server.key": k8s.readData(componentName, orgName, componentType, "tls/server.key"),
			"ca.crt":     k8s.readData(componentName, orgName, componentType, "tls/ca.crt"),
		}
		return cm.TLS
	} else if certsType == "config" {
		typeName := componentType
		if componentType == "peer" {
			typeName = "core"
		}
		componentConfig := fmt.Sprintf("%s.yaml", typeName)
		cm.Config = map[string]string{
			componentConfig: k8s.readData(componentName, orgName, componentType, fmt.Sprintf("%s-%s.yaml", typeName, componentName)),
		}
		return cm.Config
	} else if certsType == "admincerts" {
		var certPath string
		if nsConfig.EnableNodeOUs {
			certPath = "msp/admincerts"
			cm.Admincerts = map[string]string{
				"admincerts": "",
			}
		} else {
			certPath = fmt.Sprintf("msp/admincerts/Admin@%s-cert.pem", orgName)
			cm.Admincerts = map[string]string{
				"admincerts": k8s.readData(componentName, orgName, componentType, fmt.Sprintf("%s", certPath)),
			}
		}
		return cm.Admincerts
	} else if certsType == "ca" {
		caCert := fmt.Sprintf("ca.%s-cert.pem", orgName)
		tlscaCert := fmt.Sprintf("tlsca.%s-cert.pem", orgName)
		cm.CA = map[string]string{
			caCert:          k8s.readData(componentName, orgName, componentType, fmt.Sprintf("../../ca/ca.%s-cert.pem", orgName)),
			"ca-priv_sk":    k8s.readData(componentName, orgName, componentType, "../../ca/ca-priv_sk"),
			tlscaCert:       k8s.readData(componentName, orgName, componentType, fmt.Sprintf("../../tlsca/tlsca.%s-cert.pem", orgName)),
			"tlsca-priv_sk": k8s.readData(componentName, orgName, componentType, "../../tlsca/tlsca-priv_sk"),
		}
		return cm.CA
	}
	return nil
}

func (k8s K8s) createCertsConfigmap(numCA int, componentType, orgName string, nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	err := k8s.createConfigMap(orgName, componentType, "admincerts", nsConfig.K8s.Namespace, nsConfig, clientset)
	if err != nil {
		return errors.Wrap(err, "failed to create configmap")
	}
	if numCA > 0 || k8s.Config.TLS == "mutual" {
		err = k8s.createConfigMap(orgName, componentType, "ca", nsConfig.K8s.Namespace, nsConfig, clientset)
		if err != nil {
			return errors.Wrap(err, "failed to create configmap")
		}
	}
	return nil
}

func (k8s K8s) verifyContainersAreRunning(ns, podName string, clientset *kubernetes.Clientset, wg *sync.WaitGroup) error {

	defer wg.Done()
	logger.INFO("Checking status of pod ", podName, " to verify if it is running")
	opts := metav1.ListOptions{
		LabelSelector: fmt.Sprintf("k8s-app=%s", podName),
	}
	watchPodStatus, err := clientset.CoreV1().Pods(ns).Watch(opts)
	if err != nil {
		return err
	}
	for {
		resultChan := <-watchPodStatus.ResultChan()
		if resultChan.Type == watch.Added || resultChan.Type == watch.Modified {
			pod := resultChan.Object.(*corev1.Pod)
			if pod.Status.Phase != "Running" {
				count := 0
				ticker := time.NewTicker(15 * time.Second)
				done := make(chan bool, 1)
				defer ticker.Stop()
				for {
					select {
					case <-ticker.C:
						podStatus, err := clientset.CoreV1().Pods(ns).Watch(opts)
						if err != nil {
							return err
						}
						result := <-podStatus.ResultChan()
						p := result.Object.(*corev1.Pod)
						count++
						if count >= 20 {
							done <- true
							return errors.New(fmt.Sprintf("Pod: %s; failed to come up with reason: %s, err: %s", podName, p.Status.Conditions[0].Reason, p.Status.Conditions[0].Message))
						}
						if p.Status.Phase == "Running" {
							if len(p.Status.ContainerStatuses) == 0 {
								continue
							}
							i := 0
							for i < len(p.Spec.Containers) {
								if p.Status.ContainerStatuses[i].State.Running != nil {
									i++
								} else if p.Status.ContainerStatuses[i].State.Terminated != nil {
									return errors.New(fmt.Sprintf("Pod: %s; Container %s; failed to come up with reason: %s, err: %s", podName, p.Status.ContainerStatuses[i].Name, p.Status.ContainerStatuses[i].State.Terminated.Reason, p.Status.ContainerStatuses[i].State.Terminated.Message))
								} else if p.Status.ContainerStatuses[i].State.Waiting != nil {
									break
								}
							}
							if i == len(p.Spec.Containers) {
								done <- true
								return nil
							}
						} else {
							continue
						}
					case <-done:
						return nil
					}
				}
			} else {
				if len(pod.Status.ContainerStatuses) == 0 {
					continue
				}
				i := 0
				for i < len(pod.Spec.Containers) {
					if pod.Status.ContainerStatuses[i].State.Running != nil {
						i++
					} else if pod.Status.ContainerStatuses[i].State.Terminated != nil {
						return errors.New(fmt.Sprintf("Pod: %s; Container %s; failed to come up with reason: %s, err: %s", podName, pod.Status.ContainerStatuses[i].Name, pod.Status.ContainerStatuses[i].State.Terminated.Reason, pod.Status.ContainerStatuses[i].State.Terminated.Message))
					} else if pod.Status.ContainerStatuses[i].State.Waiting != nil {
						break
					}
				}
				if i == len(pod.Spec.Containers) {
					break
				}
			}
		}
	}
	return nil
}

//PodStatusCheck --
func (k8s K8s) PodStatusCheck(ns string, clientset *kubernetes.Clientset) error {

	podList, err := k8s.listPods(ns, clientset)
	if err != nil {
		return errors.Wrap(err, "failed to list the pods")
	}
	var wg sync.WaitGroup
	var statusError error
	for i := 0; i < len(podList); i++ {
		wg.Add(1)
		podLabels := podList[i].ObjectMeta.Labels
		go func(failed error) {
			err := k8s.verifyContainersAreRunning(ns, podLabels["k8s-app"], clientset, &wg)
			if err != nil {
				logger.ERROR(fmt.Sprintf("Pod failed to start: %v", err))
				statusError = fmt.Errorf("statefulset failed to deploy")
			}
		}(statusError)
	}
	wg.Wait()
	return statusError
}

//CreateMSPConfigMaps --
func (k8s K8s) CreateMSPConfigMaps(nsConfig networkspec.Config, clientset *kubernetes.Clientset) error {

	for i := 0; i < len(nsConfig.OrdererOrganizations); i++ {
		organization := nsConfig.OrdererOrganizations[i]
		err := k8s.createCertsConfigmap(organization.NumCA, "orderer", organization.Name, nsConfig, clientset)
		if err != nil {
			return err
		}
	}
	for i := 0; i < len(nsConfig.PeerOrganizations); i++ {
		organization := nsConfig.PeerOrganizations[i]
		err := k8s.createCertsConfigmap(organization.NumCA, "peer", organization.Name, nsConfig, clientset)
		if err != nil {
			return err
		}
	}
	return nil
}
