// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
	yaml "gopkg.in/yaml.v2"
)

//GetConfigData - to read the yaml file and parse the data
func GetConfigData(networkSpecPath string) (networkspec.Config, error) {

	var config networkspec.Config
	yamlFile, err := ioutil.ReadFile(networkSpecPath)
	if err != nil {
		logger.ERROR("Failed to read input file")
		return config, err
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		logger.ERROR("Failed to create config object")
		return config, err
	}
	return config, nil
}

//GenerateConfigurationFiles - to generate all the configuration files
func GenerateConfigurationFiles(kubeConfigPath string) error {

	configtxPath := utils.TemplateFilePath("configtx")
	cryptoConfigPath := utils.TemplateFilePath("crypto-config")
	inputFilePath := utils.TemplateFilePath("input")
	configFilesPath := fmt.Sprintf("--output=%s", utils.ConfigFilesDir())
	dir := utils.TemplateFilePath("docker")
	if kubeConfigPath != "" {
		dir = utils.TemplateFilePath("k8s")
	}
	ytt := utils.YTTPath()
	input := []string{configtxPath, cryptoConfigPath, dir}
	yttObject := utils.YTT{InputPath: inputFilePath, OutputPath: configFilesPath}
	_, err := client.ExecuteCommand(ytt, yttObject.Args(input), true)
	if err != nil {
		return err
	}
	return nil
}

// GenerateCryptoCerts -  to generate the crypto certs
func GenerateCryptoCerts(input networkspec.Config, kubeConfigPath string) error {

	artifactsLocation := input.ArtifactsLocation
	outputPath := utils.CryptoConfigDir(artifactsLocation)
	config := utils.ConfigFilePath("crypto-config")
	generate := client.Cryptogen{Config: config, Output: outputPath}
	_, err := client.ExecuteCommand("cryptogen", generate.Args(), true)
	if err != nil {
		return err
	}
	for i := 0; i < len(input.OrdererOrganizations); i++ {
		org := input.OrdererOrganizations[i]
		err = changeKeyName(artifactsLocation, "orderer", org.Name, org.NumOrderers)
		if err != nil {
			return err
		}
	}
	for i := 0; i < len(input.PeerOrganizations); i++ {
		org := input.PeerOrganizations[i]
		err = changeKeyName(artifactsLocation, "peer", org.Name, org.NumPeers)
		if err != nil {
			return err
		}
	}
	return nil
}

//GenerateGenesisBlock - to generate a genesis block and to create channel transactions
func GenerateGenesisBlock(input networkspec.Config, kubeConfigPath string) error {

	artifactsLocation := input.ArtifactsLocation
	path := utils.ChannelArtifactsDir(artifactsLocation)
	outputPath := utils.JoinPath(path, "genesis.block")
	config := utils.ConfigFilesDir()
	configtxgen := client.Configtxgen{Config: config, OutputPath: outputPath}
	_, err := client.ExecuteCommand("configtxgen", configtxgen.Args(), true)
	if err != nil {
		return err
	}
	if kubeConfigPath != "" {
		inputArgs := []string{utils.JoinPath(path, "genesis.block")}
		k8s := K8s{Action: "create", Input: inputArgs}
		_, err = client.ExecuteK8sCommand(k8s.ConfigMapsNSecretsArgs(kubeConfigPath, "genesisblock", "secret"), true)
		if err != nil {
			return err
		}
	}
	return nil
}

func changeKeyName(artifactsLocation, orgType, orgName string, numComponents int) error {

	var path string
	var err error
	cryptoConfigPath := utils.CryptoConfigDir(artifactsLocation)
	caArr := []string{"ca", "tlsca"}
	for i := 0; i < len(caArr); i++ {
		path = utils.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s/%s", orgType, orgName, caArr[i]))
		fileName := fmt.Sprintf("%v-priv_sk", caArr[i])
		err = moveKey(path, fileName)
		if err != nil {
			return err
		}
	}
	for i := 0; i < numComponents; i++ {
		componentName := fmt.Sprintf("%s%d-%s.%s", orgType, i, orgName, orgName)
		path = utils.JoinPath(artifactsLocation, fmt.Sprintf("crypto-config/%sOrganizations/%s/%ss/%s/msp/keystore", orgType, orgName, orgType, componentName))
		err = moveKey(path, "priv_sk")
		if err != nil {
			return err
		}
	}

	return nil
}

func moveKey(path, fileName string) error {

	var err error
	files, err := ioutil.ReadDir(path)
	if err != nil {
		logger.ERROR("Failed to read files")
		return err
	}
	for _, file := range files {
		if strings.HasSuffix(file.Name(), "_sk") && file.Name() != fileName {
			args := []string{utils.JoinPath(path, file.Name()), utils.JoinPath(path, fileName)}
			_, err = client.ExecuteCommand("mv", args, true)
			if err != nil {
				logger.ERROR("Failed to copy files")
				return err
			}
		}
	}
	return err
}