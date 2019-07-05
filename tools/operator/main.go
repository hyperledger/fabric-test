package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"

	"fabric-test/tools/operator/launcher/nl"
	"fabric-test/tools/operator/client"
	"fabric-test/tools/operator/networkspec"
)

func readArguments() (string, string, string) {

	networkSpecPath := flag.String("i", "", "Network spec input file path (required)")
	kubeConfigPath := flag.String("k", "", "Kube config file path (optional)")
	action := flag.String("a", "", "Set action (Available options createChannelTxn, migrate)")
	flag.Parse()

	if fmt.Sprintf("%s", *kubeConfigPath) == "" {
		fmt.Println("Kube config file not provided")
	} else if fmt.Sprintf("%s", *networkSpecPath) == "" {
		log.Fatalf("Input file not provided")
	}

	return *networkSpecPath, *kubeConfigPath, *action
}

func doAction(action, kubeConfigPath string, input networkspec.Config) {

	switch action {
	case "createChannelTxn":
		configTxnPath := "./configFiles"
		channels := []string{}
		err := client.GenerateChannelTransaction(input, channels, configTxnPath)
		if err != nil {
			log.Fatalf("Failed to create channel transaction: err=%v", err)
		}
	case "migrate":
		err := client.MigrateToRaft(input, kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to migrate consensus from %v to raft: err=%v", input.Orderer.OrdererType, err)
		}
	default:
		log.Fatalf("Incorrect mode (%v). Use createChannelTxn or migrate for mode", action)
	}
}

func main() {

	networkSpecPath, kubeConfigPath, action := readArguments()
	contents, _ := ioutil.ReadFile(networkSpecPath)
	contents = append([]byte("#@data/values \n"), contents...)
	inputPath := "templates/input.yaml"
	ioutil.WriteFile(inputPath, contents, 0644)
	client.CreateConfigPath()
	input := nl.GetConfigData(inputPath)
	doAction(action, kubeConfigPath, input)
}