package client

import (
	"fmt"
	"net/http"
	"time"
	"strings"
	"os/exec"
	"io/ioutil"
	"log"

	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	// k8s "k8s.io/client-go/kubernetes"
)

//CheckComponentsHealth -- to check the health of a peer or an orderer
func CheckComponentsHealth(componentName, kubeconfigPath string, input networkspec.Config) error {

	var err error
	time.Sleep(15 * time.Second)
	if componentName != ""{
		err = checkHealth(componentName, kubeconfigPath, input)
		if err != nil{
			return err
		}
	} else {
		for i := 0; i < len(input.OrdererOrganizations); i++ {
			org := input.OrdererOrganizations[i]
			for j := 0; j < org.NumOrderers; j++ {
				ordererName := fmt.Sprintf("orderer%v-%v", j, org.Name)
				err = checkHealth(ordererName, kubeconfigPath, input)
				if err != nil{
					return err
				}
			}
		}

		for i := 0; i < len(input.PeerOrganizations); i++ {
			org := input.PeerOrganizations[i]
			for j := 0; j < org.NumPeers; j++ {
				peerName := fmt.Sprintf("peer%v-%v", j, org.Name)
				err = checkHealth(peerName, kubeconfigPath, input)
				if err != nil{
					return err
				}
			}
		}
	}

	return nil
}

func checkHealth(componentName, kubeconfigPath string, input networkspec.Config) error{

	fmt.Println("Checking health for", componentName)
	var NodeIP string
	portNumber, err := connectionprofile.GetK8sServicePort(kubeconfigPath, componentName, true)
	if err != nil {
		return fmt.Errorf("Failed to get the port for %v; err: %v", componentName, err)
	}
	if kubeconfigPath != ""{
		NodeIP, err = connectionprofile.GetK8sExternalIP(kubeconfigPath, input, componentName)
		if err != nil {
			return fmt.Errorf("Failed to get the IP address for %v; err: %v", componentName, err)
		}
	} else{
		stdoutStderr, err := exec.Command("curl", "api.ipify.org").CombinedOutput()
		if err != nil{
			return fmt.Errorf("Error occured while retrieving the local IP; err: %v", stdoutStderr)
		}
		IPArr := strings.Split(string(stdoutStderr), "\n")
		NodeIP = IPArr[len(IPArr)-1]
	}

	url := fmt.Sprintf("http://%v:%v/healthz", NodeIP, portNumber)
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("Error while hitting the endpoint, err: %v", err)
	}
	defer resp.Body.Close()
	var healthStatus string
	if resp.StatusCode == 200 || resp.StatusCode == 503 {
		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatal(err)
		}
		healthStatus = string(bodyBytes)
	} else{
		return fmt.Errorf("Response status: %s, response body: %s", resp.StatusCode, resp.Body)
	}
	fmt.Println("Status of", componentName, " health: ", healthStatus)
	return nil
}

//CheckContainersState -- Checks whether the pod is running or not
func CheckContainersState(kubeconfigPath string) error{

	fmt.Println("Checking the state of all the containers")
	var err error
	if kubeconfigPath != ""{
		err = checkK8sContainerState(kubeconfigPath)
		if err != nil{
			return err
		}
	}else {
		err = checkDockerContainerState()
		if err != nil{
			return err
		}
	}
	return nil
}

func checkK8sContainerState(kubeconfigPath string) error{

	var status string
	for i:=0; i<10; i++{
		if status == "No resources found."{
			return nil
		}
		stdoutStderr, err := exec.Command("kubectl", fmt.Sprintf("--kubeconfig=%v", kubeconfigPath), "get", "pods", "--field-selector=status.phase!=Running").CombinedOutput()
		if err != nil{
			return fmt.Errorf("Error occured while getting the number of containers in running state; err: %v", stdoutStderr)
		}
		status = strings.TrimSpace(string(stdoutStderr))
		if status=="No resources found."{
			fmt.Println("All pods are up and running")
			return nil
		}
		fmt.Println("Waiting up to 10 minutes for pods to be up and running; minute =", i)
		time.Sleep(60 * time.Second)
	}
	return fmt.Errorf("Waiting time exceeded")
}

func checkDockerContainerState() error{

	stdoutStderr, err := exec.Command("docker", "ps", "-a").CombinedOutput()
	if err != nil{
		return fmt.Errorf("Error occured while listing all the containers; err: %v", stdoutStderr)
	}
	numContainers := fmt.Sprintf("%v", len(strings.Split(string(stdoutStderr), "\n")))
	for i:=0; i<6; i++{
		stdoutStderr, err = exec.Command("docker", "ps", "-af", "status=running").CombinedOutput()
		if err != nil{
			return fmt.Errorf("Error occured while listing the running containers; err: %v", stdoutStderr)
		}
		runningContainers := fmt.Sprintf("%v", len(strings.Split(string(stdoutStderr), "\n")))
		if numContainers == runningContainers{
			fmt.Println("All the containers are up and running")
			return nil
		}
		stdoutStderr, err = exec.Command("docker", "ps", "-af", "status=exited").CombinedOutput()
		if err != nil{
			fmt.Println("Error occured while listing the exited containers \n", string(stdoutStderr))
		}
		exitedContainers := len(strings.Split(strings.TrimSpace(string(stdoutStderr)), "\n"))
		if exitedContainers > 1{
			return fmt.Errorf("Containers exited")
		}
		time.Sleep(10 * time.Second)
	}
	return fmt.Errorf("Waiting time to bring up containers exceeded 1 minute")
}