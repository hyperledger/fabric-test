package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/utils"	
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

var networkSpecPath = flag.String("i", "", "Network spec input file path (required)")
var kubeConfigPath = flag.String("k", "", "Kube config file path (optional)")
var action = flag.String("a", "", "Set action (Available options createChannelTxn, migrate, healthz)")
var component = flag.String("c", "", "Component name of a peer or orderer (Use with healthcheck action; omit to check all components)")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) {

	if *networkSpecPath == "" {
		logger.CRIT(nil, "Input file not provided")
	} else if *kubeConfigPath == "" {
		logger.INFO("Kube config file not provided, proceeding with local environment")
	}
}

func doAction(action, kubeConfigPath, componentName string, input networkspec.Config) {

	switch action {
	case "createChannelTxn":
		configTxnPath := "./configFiles"
		channels := []string{}
		err := client.GenerateChannelTransaction(input, channels, configTxnPath)
		if err != nil {
			logger.CRIT(err, "Failed to create channel transaction")
		}
	case "migrate":
		err := client.MigrateToRaft(input, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to migrate consensus to raft from", input.Orderer.OrdererType)
		}
	case "healthz":
		err := client.CheckComponentsHealth(componentName, kubeConfigPath, input)
		if err != nil {
			logger.CRIT(err, "Failed to get the health for", componentName, )
		}
	default:
		logger.CRIT(nil, "Incorrect mode (%s). Use createChannelTxn or migrate for mode", action)
	}
}

func main() {

	flag.Parse()
	validateArguments(networkSpecPath, kubeConfigPath)
	networkSpecPath, kubeConfigPath, action, componentName := readArguments()
	contents, _ := ioutil.ReadFile(networkSpecPath)
	contents = append([]byte("#@data/values \n"), contents...)
	inputPath := utils.JoinPath(utils.TemplatesDir(), "input.yaml")
	ioutil.WriteFile(inputPath, contents, 0644)
	client.CreateConfigPath()
	input := nl.GetConfigData(inputPath)
	doAction(action, kubeConfigPath, componentName, input)
}
