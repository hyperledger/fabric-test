// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"
	"os"
	"path/filepath"
    "log"
    "github.com/hyperledger/fabric-test/tools/operator/utils"
    "github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//NetworkCleanUp - to clean up the network
func NetworkCleanUp(input networkspec.Config, kubeConfigPath string) error {
    var err error
    if kubeConfigPath != "" {
        numOrdererOrganizations := len(input.OrdererOrganizations)
        for i := 0; i < numOrdererOrganizations; i++ {
            ordererOrg := input.OrdererOrganizations[i]
            numOrderers := ordererOrg.NumOrderers
            deleteSecrets(numOrderers, "orderer", input.OrdererOrganizations[i].Name, kubeConfigPath, input.TLS)
            deleteSecrets(input.OrdererOrganizations[i].NumCA, "ca", input.OrdererOrganizations[i].Name, kubeConfigPath, input.TLS)
        }

        for i := 0; i < len(input.PeerOrganizations); i++ {
            deleteSecrets(input.PeerOrganizations[i].NumPeers, "peer", input.PeerOrganizations[i].Name, kubeConfigPath, input.TLS)
            deleteSecrets(input.PeerOrganizations[i].NumCA, "ca", input.PeerOrganizations[i].Name, kubeConfigPath, input.TLS)
        }
        err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "secrets", "genesisblock")
        err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./../configFiles/fabric-k8s-pods.yaml")
        if input.K8s.DataPersistence == "local" {
            err = client.ExecuteK8sCommand(kubeConfigPath, "apply", "-f", "./scripts/alpine.yaml")
        }
        err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./../configFiles/fabric-k8s-service.yaml")
        err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./../configFiles/fabric-k8s-pvc.yaml")
        err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "configmaps", "certsparser")
    } else {
        err = client.ExecuteCommand("docker-compose", "-f", "./../configFiles/docker-compose.yaml", "down")
    }
    if err != nil {
        utils.PrintLogs("", err)
    }

    err = os.RemoveAll("../configFiles")
    err = os.RemoveAll("../templates/input.yaml")
    path := filepath.Join(input.ArtifactsLocation, "channel-artifacts")
    err = os.RemoveAll(path)
    path = filepath.Join(input.ArtifactsLocation, "crypto-config")
    err = os.RemoveAll(path)
    path = filepath.Join(input.ArtifactsLocation, "connection-profile")
    err = os.RemoveAll(path)
    if input.K8s.DataPersistence == "local" && kubeConfigPath != "" {
        err = client.ExecuteK8sCommand(kubeConfigPath, "delete", "-f", "./scripts/alpine.yaml")
    }
    if err != nil {
        return err
    }
    return nil
}

func deleteSecrets(numComponents int, componentType, orgName, kubeConfigPath, tls string) {

    for j := 0; j < numComponents; j++ {
        componentName := fmt.Sprintf("%s%d-%s", componentType, j, orgName)
        err := client.ExecuteK8sCommand(kubeConfigPath, "delete", "secrets", componentName)
        if err != nil {
            utils.PrintLogs("", err)
        }
    }
    if (componentType == "peer" || componentType == "orderer") && tls == "mutual" {
        err := client.ExecuteK8sCommand(kubeConfigPath, "delete", "secrets", fmt.Sprintf("%s-clientrootca-secret", orgName))
        if err != nil {
            utils.PrintLogs("", err)
        }
    }
}
