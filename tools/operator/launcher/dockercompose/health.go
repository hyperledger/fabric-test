package dockercompose

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

func (d DockerCompose) VerifyContainersAreRunning() error {

	Logger.Info("Check status of all the containers to verify they are running")
	count := 0
	args := []string{"ps", "-a"}
	output, err := networkclient.ExecuteCommand("docker", args, false)
	if err != nil {
		Logger.Error("Error occured while listing all the containers")
		return err
	}
	numContainers := len(strings.Split(string(output), "\n"))
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	return func() error {
		for {
			select {
			case <-ticker.C:
				args = []string{"ps", "-af", "status=running"}
				output, err = networkclient.ExecuteCommand("docker", args, false)
				if err != nil {
					Logger.Error("Error occurred while listing the running containers")
					return err
				}
				runningContainers := len(strings.Split(string(output), "\n"))
				if numContainers == runningContainers {
					Logger.Info("All the containers are up and running")
					return nil
				}
				args = []string{"ps", "-af", "status=exited", "-af", "status=created", "--format", "{{.Names}}"}
				output, err = networkclient.ExecuteCommand("docker", args, false)
				if err != nil {
					Logger.Error("Error occured while listing the exited containers")
					return err
				}
				exitedContainers := strings.Split(strings.TrimSpace(string(output)), "\n")
				if len(exitedContainers) > 0 {
					Logger.Error("Exited Containers: ", strings.Join(exitedContainers, ","))
					return errors.New("Containers exited")
				}
				count++
				if count >= 4 {
					return errors.New("Waiting time to bring up containers exceeded 1 minute")
				}
			}
		}
	}()
}

func (d DockerCompose) checkHealth(componentName string, config networkspec.Config) error {

	Logger.Info("Checking health for ", componentName)
	var nodeIP string
	portNumber, err := d.GetDockerServicePort(componentName, true)
	if err != nil {
		Logger.Error("Failed to get the port for ", componentName)
		return err
	}
	nodeIP = d.GetDockerExternalIP()
	url := fmt.Sprintf("http://%s:%s/healthz", nodeIP, portNumber)
	resp, err := http.Get(url)
	if err != nil {
		Logger.Error("Error while hitting the endpoint")
		return err
	}
	defer resp.Body.Close()
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	healthStatus := string(bodyBytes)
	Logger.Info("Response status: ", strconv.Itoa(resp.StatusCode))
	Logger.Info("Response body: ", healthStatus)
	if resp.StatusCode == http.StatusOK {
		Logger.Info("Health check passed for ", componentName)
		return nil
	}
	return fmt.Errorf("health check failed for %s; Response status = %d", componentName, resp.StatusCode)
}

func (d DockerCompose) CheckDockerContainersHealth(config networkspec.Config) error {

	var err error
	for i := 0; i < len(config.OrdererOrganizations); i++ {
		org := config.OrdererOrganizations[i]
		for j := 0; j < org.NumOrderers; j++ {
			ordererName := fmt.Sprintf("orderer%d-%s", j, org.Name)
			err = d.checkHealth(ordererName, config)
			if err != nil {
				return err
			}
		}
	}
	for i := 0; i < len(config.PeerOrganizations); i++ {
		org := config.PeerOrganizations[i]
		for j := 0; j < org.NumPeers; j++ {
			peerName := fmt.Sprintf("peer%d-%s", j, org.Name)
			err = d.checkHealth(peerName, config)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
