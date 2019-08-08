// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	yaml "gopkg.in/yaml.v2"
)

//GetConfigData - to read the yaml file and parse the data
func GetConfigData(networkSpecPath string) (networkspec.Config, error) {

	var config networkspec.Config
	yamlFile, err := ioutil.ReadFile(networkSpecPath)
	if err != nil {
		utils.PrintLogs("Failed to read input file")
		return config, err
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		utils.PrintLogs("Failed to create config object")
		return config, err
	}
	return config, nil
}

//GenerateConfigurationFiles - to generate all the configuration files
func GenerateConfigurationFiles(kubeConfigPath string) error {
	var err error
	if kubeConfigPath != "" {
		err = client.ExecuteCommand("./ytt", "-f", "../templates/configtx.yaml", "-f", "../templates/crypto-config.yaml", "-f", "../templates/k8s/", "-f", "../templates/input.yaml", "--output=./../configFiles/")
	} else {
		err = client.ExecuteCommand("./ytt", "-f", "../templates/configtx.yaml", "-f", "../templates/crypto-config.yaml", "-f", "../templates/docker/", "-f", "../templates/input.yaml", "--output=./../configFiles/")
	}
	if err != nil {
		return err
	}
	return nil
}

//GenerateCryptoCerts -  to generate the crypto certs
func GenerateCryptoCerts(input networkspec.Config, kubeConfigPath string) error {

	configPath := filepath.Join(input.ArtifactsLocation, "crypto-config")
	err := client.ExecuteCommand("cryptogen", "generate", "--config=./../configFiles/crypto-config.yaml", fmt.Sprintf("--output=%s", configPath))
	if err != nil {
		return err
	}
	if kubeConfigPath == "" {
		for i := 0; i < len(input.OrdererOrganizations); i++ {
			org := input.OrdererOrganizations[i]
			err = changeKeyName(input.ArtifactsLocation, "orderer", org.Name, "ca", org.NumCA)
			if err != nil {
				return err
			}
			err = changeKeyName(input.ArtifactsLocation, "orderer", org.Name, "tlsca", org.NumCA)
			if err != nil {
				return err
			}
		}
		for i := 0; i < len(input.PeerOrganizations); i++ {
			org := input.PeerOrganizations[i]
			err = changeKeyName(input.ArtifactsLocation, "peer", org.Name, "ca", org.NumCA)
			if err != nil {
				return err
			}
			err = changeKeyName(input.ArtifactsLocation, "peer", org.Name, "tlsca", org.NumCA)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

//GenerateGenesisBlock - to generate a genesis block and to create channel transactions
func GenerateGenesisBlock(input networkspec.Config, kubeConfigPath string) error {

	path := filepath.Join(input.ArtifactsLocation, "channel-artifacts")
	_ = os.Mkdir(path, 0755)

	err := client.ExecuteCommand("configtxgen", "-profile", "testOrgsOrdererGenesis", "-channelID", "orderersystemchannel", "-outputBlock", fmt.Sprintf("%s/genesis.block", path), "-configPath=./../configFiles/")
	if err != nil {
		return err
	}

	if kubeConfigPath != "" {
		err = client.ExecuteK8sCommand(kubeConfigPath, "create", "secret", "generic", "genesisblock", fmt.Sprintf("--from-file=%s/genesis.block", path))
		if err != nil {
			return err
		}
	}

	return nil
}

//LaunchK8sComponents - to launch the kubernates components
func LaunchK8sComponents(kubeConfigPath string, isDataPersistence string) error {

	err := client.ExecuteK8sCommand(kubeConfigPath, "create", "configmap", "certsparser", "--from-file=./scripts/certs-parser.sh")
	if err != nil {
		return err
	}

	err = client.ExecuteK8sCommand(kubeConfigPath, "apply", "-f", "./../configFiles/fabric-k8s-service.yaml", "-f", "./../configFiles/fabric-k8s-pods.yaml")
	if err != nil {
		return err
	}

	if isDataPersistence == "true" {
		err = client.ExecuteK8sCommand(kubeConfigPath, "apply", "-f", "./../configFiles/fabric-k8s-pvc.yaml")
		if err != nil {
			return err
		}
	}

	return nil
}

//LaunchLocalNetwork - to launch the network in the local environment
func LaunchLocalNetwork() error {
	cmd := exec.Command("docker-compose", "-f", "./../configFiles/docker-compose.yaml", "up", "-d")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		return err
	}
	return nil
}

func changeKeyName(artifactsLocation, orgType, orgName, caType string, numCA int) error {

	path := filepath.Join(artifactsLocation, fmt.Sprintf("crypto-config/%sOrganizations/%s/%s", orgType, orgName, caType))
	for j := 0; j < numCA; j++ {
		files, err := ioutil.ReadDir(path)
		if err != nil {
			utils.PrintLogs("Failed to read files")
			return err
		}
		for _, file := range files {
			if strings.HasSuffix(file.Name(), "_sk") && file.Name() != "priv_sk" {
				err = client.ExecuteCommand("cp", filepath.Join(path, file.Name()), filepath.Join(path, "priv_sk"))
				if err != nil {
					utils.PrintLogs("Failed to copy files")
					return err
				}
			}
		}
	}
	return nil
}
