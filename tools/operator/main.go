package main

import (
	"flag"
	"io/ioutil"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/dockercompose"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/k8s"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

var inputFilePath = flag.String("i", "", "Input file path (required)")
var kubeConfigPath = flag.String("k", "", "Kube config file path (optional)")
var action = flag.String("a", "", "Set action (Available options up, down, create, join, install, instantiate, upgrade, invoke, query, createChannelTxn, migrate, health)")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) {

	if *networkSpecPath == "" {
		logger.CRIT(nil, "Input file not provided")
	} else if *kubeConfigPath == "" {
		logger.INFO("Kube config file not provided, proceeding with local environment")
	}
}

func contains(s []string, e string) bool {
    for _, a := range s {
        if a == e {
            return true
        }
    }
    return false
}

func doAction(action, env, kubeConfigPath, inputFilePath string) {

	var err error
	var inputPath string
	var config networkspec.Config
	actions := []string{"up", "down", "createChannelTxn", "migrate", "health"}
	if contains(actions, action) {
		contents, _ := ioutil.ReadFile(inputFilePath)
		contents = append([]byte("#@data/values \n"), contents...)
		inputPath = paths.JoinPath(paths.TemplatesDir(), "input.yaml")
		ioutil.WriteFile(inputPath, contents, 0644)

		var network nl.Network
		config, err = network.GetConfigData(inputPath)

		if err != nil {
			logger.CRIT(err)
		}
	}

	switch action {
	case "up":
		err = launcher.Launcher("up", env, kubeConfigPath, inputPath)
		if err != nil {
			logger.CRIT(err, "Failed to launch network")
		}
	case "down":
		err = launcher.Launcher("down", env, kubeConfigPath, inputPath)
		if err != nil {
			logger.CRIT(err, "Failed to delete network")
		}
	case "create":
		err = testclient.Testclient("create", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to create channel in network")
		}
	case "join":
		err = testclient.Testclient("join", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to join peers to channel in network")
		}
	case "install":
		err = testclient.Testclient("install", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to install chaincode")
		}
	case "instantiate":
		err = testclient.Testclient("instantiate", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to instantiate chaincode")
		}
	case "upgrade":
		err = testclient.Testclient("upgrade", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to upgrade chaincode")
		}
	case "invoke":
		err = testclient.Testclient("invoke", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to send invokes")
		}
	case "query":
		err = testclient.Testclient("query", inputFilePath)
		if err != nil {
			logger.CRIT(err, "Failed to send queries")
		}
	case "createChannelTxn":
		configTxnPath := paths.ConfigFilesDir()
		err = networkclient.GenerateChannelTransaction(config, configTxnPath)
		if err != nil {
			logger.CRIT(err, "Failed to create channel transaction")
		}
	case "migrate":
		err = networkclient.MigrateToRaft(config, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to migrate consensus to raft from", config.Orderer.OrdererType)
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
			logger.CRIT(err, "Failed to check health of fabric components")
		}
	default:
		logger.CRIT(nil, "Incorrect action (%s). Use createChannelTxn or migrate or health for action ", action)
	}
}

func main() {

	flag.Parse()
	validateArguments(inputFilePath, kubeConfigPath)
	env := "docker"
	if *kubeConfigPath != "" {
		env = "k8s"
	}
	doAction(*action, env, *kubeConfigPath, *inputFilePath)
}