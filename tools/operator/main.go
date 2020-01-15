package main

import (
	"flag"
	"io/ioutil"
	"os"
	"io"
	"log"
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/dockercompose"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/k8s"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/pkg/errors"
)

var inputFilePath = flag.String("i", "", "Input file path (required)")
var kubeConfigPath = flag.String("k", "", "Kube config file path (optional)")
var action = flag.String("a", "up", "Set action (Available options up, down, create, join, install, instantiate, upgrade, invoke, query, createChannelTxn, migrate, health)")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) error {

	if *networkSpecPath == "" {
		return errors.New("Input file not provided")
	} else if *kubeConfigPath == "" {
		logger.INFO("Kube config file not provided, proceeding with local environment")
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
	actions := []string{"up", "down", "createChannelTxn", "migrate", "health", "upgradeNetwork"}
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
			logger.ERROR("Failed to launch network")
			return err
		}
	case "down":
		err = launcher.Launcher("down", env, kubeConfigPath, inputPath)
		if err != nil {
			logger.ERROR("Failed to delete network")
			return err
		}
	case "upgradeNetwork":
		err = launcher.Launcher("upgradeNetwork", env, kubeConfigPath, inputPath)
		if err != nil {
			logger.ERROR("Failed to upgrade network")
			return err
		}
	case "create":
		err = testclient.Testclient("create", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to create channel in network")
			return err
		}
	case "anchorpeer":
		err = testclient.Testclient("anchorpeer", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to add anchor peers to channel in network")
			return err
		}
	case "join":
		err = testclient.Testclient("join", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to join peers to channel in network")
			return err
		}
	case "install":
		err = testclient.Testclient("install", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to install chaincode")
			return err
		}
	case "instantiate":
		err = testclient.Testclient("instantiate", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to instantiate chaincode")
			return err
		}
	case "upgrade":
		err = testclient.Testclient("upgrade", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to upgrade chaincode")
			return err
		}
	case "invoke":
		err = testclient.Testclient("invoke", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to send invokes")
			return err
		}
	case "query":
		err = testclient.Testclient("query", inputFilePath)
		if err != nil {
			logger.ERROR("Failed to send queries")
			return err
		}
	case "createChannelTxn":
		configTxnPath := paths.ConfigFilesDir()
		err = networkclient.GenerateChannelTransaction(config, configTxnPath)
		if err != nil {
			logger.ERROR("Failed to create channel transaction")
			return err
		}
	case "migrate":
		err = networkclient.MigrateToRaft(config, kubeConfigPath)
		if err != nil {
			logger.ERROR("Failed to migrate consensus to raft from ", config.Orderer.OrdererType)
			return err
		}
	case "health":
		switch env {
		case "k8s":
			k8s := k8s.K8s{KubeConfigPath: kubeConfigPath, Config: config}
			err = k8s.CheckK8sComponentsHealth(k8s.Config)
		case "docker":
			dc := dockercompose.DockerCompose{Config: config}
			err = dc.CheckDockerContainersHealth(dc.Config)
		}
		if err != nil {
			logger.ERROR("Failed to check health of fabric components")
			return err
		}
	default:
		logger.ERROR("Incorrect action ", action ," provided. Use up or down or create or join or anchorpeer or install or instantiate or upgrade or invoke or query or createChannelTxn or migrate or health or upgradeNetwork for action ")
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

func main()  {

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
		logger.ERROR(fmt.Sprintln("Operator failed with error ", err))
	}
}