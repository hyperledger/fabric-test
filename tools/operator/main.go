package main

import (
	"flag"
	"fmt"
	"io/ioutil"

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
		utils.FatalLogs("Input file not provided", nil)
	} else if *kubeConfigPath == "" {
		utils.PrintLogs("Kube config file not provided, proceeding with local environment")
	}
}

func doAction(action, kubeConfigPath, componentName string, input networkspec.Config) {

	switch action {
	case "createChannelTxn":
		configTxnPath := "./configFiles"
		channels := []string{}
		err := client.GenerateChannelTransaction(input, channels, configTxnPath)
		if err != nil {
			utils.FatalLogs("Failed to create channel transaction", err)
		}
	case "migrate":
		err := client.MigrateToRaft(input, kubeConfigPath)
		if err != nil {
			utils.FatalLogs(fmt.Sprintf("Failed to migrate consensus from %s to raft", input.Orderer.OrdererType), err)
		}
	case "healthz":
		err := client.CheckComponentsHealth(componentName, kubeConfigPath, input)
		if err != nil {
			utils.FatalLogs(fmt.Sprintf("Failed to get the health for %s", componentName), err)
		}
	default:
		utils.FatalLogs(fmt.Sprintf("Incorrect mode (%s). Use createChannelTxn or migrate for mode", action), nil)
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
