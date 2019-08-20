// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"flag"
	"io/ioutil"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/health"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

var networkSpecPath = flag.String("i", "", "Network spec input file path")
var kubeConfigPath = flag.String("k", "", "Kube config file path")
var action = flag.String("a", "up", "Set action(up or down)")

func validateArguments(networkSpecPath *string, kubeConfigPath *string) {

	if *networkSpecPath == "" {
		logger.CRIT(nil, "Input file not provided")
	} else if *kubeConfigPath == "" {
		logger.INFO("Kube config file not provided, proceeding with local environment")
	}
}

func doAction(action string, input networkspec.Config, kubeConfigPath string) {

	configFilesPath := utils.ConfigFilesDir()
	switch action {
	case "up":
		err := nl.GenerateConfigurationFiles(kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to generate yaml files")
		}
		err = nl.GenerateCryptoCerts(input, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to generate certificates")
		}

		if kubeConfigPath != "" {
			err = nl.CreateMSPConfigMaps(input, kubeConfigPath)
			if err != nil {
				logger.CRIT(err, "Failed to create config maps")
			}
		}

		err = nl.GenerateGenesisBlock(input, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to create orderer genesis block")
		}

		err = client.GenerateChannelTransaction(input, configFilesPath)
		if err != nil {
			logger.CRIT(err, "Failed to create channel transactions")
		}

		if kubeConfigPath != "" {
			err = nl.LaunchK8sComponents(kubeConfigPath, input.K8s.DataPersistence)
			if err != nil {
				logger.CRIT(err, "Failed to launch k8s components")
			}
		} else {
			err = nl.LaunchLocalNetwork()
			if err != nil {
				logger.CRIT(err, "Failed to launch docker containers")
			}
		}

		err = health.VerifyContainersAreRunning(kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to check container status")
		}

		err = health.CheckComponentsHealth("", kubeConfigPath, input)
		if err != nil {
			logger.CRIT(err, "Failed to check health of fabric components")
		}

		err = connectionprofile.GenerateConnectionProfiles(input, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to create connection profile")
		}
		logger.INFO("Network is up and running")

	case "down":
		err := nl.NetworkCleanUp(input, kubeConfigPath)
		if err != nil {
			logger.CRIT(err, "Failed to clean up the network")
		}

	default:
		logger.CRIT(nil, "Incorrect action", action, "Use up or down for action")
	}
}

func checkConsensusType(input networkspec.Config) {

	ordererType := input.Orderer.OrdererType
	if ordererType == "solo" {
		if !(len(input.OrdererOrganizations) == 1 && input.OrdererOrganizations[0].NumOrderers == 1) {
			logger.CRIT(nil, "Consensus type solo should have only one orderer organization and one orderer")
		}
	} else if ordererType == "kafka" {
		if len(input.OrdererOrganizations) != 1 {
			logger.CRIT(nil, "Consensus type kafka should have only one orderer organization")
		}
	}
}

func main() {

	flag.Parse()
	err := utils.DownloadYtt()
	if err != nil {
		logger.CRIT(err)
	}
	validateArguments(networkSpecPath, kubeConfigPath)
	contents, err := ioutil.ReadFile(*networkSpecPath)
	if err != nil {
		logger.CRIT(err, "Incorrect input file path")
	}
	contents = append([]byte("#@data/values \n"), contents...)
	inputPath := utils.JoinPath(utils.TemplatesDir(), "input.yaml")
	ioutil.WriteFile(inputPath, contents, 0644)
	input, err := nl.GetConfigData(inputPath)
	if err != nil {
		logger.CRIT(err)
	}
	checkConsensusType(input)
	doAction(*action, input, *kubeConfigPath)
}
