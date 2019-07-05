// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//NetworkCleanUp - to clean up the network
func NetworkCleanUp(input networkspec.Config, kubeConfigPath string) error {

	numOrdererOrganizations := len(input.OrdererOrganizations)
	if input.Orderer.OrdererType == "solo" || input.Orderer.OrdererType == "kafka" {
		numOrdererOrganizations = 1
	}
	for i := 0; i < numOrdererOrganizations; i++ {
		ordererOrg := input.OrdererOrganizations[i]
		numOrderers := ordererOrg.NumOrderers
		if input.Orderer.OrdererType == "solo" {
			numOrderers = 1
		}
		deleteSecrets(numOrderers, "orderer", input.OrdererOrganizations[i].Name, kubeConfigPath, input.TLS)
		deleteSecrets(input.OrdererOrganizations[i].NumCA, "ca", input.OrdererOrganizations[i].Name, kubeConfigPath, input.TLS)
	}

	for i := 0; i < len(input.PeerOrganizations); i++ {
		deleteSecrets(input.PeerOrganizations[i].NumPeers, "peer", input.PeerOrganizations[i].Name, kubeConfigPath, input.TLS)
		deleteSecrets(input.PeerOrganizations[i].NumCA, "ca", input.PeerOrganizations[i].Name, kubeConfigPath, input.TLS)
	}
	err := client.ExecuteK8sCommand(kubeConfigPath, "delete", "secrets", "genesisblock")
	err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./../configFiles/fabric-k8s-pods.yaml")
	if input.K8s.DataPersistence == "local" {
		err = client.ExecuteK8sCommand(kubeConfigPath, "apply", "-f", "./scripts/alpine.yaml")
	}
	err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./../configFiles/k8s-service.yaml")
	err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./../configFiles/fabric-pvc.yaml")
	err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "configmaps", "certsparser")
	if err != nil {
		fmt.Println(err.Error())
	}

	err = os.RemoveAll("../configFiles")
	err = os.RemoveAll("../templates/input.yaml")
	path := filepath.Join(input.ArtifactsLocation, "channel-artifacts")
	err = os.RemoveAll(path)
	path = filepath.Join(input.ArtifactsLocation, "crypto-config")
	err = os.RemoveAll(path)
	path = filepath.Join(input.ArtifactsLocation, "connection-profile")
	err = os.RemoveAll(path)
	if input.K8s.DataPersistence == "local" {
		err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./scripts/alpine.yaml")
	}
	if err != nil {
		return err
	}
	return nil
}

func deleteSecrets(numComponents int, componentType, orgName, kubeConfigPath, tls string) {

	for j := 0; j < numComponents; j++ {
		componentName := fmt.Sprintf("%v%v-%v", componentType, j, orgName)
		err := client.ExecuteK8sCommand(kubeConfigPath, "delete", "secrets", componentName)
		if err != nil {
			fmt.Println(err.Error())
		}
	}
	if (componentType == "peer" || componentType == "orderer") && tls == "mutual" {
		err := client.ExecuteK8sCommand(kubeConfigPath, "delete", "secrets", fmt.Sprintf("%v-clientrootca-secret", orgName))
		if err != nil {
			fmt.Println(err.Error())
		}
	}
}
