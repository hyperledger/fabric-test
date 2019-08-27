package dockercompose

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

func (d DockerCompose) VerifyContainersAreRunning() error {

	logger.INFO("Check status of all the containers to verify they are running")
	count := 0
	args := []string{"ps", "-a"}
	output, err := client.ExecuteCommand("docker", args, false)
	if err != nil {
		logger.ERROR("Error occured while listing all the containers")
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
				if len(exitedContainers) > 0 {
					logger.ERROR("Exited Containers: ", strings.Join(exitedContainers, ","))
					return errors.New("Containers exited")
				}
				count++
				if count >= 4{
					return errors.New("Waiting time to bring up containers exceeded 1 minute")
				}
			}
		}
	}()
}

func (d DockerCompose) checkHealth(componentName string, config networkspec.Config) error {

	logger.INFO("Checking health for ", componentName)
	var nodeIP string
	portNumber, err := d.GetDockerServicePort(componentName, true)
	if err != nil {
		logger.ERROR("Failed to get the port for ", componentName)
		return err
	}
	nodeIP = d.GetDockerExternalIP()
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
	return fmt.Errorf("Health check failed for %s; Response status = %s", componentName, resp.StatusCode)
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

