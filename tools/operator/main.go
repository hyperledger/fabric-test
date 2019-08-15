package main

import (
	"flag"
	"io/ioutil"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/dockercompose"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/k8s"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

var networkSpecPath = flag.String("i", "", "Network spec input file path (required)")
var kubeConfigPath = flag.String("k", "", "Kube config file path (optional)")
var action = flag.String("a", "", "Set action (Available options createChannelTxn, migrate, healthz)")
var componentName = flag.String("c", "", "Component name of a peer or orderer (Use with healthcheck action; omit to check all components)")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) {

	if *networkSpecPath == "" {
		logger.CRIT(nil, "Input file not provided")
	} else if *kubeConfigPath == "" {
		logger.INFO("Kube config file not provided, proceeding with local environment")
	}
}

func doAction(action, env, kubeConfigPath, componentName string, config networkspec.Config) {

	var err error
	switch action {
	case "createChannelTxn":
		configTxnPath := paths.ConfigFilesDir()
		err = client.GenerateChannelTransaction(config, configTxnPath)
		if err != nil {
			logger.CRIT(err, "Failed to create channel transaction")
		}
	case "migrate":
		err = client.MigrateToRaft(config, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to migrate consensus to raft from", config.Orderer.OrdererType)
		}
	case "health":
		switch env {
		case "k8s":
			k8s := k8s.K8s{KubeConfigPath: kubeConfigPath, Config: config}
			err = k8s.CheckK8sComponentsHealth(k8s.config)
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
	validateArguments(networkSpecPath, kubeConfigPath)
	env := "docker"
	if *kubeConfigPath != "" {
		env = "k8s"
	}
	contents, _ := ioutil.ReadFile(*networkSpecPath)
	contents = append([]byte("#@data/values \n"), contents...)
	inputPath := paths.JoinPath(paths.TemplatesDir(), "input.yaml")
	ioutil.WriteFile(inputPath, contents, 0644)
	client.CreateConfigPath()
	var network nl.Network
	config, err := network.GetConfigData(inputPath)
	if err != nil {
		logger.CRIT(err)
	}
	doAction(*action, env, *kubeConfigPath, *componentName, config)
}
