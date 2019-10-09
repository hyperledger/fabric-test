package k8s

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

func (k K8s) VerifyContainersAreRunning() error {

	logger.INFO("Check status of all the pod to verify they are running")
	var status string
	count := 0
	timeout := 15
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	return func() error {
		for {
			select {
			case <-ticker.C:
				if status == "No resources found." {
					return nil
				}
				k.Arguments = []string{"get", "pods", "--template", `{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}`, "--field-selector=status.phase!=Running"}
				output, err := networkclient.ExecuteK8sCommand(k.Args(), false)
				if err != nil {
					logger.ERROR("Error occured while getting the number of containers not in running state")
					return err
				}
				status = strings.TrimSpace(output)
				if status == "" {
					logger.INFO("All pods are up and running")
					return nil
				}
				count++
				logger.INFO("Waiting up to ",strconv.Itoa(timeout)," minutes for pods to be up and running; minute =", strconv.Itoa(count))
				if count >= timeout {
					containers := strings.Split(output, "\n")
					err = k.getReasonsPodsNotRunning(containers)
					logger.ERROR("Waiting time exceeded")
					return err
				}
			}
		}
	}()
}

func (k K8s) getReasonsPodsNotRunning(containers []string) error {

	var reasonsPodsNotRunning []string
	for i := 0; i < len(containers); i++ {
		k.Arguments = []string{"describe", "pod", containers[i]}
		output, err := networkclient.ExecuteK8sCommand(k.Args(), false)
		if err != nil {
			reasonsPodsNotRunning = append(reasonsPodsNotRunning, fmt.Sprintf("%s: Failed to get the reason for the failure; err: %s", containers[i], err))
		}
		if output != ""{
			eventsArr := strings.Split(output, "Events:")
			reasonsPodsNotRunning = append(reasonsPodsNotRunning, fmt.Sprintf("%s:%s", containers[i], eventsArr[len(eventsArr) - 1]))
		}
	}
	return errors.New(strings.Join(reasonsPodsNotRunning, "\n\n"))
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
	}
	return fmt.Errorf("Health check failed for %s; Response status = %d", componentName, resp.StatusCode)
}

func (k K8s) CheckK8sComponentsHealth(config networkspec.Config) error {

	var err error
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
