package k8s

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/fabricconfig"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

func (k8s K8s) extendLaunchObject(nsConfig networkspec.Config) ([]LaunchConfig, error) {

	var launchConfig []LaunchConfig
	coreConfig, err := fabricconfig.CoreConfig(nsConfig)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read core config")
	}

	peerImage := nl.DockerImage("peer", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Peer)

	var peerPort int32 = 31000
	var peerMetricsPort int32 = 32000
	for _, peerOrg := range nsConfig.PeerOrganizations {
		peerPort = peerPort + int32(peerOrg.NumPeers)
		peerMetricsPort = peerMetricsPort + int32(peerOrg.NumPeers)
	}
	for _, peerOrg := range nsConfig.PeerOrganizations {
		var privileged bool = true
		for _, org := range nsConfig.AddPeersToOrganization {
			peerIndex := peerOrg.NumPeers
			totalPeers := peerOrg.NumPeers + org.NumPeers
			for j := peerIndex; j < totalPeers; j++ {
				err := fabricconfig.GenerateCorePeerConfig(fmt.Sprintf("peer%d-%s", j, org.Name), org.Name, org.MSPID, nsConfig.ArtifactsLocation, peerPort, peerMetricsPort, coreConfig)
				if err != nil {
					return nil, errors.Wrap(err, "failed to generate core configuration file")
				}
				containers := make([]corev1.Container, 0)
				container := corev1.Container{
					Name:            "dind",
					Image:           "docker:dind",
					ImagePullPolicy: corev1.PullPolicy("Always"),
					Args:            []string{"dockerd", "-H tcp://0.0.0.0:2375", "-H unix://var/run/docker.sock"},
					SecurityContext: &corev1.SecurityContext{Privileged: &privileged},
					Resources:       k8s.resources(nsConfig.K8s.Resources.Dind),
				}
				containers = append(containers, container)
				container = corev1.Container{
					Name:            "peer",
					Command:         []string{"peer"},
					Args:            []string{"node", "start"},
					Resources:       k8s.resources(nsConfig.K8s.Resources.Peers),
					Image:           peerImage,
					ImagePullPolicy: corev1.PullPolicy("Always"),
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
						Name:            "couchdb",
						Resources:       k8s.resources(nsConfig.K8s.Resources.Couchdb),
						Image:           "couchdb:3.1",
						ImagePullPolicy: corev1.PullPolicy("Always"),
						Env: []corev1.EnvVar{
							{
								Name:  "COUCHDB_USER",
								Value: "admin",
							},
							{
								Name:  "COUCHDB_PASSWORD",
								Value: "adminpw",
							},
						},
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
		}
	}
	return launchConfig, nil
}

func (k8s K8s) extendLaunchNetwork(config networkspec.Config, clientset *kubernetes.Clientset) error {

	launchConfig, err := k8s.extendLaunchObject(config)
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
