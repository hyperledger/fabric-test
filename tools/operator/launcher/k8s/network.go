package k8s

import (
	"fmt"

	"github.com/pkg/errors"

	corev1 "k8s.io/api/core/v1"
	apiResource "k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/hyperledger/fabric-test/tools/operator/fabricconfig"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

//K8s -
type K8s struct {
	KubeConfigPath string
	Action         string
	Arguments      []string
	Config         networkspec.Config
	Launch         []LaunchConfig
}

//LaunchConfig --
type LaunchConfig struct {
	Name       string
	Type       string
	Containers []corev1.Container `json:"containers,omitempty"`
	Volumes    []corev1.Volume    `json:"volumes,omitempty"`
	Ports      []int32            `json:"ports,omitempty"`
}

func (k8s K8s) launchObject(nsConfig networkspec.Config) ([]LaunchConfig, error) {

	var launchConfig []LaunchConfig
	coreConfig, err := fabricconfig.CoreConfig(nsConfig)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read core config")
	}
	ordererConfig, err := fabricconfig.OrdererConfig(nsConfig)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read orderer config")
	}

	caImage := nl.DockerImage("ca", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Ca)
	peerImage := nl.DockerImage("peer", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Peer)
	ordererImage := nl.DockerImage("orderer", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Orderer)

	var peerPort int32 = 31000
	var peerMetricsPort int32 = 32000
	var caPort int32 = 30500
	var privileged bool = true
	for i := 0; i < len(nsConfig.PeerOrganizations); i++ {
		org := nsConfig.PeerOrganizations[i]
		for j := 0; j < org.NumPeers; j++ {
			err := fabricconfig.GenerateCorePeerConfig(fmt.Sprintf("peer%d-%s", j, org.Name), org.Name, org.MSPID, nsConfig.ArtifactsLocation, peerPort, peerMetricsPort, coreConfig)
			if err != nil {
				return nil, errors.Wrap(err, "failed to generate core configuration file")
			}
			containers := make([]corev1.Container, 0)
			container := corev1.Container{
				Name:            "dind",
				Image:           "docker:dind",
				Args:            []string{"dockerd", "-H tcp://0.0.0.0:2375", "-H unix://var/run/docker.sock"},
				SecurityContext: &corev1.SecurityContext{Privileged: &privileged},
				Resources:       k8s.resources(nsConfig.K8s.Resources.Dind),
			}
			containers = append(containers, container)
			container = corev1.Container{
				Name:      "peer",
				Command:   []string{"peer"},
				Args:      []string{"node", "start"},
				Resources: k8s.resources(nsConfig.K8s.Resources.Peers),
				Image:     peerImage,
				Env: []corev1.EnvVar{
					{Name: "FABRIC_LOGGING_SPEC", Value: nsConfig.PeerFabricLoggingSpec},
				},
				VolumeMounts: k8s.volumeMountLists("peer", nsConfig.K8s.DataPersistence, nsConfig.EnableNodeOUs),
			}
			containers = append(containers, container)
			l := LaunchConfig{
				Name:       fmt.Sprintf("peer%d-%s", j, org.Name),
				Type:       "peer",
				Containers: containers,
				Volumes:    k8s.volumesList("peer", org.Name, fmt.Sprintf("peer%d-%s", j, org.Name), nsConfig.K8s.DataPersistence, nsConfig.EnableNodeOUs),
				Ports:      []int32{peerPort, peerMetricsPort},
			}
			launchConfig = append(launchConfig, l)
			if nsConfig.DBType == "couchdb" {
				c := LaunchConfig{
					Name: fmt.Sprintf("couchdb-peer%d-%s", j, org.Name),
					Type: "couchdb",
				}
				container = corev1.Container{
					Name:      "couchdb",
					Resources: k8s.resources(nsConfig.K8s.Resources.Couchdb),
					Image:     "couchdb:2.3",
				}
				if nsConfig.K8s.DataPersistence == "true" || nsConfig.K8s.DataPersistence == "local" {
					volumeMount := corev1.VolumeMount{MountPath: "/opt/couchdb/data", Name: "couchdb-data-storage"}
					container.VolumeMounts = append(container.VolumeMounts, volumeMount)
					volume := corev1.Volume{
						Name: "couchdb-data-storage",
						VolumeSource: corev1.VolumeSource{
							PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
								ClaimName: fmt.Sprintf("couchdb-peer%d-%s-data", j, org.Name),
							},
						},
					}
					c.Volumes = []corev1.Volume{volume}
				}
				c.Containers = []corev1.Container{container}
				launchConfig = append(launchConfig, c)
			}
			peerPort++
			peerMetricsPort++
		}
		for m := 0; m < org.NumCA; m++ {
			l := k8s.caLaunchConfig(m, org.Name, caImage)
			l.Ports = []int32{caPort}
			launchConfig = append(launchConfig, l)
			caPort++
		}
	}

	var ordererPort int32 = 30000
	var ordererMetricsPort int32 = 32500
	for i := 0; i < len(nsConfig.OrdererOrganizations); i++ {
		org := nsConfig.OrdererOrganizations[i]
		for j := 0; j < org.NumOrderers; j++ {
			err := fabricconfig.GenerateOrdererConfig(fmt.Sprintf("orderer%d-%s", j, org.Name), org.Name, org.MSPID, nsConfig.ArtifactsLocation, ordererPort, ordererMetricsPort, ordererConfig)
			if err != nil {
				return nil, errors.Wrap(err, "failed to generate orderer configuration file")
			}
			containers := make([]corev1.Container, 0)
			container := corev1.Container{
				Name:      "orderer",
				Command:   []string{"orderer"},
				Resources: k8s.resources(nsConfig.K8s.Resources.Orderers),
				Image:     ordererImage,
				Env: []corev1.EnvVar{
					{Name: "FABRIC_LOGGING_SPEC", Value: nsConfig.OrdererFabricLoggingSpec},
				},
				VolumeMounts: k8s.volumeMountLists("orderer", nsConfig.K8s.DataPersistence, nsConfig.EnableNodeOUs),
			}
			containers = append(containers, container)
			l := LaunchConfig{
				Name:       fmt.Sprintf("orderer%d-%s", j, org.Name),
				Type:       "orderer",
				Containers: containers,
				Volumes:    k8s.volumesList("orderer", org.Name, fmt.Sprintf("orderer%d-%s", j, org.Name), nsConfig.K8s.DataPersistence, nsConfig.EnableNodeOUs),
				Ports:      []int32{ordererPort, ordererMetricsPort},
			}
			launchConfig = append(launchConfig, l)
			ordererPort++
			ordererMetricsPort++
		}
		for m := 0; m < org.NumCA; m++ {
			l := k8s.caLaunchConfig(m, org.Name, caImage)
			l.Ports = []int32{caPort}
			launchConfig = append(launchConfig, l)
			caPort++
		}
	}
	return launchConfig, nil
}

func (k8s K8s) resources(resource networkspec.Resource) corev1.ResourceRequirements {
	return corev1.ResourceRequirements{
		Limits: corev1.ResourceList{
			"cpu":    apiResource.MustParse(resource.Limits.CPU),
			"memory": apiResource.MustParse(resource.Limits.Memory),
		},
		Requests: corev1.ResourceList{
			"cpu":    apiResource.MustParse(resource.Requests.CPU),
			"memory": apiResource.MustParse(resource.Requests.Memory),
		},
	}
}

func (k8s K8s) caLaunchConfig(id int, orgName, caImage string) LaunchConfig {

	container := corev1.Container{
		Args:    []string{"start", "-b", "admin:adminpw", "-d"},
		Command: []string{"fabric-ca-server"},
		Env: []corev1.EnvVar{
			{Name: "FABRIC_CA_HOME", Value: "/etc/hyperledger/fabric-ca-server"},
			{Name: "FABRIC_CA_SERVER_CA_KEYFILE", Value: "/etc/hyperledger/fabric/artifacts/ca-priv_sk"},
			{Name: "FABRIC_CA_SERVER_CA_CERTFILE", Value: fmt.Sprintf("/etc/hyperledger/fabric/artifacts/ca.%s-cert.pem", orgName)},
			{Name: "FABRIC_CA_SERVER_TLS_ENABLED", Value: "true"},
			{Name: "FABRIC_CA_SERVER_TLS_KEYFILE", Value: "/etc/hyperledger/fabric/artifacts/tlsca-priv_sk"},
			{Name: "FABRIC_CA_SERVER_TLS_CERTFILE", Value: fmt.Sprintf("/etc/hyperledger/fabric/artifacts/tlsca.%s-cert.pem", orgName)},
			{Name: "FABRIC_CA_SERVER_CA_NAME", Value: fmt.Sprintf("ca%d-%s", id, orgName)},
		},
		Image: caImage,
		Name:  "ca",
		VolumeMounts: []corev1.VolumeMount{{
			MountPath: "/etc/hyperledger/fabric/artifacts/",
			Name:      "cacerts"},
		},
	}
	volume := corev1.Volume{
		Name: "cacerts",
		VolumeSource: corev1.VolumeSource{
			ConfigMap: &corev1.ConfigMapVolumeSource{
				LocalObjectReference: corev1.LocalObjectReference{
					Name: fmt.Sprintf("%s-ca", orgName),
				},
			},
		},
	}
	launchConfig := LaunchConfig{
		Containers: []corev1.Container{container},
		Name:       fmt.Sprintf("ca%d-%s", id, orgName),
		Type:       "ca",
		Volumes:    []corev1.Volume{volume},
	}
	return launchConfig
}

func (k8s K8s) volumeMountLists(componentType, dataPersistence string, enableNodeOUs bool) []corev1.VolumeMount {

	volumeMounts := []corev1.VolumeMount{
		{MountPath: "/etc/hyperledger/fabric/artifacts/msp/admincerts/", Name: "admincerts"},
		{MountPath: "/etc/hyperledger/fabric/artifacts/msp/cacerts/", Name: "cacerts"},
		{MountPath: "/etc/hyperledger/fabric/artifacts/msp/signcerts/", Name: "signcerts"},
		{MountPath: "/etc/hyperledger/fabric/artifacts/msp/keystore/", Name: "keystore"},
		{MountPath: "/etc/hyperledger/fabric/artifacts/msp/tlscacerts/", Name: "tlscacerts"},
		{MountPath: "/etc/hyperledger/fabric/artifacts/tls/", Name: "tls"},
		{MountPath: "/etc/hyperledger/fabric/", Name: fmt.Sprintf("%s-config", componentType)},
	}
	if enableNodeOUs {
		volumeMount := corev1.VolumeMount{MountPath: "/etc/hyperledger/fabric/artifacts/msp/", Name: "config"}
		volumeMounts = append(volumeMounts, volumeMount)
	}
	if dataPersistence == "true" || dataPersistence == "local" {
		volumeMount := corev1.VolumeMount{MountPath: "/shared/data/", Name: "data-storage"}
		volumeMounts = append(volumeMounts, volumeMount)
	}
	if componentType == "orderer" {
		volumeMount := corev1.VolumeMount{MountPath: "/etc/hyperledger/fabric/genesisblock", Name: "genesisblock"}
		volumeMounts = append(volumeMounts, volumeMount)
	}
	return volumeMounts
}

func (k8s K8s) volumesList(componentType, orgName, name, dataPersistence string, enableNodeOUs bool) []corev1.Volume {

	volumes := []corev1.Volume{
		{
			Name: "admincerts",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-admincerts", orgName),
					},
				},
			},
		},
		{
			Name: "cacerts",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-msp", name)},
					Items: []corev1.KeyToPath{
						{
							Key:  "cacerts",
							Path: fmt.Sprintf("ca.%s-cert.pem", orgName),
						},
					},
				},
			},
		},
		{
			Name: "signcerts",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-msp", name),
					},
					Items: []corev1.KeyToPath{
						{
							Key:  "signcerts",
							Path: fmt.Sprintf("%s.%s-cert.pem", name, orgName),
						},
					},
				},
			},
		},
		{
			Name: "keystore",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-msp", name),
					},
					Items: []corev1.KeyToPath{
						{
							Key:  "keystore",
							Path: "priv_sk",
						},
					},
				},
			},
		},
		{
			Name: "tlscacerts",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-msp", name),
					},
					Items: []corev1.KeyToPath{
						{
							Key:  "tlscacerts",
							Path: fmt.Sprintf("tlsca.%s-cert.pem", orgName),
						},
					},
				},
			},
		},
		{
			Name: "tls",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-tls", name),
					},
				},
			},
		},
		{
			Name: fmt.Sprintf("%s-config", componentType),
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-config", name),
					},
				},
			},
		},
	}
	if enableNodeOUs {
		volume := corev1.Volume{
			Name: "config",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: fmt.Sprintf("%s-msp", name),
					},
					Items: []corev1.KeyToPath{
						{
							Key:  "config",
							Path: "config.yaml",
						},
					},
				},
			},
		}
		volumes = append(volumes, volume)
	}
	if dataPersistence == "true" || dataPersistence == "local" {
		volume := corev1.Volume{
			Name: "data-storage",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: fmt.Sprintf("%s-data", name),
				},
			},
		}
		volumes = append(volumes, volume)
	}
	if componentType == "orderer" {
		volume := corev1.Volume{
			Name: "genesisblock",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: "genesisblock",
				},
			},
		}
		volumes = append(volumes, volume)
	}
	return volumes
}

//GenerateConfigurationFiles - to generate all the configuration files
func (k8s K8s) GenerateConfigurationFiles(upgrade bool) error {

	network := nl.Network{TemplatesDir: paths.TemplateFilePath("k8s")}
	err := network.GenerateConfigurationFiles(upgrade)
	if err != nil {
		return err
	}
	return nil
}

func (k8s K8s) launchNetwork(config networkspec.Config, clientset *kubernetes.Clientset) error {

	launchConfig, err := k8s.launchObject(config)
	if err != nil {
		logger.ERROR("Failed to launch the fabric k8s components")
		return err
	}
	for i := 0; i < len(launchConfig); i++ {
		err = k8s.CreateStatefulset(launchConfig[i], config, clientset)
		if err != nil {
			logger.ERROR("Failed to launch the fabric k8s network")
			return err
		}
	}
	return nil
}

func (k8s K8s) buildClientset(kubeconfig *string) (*kubernetes.Clientset, error) {

	config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
	if err != nil {
		logger.ERROR("Failed to create config for kubernetes")
		return &kubernetes.Clientset{}, err
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		logger.ERROR("Failed to create clientset for kubernetes")
		return &kubernetes.Clientset{}, err
	}
	return clientset, nil
}

//Network --
func (k8s K8s) Network(action string) error {

	var err error
	var network nl.Network
	var kubeconfig *string
	kubeconfig = &k8s.KubeConfigPath

	switch action {
	case "up":
		err = k8s.GenerateConfigurationFiles(false)
		if err != nil {
			logger.ERROR("Failed to generate k8s configuration files")
			return err
		}
		err = network.GenerateNetworkArtifacts(k8s.Config)
		if err != nil {
			logger.ERROR("Failed to generate network artifacts for kubernetes")
			return err
		}
		clientset, err := k8s.buildClientset(kubeconfig)
		if err != nil {
			logger.ERROR("Failed to generate clientset for kubernetes")
			return err
		}
		err = k8s.CreateNameSpace(k8s.Config.K8s.Namespace, clientset)
		if err != nil {
			logger.ERROR("Failed to create namespace")
			return err
		}
		err = k8s.CreateSecret("genesisblock", k8s.Config, clientset)
		if err != nil {
			logger.ERROR("Failed to create secret for genesis block")
			return err
		}
		err = k8s.CreateMSPConfigMaps(k8s.Config, clientset)
		if err != nil {
			logger.ERROR("Failed to create configmaps")
			return err
		}
		err = k8s.launchNetwork(k8s.Config, clientset)
		if err != nil {
			logger.ERROR("Failed to launch k8s fabric network")
			return err
		}
		err = k8s.PodStatusCheck(k8s.Config.K8s.Namespace, clientset)
		if err != nil {
			logger.ERROR("Failed to verify fabric K8s pods state")
			return err
		}
		err = k8s.CheckComponentsHealth(k8s.Config, clientset)
		if err != nil {
			logger.ERROR("Failed to check fabric K8s pods health")
			return err
		}
		err = k8s.GenerateConnectionProfiles(k8s.Config, clientset)
		if err != nil {
			logger.ERROR("Failed to generate connection profile")
			return err
		}
	case "down":
		clientset, err := k8s.buildClientset(kubeconfig)
		if err != nil {
			logger.ERROR("Failed to generate clientset for kubernetes")
			return err
		}
		err = k8s.DeleteNameSpace(k8s.Config.K8s.Namespace, clientset)
		if err != nil {
			logger.ERROR("Failed to down K8s fabric network")
			return err
		}
		err = network.NetworkCleanUp(k8s.Config)
		if err != nil {
			return err
		}
	case "health":
		clientset, err := k8s.buildClientset(kubeconfig)
		if err != nil {
			logger.ERROR("Failed to generate clientset for kubernetes")
			return err
		}
		err = k8s.CheckComponentsHealth(k8s.Config, clientset)
		if err != nil {
			return err
		}
	default:
		return errors.Errorf("Incorrect action %s Use up or down for action", action)
	}
	return nil
}
