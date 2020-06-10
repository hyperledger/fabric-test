package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v2"
)

var inputFilePathFlag = flag.String("i", "", "Required: Input file path")
var kubeConfigPathFlag = flag.String("k", "", "Optional: Kube config file path (optional)")
var actionFlag = flag.String("a", "up", "Required: Available actions: up, down, create, join, install, instantiate, upgrade, invoke, query, createChannelTxn, migrate, health")

func validateArguments(networkSpecPath string, kubeConfigPath string) error {
	if networkSpecPath == "" {
		return errors.New("Input file not provided")
	}
	if kubeConfigPath == "" {
		logger.INFO("Kube config file not provided, proceeding with Docker-based deployment")
	}
	return nil
}

func run(action, inputFilePath, kubeConfigPath string) error {
	contents, err := ioutil.ReadFile(inputFilePath)
	if err != nil {
		return fmt.Errorf("failed to reading config file from disk: %v", err)
	}

	// We read the network spec from disk, append the YTT "#@data/values" to the start of it and
	// write it back to disk. This updated file will be used by YTT to generate YAML files from
	// this template file we just created.
	err = ioutil.WriteFile(paths.TemplateFilePath("input"), append([]byte("#@data/values\n"), contents...), 0644)
	if err != nil {
		return fmt.Errorf("failed to write config file to disk: %v", err)
	}

	var config networkspec.Config
	err = yaml.Unmarshal(contents, &config)
	if err != nil {
		return fmt.Errorf("failed to marshal network config file [%s]: %v", inputFilePath, err)
	}

	switch action {
	case "up":
		err := launcher.Launcher("up", kubeConfigPath, config)
		if err != nil {
			return fmt.Errorf("failed to launch network: %v", err)
		}
	case "down":
		err := launcher.Launcher("down", kubeConfigPath, config)
		if err != nil {
			return fmt.Errorf("failed to delete network: %v", err)
		}
	case "upgradeNetwork":
		err := launcher.Launcher("upgradeNetwork", kubeConfigPath, config)
		if err != nil {
			return fmt.Errorf("failed to upgrade network: %v", err)
		}
	case "updateCapability":
		return launcher.Launcher("updateCapability", kubeConfigPath, config)
	case "updatePolicy":
		return launcher.Launcher("updatePolicy", kubeConfigPath, config)
	case "create":
		err := testclient.Testclient("create", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to create channel in network: %v", err)
		}
	case "anchorpeer":
		err := testclient.Testclient("anchorpeer", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to add anchor peers to channel in network: %v", err)
		}
	case "join":
		err := testclient.Testclient("join", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to join peers to channel in network: %v", err)
		}
	case "install":
		err := testclient.Testclient("install", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to install chaincode: %v", err)
		}
	case "instantiate":
		err := testclient.Testclient("instantiate", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to instantiate chaincode: %v", err)
		}
	case "upgrade":
		err := testclient.Testclient("upgrade", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to upgrade chaincode: %v", err)
		}
	case "invoke":
		err := testclient.Testclient("invoke", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to invoke chaincode: %v", err)
		}
	case "query":
		err := testclient.Testclient("query", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to query chaincode: %v", err)
		}
	case "createChannelTxn":
		configTxnPath := paths.ConfigFilesDir()
		err := networkclient.GenerateChannelTransaction(config, configTxnPath)
		if err != nil {
			return fmt.Errorf("failed to create channel transaction: %v", err)
		}
	case "migrate":
		err := networkclient.MigrateToRaft(config, kubeConfigPath)
		if err != nil {
			return fmt.Errorf("failed to migrate consensus to raft from %s: %v", config.Orderer.OrdererType, err)
		}
	case "networkInSync":
		return networkclient.CheckNetworkInSync(config, kubeConfigPath)
	case "command":
		err := testclient.Testclient("command", inputFilePath)
		if err != nil {
			return fmt.Errorf("failed to execute command function: %v", err)
		}
	case "health":
		err := launcher.Launcher("health", kubeConfigPath, config)
		if err != nil {
			return fmt.Errorf("failed to perform healthcheck: %v", err)
		}
	default:
		flag.PrintDefaults()
		return fmt.Errorf("unsupported action [%s]", action)
	}
	return nil
}

func main() {
	flag.Parse()
	err := validateArguments(*inputFilePathFlag, *kubeConfigPathFlag)
	if err != nil {
		log.Fatalf("Invalid arguments: %s", err)
	}
	err = run(*actionFlag, *inputFilePathFlag, *kubeConfigPathFlag)
	if err != nil {
		log.Fatalf("Operator failed with error: %s", err.Error())
	}
}
