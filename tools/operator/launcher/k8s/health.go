package k8s

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"

	"k8s.io/client-go/kubernetes"
)

func (k8s K8s) checkHealth(componentName string, config networkspec.Config, clientset *kubernetes.Clientset) error {

	logger.INFO("Checking health for ", componentName)
	var nodeIP string
	portNumber, err := k8s.ServicePort(componentName, config.K8s.ServiceType, k8s.Config.K8s.Namespace, true, clientset)
	if err != nil {
		logger.ERROR("Failed to get the port for ", componentName)
		return err
	}
	nodeIP, err = k8s.ExternalIP(config, componentName, clientset)
	if err != nil {
		logger.ERROR("Failed to get the IP address for ", componentName)
		return err
	}

	url := fmt.Sprintf("http://%s:%s/healthz", nodeIP, portNumber)
	resp, err := http.Get(url)
	if err != nil {
		logger.ERROR("Error while hitting the endpoint")
		return err
	}
	defer resp.Body.Close()
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	healthStatus := string(bodyBytes)
	logger.INFO("Response status: ", strconv.Itoa(resp.StatusCode))
	logger.INFO("Response body: ", healthStatus)
	if resp.StatusCode == http.StatusOK {
		logger.INFO("Health check passed for ", componentName)
		return nil
	}
	return fmt.Errorf("Health check failed for %s; Response status = %d", componentName, resp.StatusCode)
}

//CheckComponentsHealth --
func (k8s K8s) CheckComponentsHealth(config networkspec.Config, clientset *kubernetes.Clientset) error {

	var err error
	for i := 0; i < len(config.OrdererOrganizations); i++ {
		org := config.OrdererOrganizations[i]
		for j := 0; j < org.NumOrderers; j++ {
			ordererName := fmt.Sprintf("orderer%d-%s", j, org.Name)
			err = k8s.checkHealth(ordererName, config, clientset)
			if err != nil {
				return err
			}
		}
	}
	for i := 0; i < len(config.PeerOrganizations); i++ {
		org := config.PeerOrganizations[i]
		for j := 0; j < org.NumPeers; j++ {
			peerName := fmt.Sprintf("peer%d-%s", j, org.Name)
			err = k8s.checkHealth(peerName, config, clientset)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
