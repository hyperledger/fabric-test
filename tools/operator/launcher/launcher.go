// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"flag"
	"io/ioutil"
	"log"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

var networkSpecPath = flag.String("i", "", "Network spec input file path")
var kubeConfigPath = flag.String("k", "", "Kube config file path")
var action = flag.String("a", "up", "Set action(up or down)")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) {

	if *networkSpecPath == "" {
		log.Fatalf("Input file not provided")
	} else if *kubeConfigPath == "" {
		log.Println("Kube config file not provided, proceeding with local environment")
	}
}

func doAction(action string, input networkspec.Config, kubeConfigPath string) {

	switch action {
	case "up":
		err := nl.GenerateConfigurationFiles(kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to generate yaml files; err = %v", err)
		}

		err = nl.GenerateCryptoCerts(input, kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to generate certificates; err = %v", err)
		}

		if kubeConfigPath != "" {
			nl.CreateMspSecret(input, kubeConfigPath)
		}

		err = nl.GenerateGenesisBlock(input, kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to create orderer genesis block; err = %v", err)
		}

		err = client.GenerateChannelTransaction(input, []string{}, "./../configFiles")
		if err != nil {
			log.Fatalf("Failed to create channel transactions; err = %v", err)
		}

		if kubeConfigPath != "" {
			err = nl.LaunchK8sComponents(kubeConfigPath, input.K8s.DataPersistence)
			if err != nil {
				log.Fatalf("Failed to launch k8s components; err = %v", err)
			}
		} else {
			err = nl.LaunchLocalNetwork()
			if err != nil {
				log.Fatalf("Failed to launch k8s components; err = %v", err)
			}
		}

		err = client.CheckContainersState(kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to check container status; err = %v", err)
		}

		err = client.CheckComponentsHealth("", kubeConfigPath, input)
		if err != nil {
			log.Fatalf("Failed to check health of fabric components; err = %v", err)
		}

		err = connectionprofile.CreateConnectionProfile(input, kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to create connection profile; err = %v", err)
		}
		log.Println("Network is up and running")

	case "down":
		err := nl.NetworkCleanUp(input, kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to clean up the network:; err = %v", err)
		}

	default:
		log.Fatalf("Incorrect action (%v). Use up or down for action", action)
	}
}

func checkConsensusType(input networkspec.Config) {

	ordererType := input.Orderer.OrdererType
	if ordererType == "solo" {
		if !(len(input.OrdererOrganizations) == 1 && input.OrdererOrganizations[0].NumOrderers == 1) {
			log.Fatalf("Consensus type solo should have only one orderer organization and one orderer")
		}
	} else if ordererType == "kafka" {
		if len(input.OrdererOrganizations) != 1 {
			log.Fatalf("Consensus type kafka should have only one orderer organization")
		}
	}
}

func main() {

	flag.Parse()
	utils.DownloadYtt()
	validateArguments(networkSpecPath, kubeConfigPath)
	contents, err := ioutil.ReadFile(*networkSpecPath)
	if err != nil {
		log.Fatalf("In-correct input file path; err:%v", err)
	}
	contents = append([]byte("#@data/values \n"), contents...)
	ioutil.WriteFile("./../templates/input.yaml", contents, 0644)
	inputPath := "./../templates/input.yaml"
	input := nl.GetConfigData(inputPath)
	checkConsensusType(input)
	doAction(*action, input, *kubeConfigPath)
}
