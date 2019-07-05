// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"
	"io/ioutil"
	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"log"
	"os"
	"path/filepath"

	yaml "gopkg.in/yaml.v2"
)

//GetConfigData - to read the yaml file and parse the data
func GetConfigData(networkSpecPath string) networkspec.Config {

	var config networkspec.Config
	yamlFile, err := ioutil.ReadFile(networkSpecPath)
	if err != nil {
		log.Fatalf("Failed to read input file; err = %v", err)
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		log.Fatalf("Failed to create config object; err = %v", err)
	}
	return config
}

//GenerateConfigurationFiles - to generate all the configuration files
func GenerateConfigurationFiles() error {

	err := client.ExecuteCommand("./ytt", "-f", "./../templates/", "--output", "./../configFiles")
	if err != nil {
		return err
	}
	return nil
}

//GenerateCryptoCerts -  to generate the crypto certs
func GenerateCryptoCerts(input networkspec.Config) error {

	configPath := filepath.Join(input.ArtifactsLocation, "crypto-config")
	err := client.ExecuteCommand("cryptogen", "generate", "--config=./../configFiles/crypto-config.yaml", fmt.Sprintf("--output=%v", configPath))
	if err != nil {
		return err
	}
	return nil
}

//GenerateGenesisBlock - to generate a genesis block and to create channel transactions
func GenerateGenesisBlock(input networkspec.Config, kubeConfigPath string) error {

	path := filepath.Join(input.ArtifactsLocation, "channel-artifacts")
	_ = os.Mkdir(path, 0755)

	err := client.ExecuteCommand("configtxgen", "-profile", "testOrgsOrdererGenesis", "-channelID", "orderersystemchannel", "-outputBlock", fmt.Sprintf("%v/genesis.block", path), "-configPath=./../configFiles/")
	if err != nil {
		return err
	}

	err = client.ExecuteK8sCommand(kubeConfigPath, "create", "secret", "generic", "genesisblock", fmt.Sprintf("--from-file=%v/genesis.block", path))
	if err != nil {
		return err
	}

	return nil
}

//LaunchK8sComponents - to launch the kubernates components
func LaunchK8sComponents(kubeConfigPath string, isDataPersistence string) error {

	err := client.ExecuteK8sCommand(kubeConfigPath, "create", "configmap", "certsparser", "--from-file=./scripts/certs-parser.sh")
	if err != nil {
		return err
	}

	err = client.ExecuteK8sCommand(kubeConfigPath, "apply", "-f", "./../configFiles/k8s-service.yaml", "-f", "./../configFiles/fabric-k8s-pods.yaml")
	if err != nil {
		return err
	}

	if isDataPersistence == "true" {
		err = client.ExecuteK8sCommand(kubeConfigPath, "apply", "-f", "./../configFiles/fabric-pvc.yaml")
		if err != nil {
			return err
		}
	}

	return nil
}
