package k8s

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

func (k K8s) VerifyContainersAreRunning() error {

	logger.INFO("Verifying all the pods are running")
	var status string
	for i := 0; i < 10; i++ {
		if status == "No resources found." {
			return nil
		}
		k.Arguments = []string{"get", "pods", "--field-selector=status.phase!=Running"}
		output, err := client.ExecuteK8sCommand(k.Args(), false)
		if err != nil {
			logger.ERROR("Error occured while getting the number of containers in running state")
			return err
		}
		status = strings.TrimSpace(string(output))
		if status == "No resources found." {
			logger.INFO("All pods are up and running")
			return nil
		}
		logger.INFO("Waiting up to 10 minutes for pods to be up and running; minute = ", strconv.Itoa(i))
		time.Sleep(60 * time.Second)
	}
	return errors.New("Waiting time exceeded")
}

func (k K8s) checkHealth(componentName string, config networkspec.Config) error {

	logger.INFO("Checking health for ", componentName)
	var nodeIP string
	portNumber, err := k.GetK8sServicePort(componentName, config.K8s.ServiceType, true)
	if err != nil {
		logger.ERROR("Failed to get the port for ", componentName)
		return err
	}
	nodeIP, err = k.GetK8sExternalIP(config, componentName)
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
	} else {
		return fmt.Errorf("Health check failed for %s; Response status = %s", componentName, resp.StatusCode)
	}
	return nil
}

func (k K8s) CheckK8sComponentsHealth(config networkspec.Config) error {

	var err error
	time.Sleep(15 * time.Second)
	for i := 0; i < len(config.OrdererOrganizations); i++ {
		org := config.OrdererOrganizations[i]
		for j := 0; j < org.NumOrderers; j++ {
			ordererName := fmt.Sprintf("orderer%d-%s", j, org.Name)
			err = k.checkHealth(ordererName, config)
			if err != nil {
				return err
			}
		}
	}
	for i := 0; i < len(config.PeerOrganizations); i++ {
		org := config.PeerOrganizations[i]
		for j := 0; j < org.NumPeers; j++ {
			peerName := fmt.Sprintf("peer%d-%s", j, org.Name)
			err = k.checkHealth(peerName, config)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
