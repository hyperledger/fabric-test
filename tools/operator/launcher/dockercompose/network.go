package dockercompose

import (
	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

type DockerCompose struct {
	ConfigPath string
	Action     []string
	Config     networkspec.Config
}

func (d DockerCompose) Args() []string {

	args := []string{"-f", d.ConfigPath}
	return append(args, d.Action...)
}

//GenerateConfigurationFiles - to generate all the configuration files
func (d DockerCompose) GenerateConfigurationFiles() error {

	network := nl.Network{TemplatesDir: paths.TemplateFilePath("docker")}
	err := network.GenerateConfigurationFiles()
	if err != nil {
		return err
	}
	return nil
}

//LaunchLocalNetwork -- To launch the network in the local environment
func (d DockerCompose) LaunchLocalNetwork(config networkspec.Config) error {

	d.Config = config
	configPath := paths.ConfigFilePath("docker")
	d = DockerCompose{ConfigPath: configPath, Action: []string{"up", "-d"}}
	_, err := client.ExecuteCommand("docker-compose", d.Args(), true)
	if err != nil {
		return err
	}
	return nil
}

//DownLocalNetwork -- To tear down the local network
func (d DockerCompose) DownLocalNetwork(config networkspec.Config) error {

	var network nl.Network
	d.Config = config
	configPath := paths.ConfigFilePath("docker")
	d = DockerCompose{ConfigPath: configPath, Action: []string{"down"}}
	_, err := client.ExecuteCommand("docker-compose", d.Args(), true)
	if err != nil {
		return err
	}
	err = network.NetworkCleanUp(config)
	if err != nil {
		return err
	}
	return nil
}

//DockerNetwork --
func (d DockerCompose) DockerNetwork(action string) error {

	var err error
	var network nl.Network
	switch action {
	case "up":
		err = d.GenerateConfigurationFiles()
		if err != nil {
			logger.ERROR("Failed to generate docker compose file")
			return err
		}
		err = network.GenerateNetworkArtifacts(d.Config)
		if err != nil {
			return err
		}
		err = d.LaunchLocalNetwork(d.Config)
		if err != nil {
			logger.ERROR("Failed to launch fabric network")
			return err
		}
		err = d.VerifyContainersAreRunning()
		if err != nil {
			logger.ERROR("Failed to verify docker container state")
			return err
		}
		err = d.CheckDockerContainersHealth(d.Config)
		if err != nil {
			logger.ERROR("Failed to check docker containers health")
			return err
		}
		err = d.GenerateConnectionProfiles(d.Config)
		if err != nil {
			logger.ERROR("Failed to generate connection profile")
			return err
		}
	case "down":
		err = d.DownLocalNetwork(d.Config)
		if err != nil {
			logger.ERROR("Failed to down local fabric network")
			return err
		}
	default:
		logger.CRIT(nil, "Incorrect action ", action, " Use up or down for action")
	}
	return nil
}
