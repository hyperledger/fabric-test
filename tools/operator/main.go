package main

import (
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	"github.com/pkg/errors"
)

var inputFilePath = flag.String("i", "", "Input file path (required)")
var kubeConfigPath = flag.String("k", "", "Kube config file path (optional)")
var action = flag.String("a", "up", "Set action (Available options up, down, create, join, install, instantiate, upgrade, invoke, query, createChannelTxn, migrate, health)")
var Logger = logger.Logger("k8slauncher")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) error {

	if *networkSpecPath == "" {
		return errors.New("Input file not provided")
	} else if *kubeConfigPath == "" {
		Logger.Info("Kube config file not provided, proceeding with local environment")
	}
	return nil
}

func contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func doAction(action, env, kubeConfigPath, inputFilePath string) error {

	var err error
	var inputPath string
	var config networkspec.Config
	actions := []string{"up", "down", "createChannelTxn", "migrate", "health", "upgradeNetwork", "networkInSync", "updateCapability", "updatePolicy"}
	if contains(actions, action) {
		contents, _ := ioutil.ReadFile(inputFilePath)
		contents = append([]byte("#@data/values \n"), contents...)
		inputPath = paths.JoinPath(paths.TemplatesDir(), "input.yaml")
		ioutil.WriteFile(inputPath, contents, 0644)

		var network nl.Network
		config, err = network.GetConfigData(inputPath)
		if err != nil {
			return err
		}
	}

	switch action {
	case "up":
		err = launcher.Launcher("up", env, kubeConfigPath, inputPath)
		if err != nil {
			Logger.Error("Failed to launch network")
			return err
		}
	case "down":
		err = launcher.Launcher("down", env, kubeConfigPath, inputPath)
		if err != nil {
			Logger.Error("Failed to delete network")
			return err
		}
	case "upgradeNetwork":
		err = launcher.Launcher("upgradeNetwork", env, kubeConfigPath, inputPath)
		if err != nil {
			Logger.Error("Failed to upgrade network")
			return err
		}
	case "updateCapability":
		err = launcher.Launcher("updateCapability", env, kubeConfigPath, inputPath)
		if err != nil {
			return err
		}
	case "updatePolicy":
		err = launcher.Launcher("updatePolicy", env, kubeConfigPath, inputPath)
		if err != nil {
			return err
		}
	case "create":
		err = testclient.Testclient("create", inputFilePath)
		if err != nil {
			Logger.Error("Failed to create channel in network")
			return err
		}
	case "anchorpeer":
		err = testclient.Testclient("anchorpeer", inputFilePath)
		if err != nil {
			Logger.Error("Failed to add anchor peers to channel in network")
			return err
		}
	case "join":
		err = testclient.Testclient("join", inputFilePath)
		if err != nil {
			Logger.Error("Failed to join peers to channel in network")
			return err
		}
	case "install":
		err = testclient.Testclient("install", inputFilePath)
		if err != nil {
			Logger.Error("Failed to install chaincode")
			return err
		}
	case "instantiate":
		err = testclient.Testclient("instantiate", inputFilePath)
		if err != nil {
			Logger.Error("Failed to instantiate chaincode")
			return err
		}
	case "upgrade":
		err = testclient.Testclient("upgrade", inputFilePath)
		if err != nil {
			Logger.Error("Failed to upgrade chaincode")
			return err
		}
	case "invoke":
		err = testclient.Testclient("invoke", inputFilePath)
		if err != nil {
			Logger.Error("Failed to send invokes")
			return err
		}
	case "query":
		err = testclient.Testclient("query", inputFilePath)
		if err != nil {
			Logger.Error("Failed to send queries")
			return err
		}
	case "createChannelTxn":
		configTxnPath := paths.ConfigFilesDir()
		err = networkclient.GenerateChannelTransaction(config, configTxnPath)
		if err != nil {
			Logger.Error("Failed to create channel transaction")
			return err
		}
	case "migrate":
		err = networkclient.MigrateToRaft(config, kubeConfigPath)
		if err != nil {
			Logger.Error("Failed to migrate consensus to raft from ", config.Orderer.OrdererType)
			return err
		}
	case "networkInSync":
		err = networkclient.CheckNetworkInSync(config, kubeConfigPath)
		if err != nil {
			return err
		}
	case "command":
		err = testclient.Testclient("command", inputFilePath)
		if err != nil {
			Logger.Error("Failed to execute command function")
			return err
		}
	case "health":
		err = launcher.Launcher("health", env, kubeConfigPath, inputPath)
		if err != nil {
			Logger.Error("Failed to check health of fabric components")
			return err
		}
	default:
		Logger.Error("Incorrect action ", action, " provided. Use up or down or create or join or anchorpeer or install or instantiate or upgrade or invoke or query or createChannelTxn or migrate or health or upgradeNetwork for action ")
		return err
	}
	return nil
}

func writeLogToAFile() {
	f, err := os.OpenFile("text.log",
		os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Println(err)
	}
	defer f.Close()
}

func main() {

	flag.Parse()
	validateArguments(inputFilePath, kubeConfigPath)

	env := "docker"
	if *kubeConfigPath != "" {
		env = "k8s"
	}
	f, err := os.OpenFile("/tmp/orders.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer f.Close()
	wrt := io.MultiWriter(f)
	log.SetOutput(wrt)

	err = doAction(*action, env, *kubeConfigPath, *inputFilePath)
	if err != nil {
		Logger.Error(fmt.Sprintln("Operator failed with error ", err))
		os.Exit(1)
	}
}
