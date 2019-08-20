package health

import (
    "errors"
    "fmt"
    "io/ioutil"
    "net/http"
    "strings"
    "time"
	"strconv"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
    "github.com/hyperledger/fabric-test/tools/operator/client"
    "github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
    "github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
    "github.com/hyperledger/fabric-test/tools/operator/networkspec"
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

	logger.INFO("Checking health for ", componentName)
	var nodeIP string
	portNumber, err := connectionprofile.ServicePort(kubeconfigPath, componentName, input.K8s.ServiceType, true)
	if err != nil {
		logger.ERROR("Failed to get the port for ", componentName)
		return err
	}
	if kubeconfigPath != "" {
		nodeIP, err = connectionprofile.ExternalIP(kubeconfigPath, input, componentName)
		if err != nil {
			logger.ERROR("Failed to get the IP address for ", componentName)
			return err
		}
	} else {
		nodeIP, err = getIPAddress()
		if err != nil {
			return err
		}
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

//VerifyContainersAreRunning -- Checks whether the pod is running or not
func VerifyContainersAreRunning(kubeconfigPath string) error {

    logger.INFO("Checking the state of all the containers")
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
        input := []string{"get", "pods", "--field-selector=status.phase!=Running"}
        k8s := nl.K8s{Action:"", Input: input}
        output, err := client.ExecuteK8sCommand(k8s.Args(kubeconfigPath), false)
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

func checkDockerContainerState() error {

	args := []string{"ps", "-a"}
	output, err := client.ExecuteCommand("docker", args, false)
	if err != nil {
		logger.ERROR("Error occured while listing all the containers")
		return err
	}
	numContainers := len(strings.Split(string(output), "\n"))
	for i := 0; i < 6; i++ {
		args = []string{"ps", "-af", "status=running"}
		output, err = client.ExecuteCommand("docker", args, false)
		if err != nil {
			logger.ERROR("Error occured while listing the running containers")
			return err
		}
		runningContainers := len(strings.Split(string(output), "\n"))
		if numContainers == runningContainers {
			logger.INFO("All the containers are up and running")
			return nil
		}
		args = []string{"ps", "-af", "status=exited", "-af", "status=created", "--format", "{{.Names}}"}
		output, err = client.ExecuteCommand("docker", args, false)
		if err != nil {
			logger.ERROR("Error occured while listing the exited containers")
			return err
		}
		exitedContainers := strings.Split(strings.TrimSpace(string(output)), "\n")
		if len(exitedContainers) > 1 {
			logger.ERROR("Exited Containers", strings.Join(exitedContainers, ","))
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
