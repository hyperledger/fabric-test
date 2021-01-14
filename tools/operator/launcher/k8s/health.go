package k8s

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"k8s.io/client-go/kubernetes"
)

func (k8s K8s) checkHealth(componentName string, config networkspec.Config, clientset *kubernetes.Clientset) error {
	logger.INFO("Checking health for ", componentName)
	portNumber, err := k8s.ServicePort(componentName, config.K8s.ServiceType, k8s.Config.K8s.Namespace, true, clientset)
	if err != nil {
		return fmt.Errorf("Failed to get the port for %v", componentName)
	}
	nodeIP, err := k8s.ExternalIP(config, componentName, clientset)
	if err != nil {
		return fmt.Errorf("Failed to get the IP address for %v", componentName)
	}

	url := fmt.Sprintf("http://%s:%s/healthz", nodeIP, portNumber)
	for i := 0; i < 6; i++ {
		logger.INFO("Querying /healthz URL: " + url)
		resp, err := http.Get(url)
		if err != nil {
			return fmt.Errorf("Error while hitting the endpoint")
		}
		bytes, err := ioutil.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if err != nil {
			return err
		}
		if resp.StatusCode == http.StatusOK {
			logger.INFO("Health check passed for ", componentName)
			return nil
		}
		logger.INFO("Response status: ", strconv.Itoa(resp.StatusCode))
		logger.INFO("Response body: ", string(bytes))
		logger.INFO("Healthcheck failed, attempting again in 10 seconds")
		time.Sleep(time.Second * 5)
	}
	return fmt.Errorf("Health check failed for %s", componentName)
}

//CheckComponentsHealth --
func (k8s K8s) CheckComponentsHealth(config networkspec.Config, clientset *kubernetes.Clientset) error {
	for i := 0; i < len(config.OrdererOrganizations); i++ {
		org := config.OrdererOrganizations[i]
		for j := 0; j < org.NumOrderers; j++ {
			ordererName := fmt.Sprintf("orderer%d-%s", j, org.Name)
			err := k8s.checkHealth(ordererName, config, clientset)
			if err != nil {
				return err
			}
		}
	}
	for i := 0; i < len(config.PeerOrganizations); i++ {
		org := config.PeerOrganizations[i]
		for j := 0; j < org.NumPeers; j++ {
			peerName := fmt.Sprintf("peer%d-%s", j, org.Name)
			err := k8s.checkHealth(peerName, config, clientset)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
