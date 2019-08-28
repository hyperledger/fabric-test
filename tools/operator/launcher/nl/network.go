// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/ytt"
	yaml "gopkg.in/yaml.v2"
)

type Network struct {
	TemplatesDir string
}

//GetConfigData - to read the yaml file and parse the data
func (n Network) GetConfigData(networkSpecPath string) (networkspec.Config, error) {

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
func (n Network) GenerateConfigurationFiles() error {

	configtxPath := paths.TemplateFilePath("configtx")
	cryptoConfigPath := paths.TemplateFilePath("crypto-config")
	inputFilePath := paths.TemplateFilePath("input")
	configFilesPath := fmt.Sprintf("--output=%s", paths.ConfigFilesDir())
	yttPath := paths.YTTPath()
	inputArgs := []string{configtxPath, cryptoConfigPath, n.TemplatesDir}
	yttObject := ytt.YTT{InputPath: inputFilePath, OutputPath: configFilesPath}
	_, err := networkclient.ExecuteCommand(yttPath, yttObject.Args(inputArgs), true)
	if err != nil {
		return err
	}
	return nil
}

// GenerateCryptoCerts -  to generate the crypto certs
func (n Network) GenerateCryptoCerts(config networkspec.Config) error {

	artifactsLocation := config.ArtifactsLocation
	outputPath := paths.CryptoConfigDir(artifactsLocation)
	cryptoConfigPath := paths.ConfigFilePath("crypto-config")
	generate := networkclient.Cryptogen{ConfigPath: cryptoConfigPath, Output: outputPath}
	_, err := networkclient.ExecuteCommand("cryptogen", generate.Args(), true)
	if err != nil {
		return err
	}
	for i := 0; i < len(config.OrdererOrganizations); i++ {
		org := config.OrdererOrganizations[i]
		err = n.changeKeyNames(artifactsLocation, "orderer", org.Name, org.NumOrderers)
		if err != nil {
			return err
		}
	}
	for i := 0; i < len(config.PeerOrganizations); i++ {
		org := config.PeerOrganizations[i]
		err = n.changeKeyNames(artifactsLocation, "peer", org.Name, org.NumPeers)
		if err != nil {
			return err
		}
	}
	return nil
}

//GenerateGenesisBlock - to generate a genesis block and to create channel transactions
func (n Network) GenerateGenesisBlock(config networkspec.Config) error {

	artifactsLocation := config.ArtifactsLocation
	path := paths.ChannelArtifactsDir(artifactsLocation)
	outputPath := paths.JoinPath(path, "genesis.block")
	configFilesPath := paths.ConfigFilesDir()
	configtxgen := networkclient.Configtxgen{Config: configFilesPath, OutputPath: outputPath}
	_, err := networkclient.ExecuteCommand("configtxgen", configtxgen.Args(), true)
	if err != nil {
		return err
	}
	return nil
}

func (n Network) changeKeyNames(artifactsLocation, orgType, orgName string, numComponents int) error {

	var path string
	var err error
	cryptoConfigPath := paths.CryptoConfigDir(artifactsLocation)
	caArr := []string{"ca", "tlsca"}
	for i := 0; i < len(caArr); i++ {
		path = paths.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s/%s", orgType, orgName, caArr[i]))
		fileName := fmt.Sprintf("%v-priv_sk", caArr[i])
		err = n.moveKey(path, fileName)
		if err != nil {
			return err
		}
	}
	for i := 0; i < numComponents; i++ {
		componentName := fmt.Sprintf("%s%d-%s.%s", orgType, i, orgName, orgName)
		path = paths.JoinPath(artifactsLocation, fmt.Sprintf("crypto-config/%sOrganizations/%s/%ss/%s/msp/keystore", orgType, orgName, orgType, componentName))
		err = n.moveKey(path, "priv_sk")
		if err != nil {
			return err
		}
	}

	return nil
}

func (n Network) moveKey(path, fileName string) error {

	var err error
	files, err := ioutil.ReadDir(path)
	if err != nil {
		logger.ERROR("Failed to read files")
		return err
	}
	for _, file := range files {
		if strings.HasSuffix(file.Name(), "_sk") && file.Name() != fileName {
			args := []string{paths.JoinPath(path, file.Name()), paths.JoinPath(path, fileName)}
			_, err = networkclient.ExecuteCommand("mv", args, true)
			if err != nil {
				logger.ERROR("Failed to move files")
				return err
			}
		}
	}
	return err
}

func (n Network) GenerateNetworkArtifacts(config networkspec.Config) error {

	configFilesPath := paths.ConfigFilesDir()
	var err error

	err = n.GenerateCryptoCerts(config)
	if err != nil {
		logger.ERROR("Failed to generate certificates")
		return err
	}

	err = n.GenerateGenesisBlock(config)
	if err != nil {
		logger.ERROR("Failed to create orderer genesis block")
		return err
	}

	err = networkclient.GenerateChannelTransaction(config, configFilesPath)
	if err != nil {
		logger.ERROR("Failed to create channel transaction")
		return err
	}
	return err
}
