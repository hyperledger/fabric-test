package dockercompose

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"

	"github.com/pkg/errors"
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
func (d DockerCompose) GenerateConfigurationFiles(upgrade bool) error {

	network := nl.Network{TemplatesDir: paths.TemplateFilePath("docker")}
	err := network.GenerateConfigurationFiles(upgrade)
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
	_, err := networkclient.ExecuteCommand("docker-compose", d.Args(), true)
	if err != nil {
		return err
	}
	return nil
}

//UpgradeLocalNetwork -- To upgrade the network in the local environment
func (d DockerCompose) UpgradeLocalNetwork(config networkspec.Config) error {

	//var network nl.Network
	d.Config = config
	configPath := paths.ConfigFilePath("docker")
	d = DockerCompose{ConfigPath: configPath, Action: []string{"down"}}
	_, err := networkclient.ExecuteCommand("docker-compose", d.Args(), true)
	if err != nil {
		return err
	}

	err = networkclient.UpgradeDB(config, "")
	if err != nil {
		return err
	}

	d = DockerCompose{ConfigPath: configPath, Action: []string{"up", "-d"}}
	_, err = networkclient.ExecuteCommand("docker-compose", d.Args(), true)
	if err != nil {
		return err
	}

	err = networkclient.UpdateCapability(config, "")
	if err != nil {
		return err
	}

	err = networkclient.UpdatePolicy(config, "")
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
	d = DockerCompose{ConfigPath: configPath, Action: []string{"down", "--volumes", "--remove-orphans"}}
	_, err := networkclient.ExecuteCommand("docker-compose", d.Args(), true)
	if err != nil {
		return err
	}
	
	configDirPath := paths.ConfigFilesDir()
	cleanArgs := []string{"run", "--rm", "-v", fmt.Sprintf("%s/backup:/tmp/backup", configDirPath), "busybox", "rm", "-rf", "/tmp/backup/*"}
	_, err = networkclient.ExecuteCommand("docker", cleanArgs, true)
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
		err = d.GenerateConfigurationFiles(false)
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
	case "upgradeNetwork":
		err = d.GenerateConfigurationFiles(true)
		if err != nil {
			logger.ERROR("Failed to generate docker compose file")
			return err
		}
		err = d.UpgradeLocalNetwork(d.Config)
		if err != nil {
			logger.ERROR("Failed to upgrade local fabric network")
			return err
		}
	case "down":
		err = d.DownLocalNetwork(d.Config)
		if err != nil {
			logger.ERROR("Failed to down local fabric network")
			return err
		}
	default:
		return errors.Errorf("Incorrect action %s Use up or down for action", action)
	}
	return nil
}
