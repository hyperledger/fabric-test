// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package k8s

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

//CreateMSPConfigMaps - create msp using configmap for peers, orderers and CA
func (k K8s) CreateMSPConfigMaps(config networkspec.Config) error {

	var err error
	for i := 0; i < len(config.OrdererOrganizations); i++ {
		organization := config.OrdererOrganizations[i]
		err := k.createCertsConfigmap(organization.NumOrderers, organization.NumCA, "orderer", organization.Name, config)
		if err != nil {
			return err
		}
	}

	for i := 0; i < len(config.PeerOrganizations); i++ {
		organization := config.PeerOrganizations[i]
		err = k.createCertsConfigmap(organization.NumPeers, organization.NumCA, "peer", organization.Name, config)
		if err != nil {
			return err
		}
	}
	return nil
}

func (k K8s) createCertsConfigmap(numComponents int, numCA int, componentType, orgName string, config networkspec.Config) error {

	var path, componentName, k8sComponentName string
	var err error
	var inputPaths []string
	cryptoConfigPath := paths.CryptoConfigDir(config.ArtifactsLocation)
	for j := 0; j < numComponents; j++ {
		componentName = fmt.Sprintf("%s%d-%s", componentType, j, orgName)
		path = paths.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s/%ss/%s.%s", componentType, orgName, componentType, componentName, orgName))
		inputPaths = []string{fmt.Sprintf("cacerts=%s/msp/cacerts/ca.%s-cert.pem", path, orgName),
			fmt.Sprintf("signcerts=%s/msp/signcerts/%s.%s-cert.pem", path, componentName, orgName),
			fmt.Sprintf("keystore=%s/msp/keystore/priv_sk", path),
			fmt.Sprintf("tlscacerts=%s/msp/tlscacerts/tlsca.%s-cert.pem", path, orgName)}
		if config.EnableNodeOUs {
			inputPaths = append(inputPaths, fmt.Sprintf("config=%s/../../msp/config.yaml", path))
		}
		// Creating msp configmap for components
		k8sComponentName = fmt.Sprintf("%s-msp", componentName)
		err = k.createConfigmapsNSecrets(inputPaths, k8sComponentName, "configmap")
		if err != nil {
			logger.ERROR("Failed to create msp configmap for ", componentName)
			return err
		}
		k8sComponentName = fmt.Sprintf("%s-tls", componentName)
		inputPaths = []string{fmt.Sprintf("%s/tls/", path)}
		// Creating tls configmap for components
		err = k.createConfigmapsNSecrets(inputPaths, k8sComponentName, "configmap")
		if err != nil {
			logger.ERROR("Failed to create tls configmap for ", componentName)
			return err
		}
	}

	adminCertPath := paths.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s/%ss/%s.%s/msp/admincerts", componentType, orgName, componentType, componentName, orgName))
	if config.EnableNodeOUs {
		inputPaths = []string{fmt.Sprintf("%s", adminCertPath)}
	} else {
		inputPaths = []string{fmt.Sprintf("admincerts=%s/Admin@%s-cert.pem", adminCertPath, orgName)}
	}
	k8sComponentName = fmt.Sprintf("%s-admincerts", orgName)
	err = k.createConfigmapsNSecrets(inputPaths, k8sComponentName, "configmap")
	if err != nil {
		logger.ERROR("Failed to create admincerts configmap for ", orgName)
		return err
	}

	// Calling createConfigmapsNSecrets to create ca certs configmap
	if numCA > 0 || config.TLS == "mutual" {
		k8sComponentName = fmt.Sprintf("%s-ca", orgName)
		caPath := paths.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s", componentType, orgName))
		inputPaths = []string{fmt.Sprintf("%s/ca/", caPath), fmt.Sprintf("%s/tlsca/", caPath)}
		err = k.createConfigmapsNSecrets(inputPaths, k8sComponentName, "configmap")
		if err != nil {
			logger.ERROR("Failed to create ca configmap for ", componentName)
			return err
		}
	}
	
	return nil
}

func (k K8s) createConfigmapsNSecrets(inputPaths []string, componentName, k8sType string) error {

	k = K8s{Action: "create", Arguments: inputPaths, KubeConfigPath: k.KubeConfigPath}
	_, err := networkclient.ExecuteK8sCommand(k.ConfigMapsNSecretsArgs(componentName, k8sType), true)
	if err != nil {
		return err
	}
	return nil
}
