package health

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
	// k8s "k8s.io/client-go/kubernetes"
)

//CheckComponentsHealth -- to check the health of a peer or an orderer
func CheckComponentsHealth(componentName, kubeconfigPath string, input networkspec.Config) error {

	var err error
	time.Sleep(15 * time.Second)
	if componentName != "" {
		err = checkHealth(componentName, kubeconfigPath, input)
		if err != nil {
			return err
		}
	} else {
		for i := 0; i < len(input.OrdererOrganizations); i++ {
			org := input.OrdererOrganizations[i]
			for j := 0; j < org.NumOrderers; j++ {
				ordererName := fmt.Sprintf("orderer%d-%s", j, org.Name)
				err = checkHealth(ordererName, kubeconfigPath, input)
				if err != nil {
					return err
				}
			}
		}

		for i := 0; i < len(input.PeerOrganizations); i++ {
			org := input.PeerOrganizations[i]
			for j := 0; j < org.NumPeers; j++ {
				peerName := fmt.Sprintf("peer%d-%s", j, org.Name)
				err = checkHealth(peerName, kubeconfigPath, input)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func checkHealth(componentName, kubeconfigPath string, input networkspec.Config) error {

	utils.PrintLogs(fmt.Sprintf("Checking health for %s", componentName))
	var NodeIP string
	portNumber, err := connectionprofile.ServicePort(kubeconfigPath, componentName, input.K8s.ServiceType, true)
	if err != nil {
		utils.PrintLogs(fmt.Sprintf("Failed to get the port for %s", componentName))
		return err
	}
	if kubeconfigPath != "" {
		NodeIP, err = connectionprofile.ExternalIP(kubeconfigPath, input, componentName)
		if err != nil {
			utils.PrintLogs(fmt.Sprintf("Failed to get the IP address for %s", componentName))
			return err
		}
	} else {
		NodeIP, err = getIPAddress()
		if err != nil {
			return err
		}
	}

	url := fmt.Sprintf("http://%s:%s/healthz", NodeIP, portNumber)
	resp, err := http.Get(url)
	if err != nil {
		utils.PrintLogs(fmt.Sprintf("Error while hitting the endpoint; err: %s", err))
		return err
	}
	defer resp.Body.Close()
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	healthStatus := string(bodyBytes)
	utils.PrintLogs("Response status: %s, response body: %s", resp.StatusCode, healthStatus)
	if resp.StatusCode == http.StatusOK {
		utils.PrintLogs("Health check passed")
		return nil
	} else {
		return fmt.Errorf("Health check failed; Respose status = %s", resp.StatusCode)
	}
	return nil
}

//CheckContainersState -- Checks whether the pod is running or not
func VerifyContainersAreRunning(kubeconfigPath string) error {

	utils.PrintLogs("Checking the state of all the containers")
	var err error
	if kubeconfigPath != "" {
		err = checkK8sContainerState(kubeconfigPath)
		if err != nil {
			return err
		}
	} else {
		err = checkDockerContainerState()
		if err != nil {
			return err
		}
	}
	return nil
}

func checkK8sContainerState(kubeconfigPath string) error {

	var status string
	for i := 0; i < 10; i++ {
		if status == "No resources found." {
			return nil
		}
		stdoutStderr, err := exec.Command("kubectl", fmt.Sprintf("--kubeconfig=%s", kubeconfigPath), "get", "pods", "--field-selector=status.phase!=Running").CombinedOutput()
		if err != nil {
			utils.PrintLogs("Error occured while getting the number of containers in running state")
			return err
		}
		status = strings.TrimSpace(string(stdoutStderr))
		if status == "No resources found." {
			utils.PrintLogs("All pods are up and running")
			return nil
		}
		utils.PrintLogs(fmt.Sprintf("Waiting up to 10 minutes for pods to be up and running; minute = %d", i))
		time.Sleep(60 * time.Second)
	}
	return errors.New("Waiting time exceeded")
}

func checkDockerContainerState() error {

	args := []string{"ps", "-a"}
	output, err := client.ExecuteCommand("docker", args, false)
	if err != nil {
		utils.PrintLogs("Error occured while listing all the containers")
		return err
	}
	numContainers := len(strings.Split(string(stdoutStderr), "\n"))
	for i := 0; i < 6; i++ {
		args = []string{"ps", "-af", "status=running"}
		output, err = client.ExecuteCommand("docker", args, false)
		if err != nil {
			utils.PrintLogs("Error occured while listing the running containers")
			return err
		}
		runningContainers := len(strings.Split(string(stdoutStderr), "\n"))
		if numContainers == runningContainers {
			utils.PrintLogs("All the containers are up and running")
			return nil
		}
		args = []string{"ps", "-af", "status=exited"}
		output, err = client.ExecuteCommand("docker", args, false)
		if err != nil {
			utils.PrintLogs("Error occured while listing the exited containers")
			return err
		}
		exitedContainers := len(strings.Split(strings.TrimSpace(string(output)), "\n"))
		if exitedContainers > 1 {
			return errors.New("Containers exited")
		}
		time.Sleep(10 * time.Second)
	}
	return errors.New("Waiting time to bring up containers exceeded 1 minute")
}

func getIPAddress() (string, error) {

	var IP string
	var err error
	resp, err := http.Get("http://api.ipify.org")
	if err != nil {
		return IP, err
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return IP, err
	}
	IP = string(bodyBytes)
	return IP, err
}
