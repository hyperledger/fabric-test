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
	configtxPath := helper.TemplateFilePath("configtx")
	cryptoConfigPath := helper.TemplateFilePath("crypto-config")
	inputFilePath := helper.TemplateFilePath("input")
	configFilesPath := fmt.Sprintf("--output=%s", helper.ConfigFilesDir())
	k8sDir, dockerDir := helper.TemplateFilePath("k8s"), helper.TemplateFilePath("docker")
	ytt := helper.YTTPath()
	if kubeConfigPath != "" {
		err = client.ExecuteCommand(ytt, "-f", configtxPath, "-f", cryptoConfigPath, "-f", k8sDir, "-f", inputFilePath, configFilesPath)
	} else {
		err = client.ExecuteCommand(ytt, "-f", configtxPath, "-f", cryptoConfigPath, "-f", dockerDir, "-f", inputFilePath, configFilesPath)
	}
	if err != nil {
		return err
	}
	return nil
}

//GenerateCryptoCerts -  to generate the crypto certs
func GenerateCryptoCerts(input networkspec.Config, kubeConfigPath string) error {

	configPath := helper.CryptoConfigDir(input.ArtifactsLocation)
	config := fmt.Sprintf("--config=%s", helper.JoinPath(helper.ConfigFilesDir(), "crypto-config.yaml"))
	err := client.ExecuteCommand("cryptogen", "generate", config, fmt.Sprintf("--output=%s", configPath))
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

	path := helper.ChannelArtifactsDir(input.ArtifactsLocation)

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

	path := helper.JoinPath(artifactsLocation, fmt.Sprintf("crypto-config/%sOrganizations/%s/%s", orgType, orgName, caType))
	for j := 0; j < numCA; j++ {
		files, err := ioutil.ReadDir(path)
		if err != nil {
			utils.PrintLogs("Failed to read files")
			return err
		}
		for _, file := range files {
			if strings.HasSuffix(file.Name(), "_sk") && file.Name() != "priv_sk" {
				err = client.ExecuteCommand("cp", helper.JoinPath(path, file.Name()), helper.JoinPath(path, "priv_sk"))
				if err != nil {
					utils.PrintLogs("Failed to copy files")
					return err
				}
			}
		}
	}
	return nil
}
