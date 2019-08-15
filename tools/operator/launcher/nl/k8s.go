// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

type K8s struct {
	Action string
	Input  []string
}

func (k K8s) Args(kubeConfigPath string) []string {

	kubeConfigPath = fmt.Sprintf("--kubeconfig=%s", kubeConfigPath)
	args := []string{kubeConfigPath}
	if k.Action != "" {
		args = append(args, k.Action)
	}
	for i := 0; i < len(k.Input); i++ {
		switch k.Action {
		case "apply", "delete":
			args = append(args, []string{"-f", k.Input[i]}...)
		default:
			args = append(args, k.Input[i])
		}

	}
	return args
}

func (k K8s) ConfigMapsNSecretsArgs(kubeConfigPath, componentName, k8sType string) []string {

	kubeConfigPath = fmt.Sprintf("--kubeconfig=%s", kubeConfigPath)
	args := []string{kubeConfigPath, k.Action, k8sType}
	if k8sType == "secret" {
		args = append(args, "generic")
	}
	args = append(args, componentName)
	for i := 0; i < len(k.Input); i++ {
		switch k.Action {
		case "create":
			args = append(args, fmt.Sprintf("--from-file=%s", k.Input[i]))
		default:
			args = append(args, k.Input[i])
		}

	}
	return args
}

//LaunchK8sComponents - to launch the kubernates components
func LaunchK8sComponents(kubeConfigPath string, isDataPersistence string) error {
	k8sServicesFile := utils.ConfigFilePath("services")
	k8sPodsFile := utils.ConfigFilePath("pods")
	inputPaths := []string{k8sServicesFile, k8sPodsFile}
	if isDataPersistence == "true" {
		k8sPvcFile := utils.ConfigFilePath("pvc")
		inputPaths = append(inputPaths, k8sPvcFile)
	}
	k8s := K8s{Action: "apply", Input: inputPaths}
	_, err := client.ExecuteK8sCommand(k8s.Args(kubeConfigPath), true)
	if err != nil {
		utils.PrintLogs(fmt.Sprintf("Failed to launch the fabric k8s components"))
		return err
	}
	return nil
}

//DownK8sComponents - To tear down the kubernates network
func DownK8sComponents(kubeConfigPath string, input networkspec.Config) error {

	var err error
	var numComponents int
	secrets := []string{"genesisblock"}
	numOrdererOrganizations := len(input.OrdererOrganizations)
	for i := 0; i < numOrdererOrganizations; i++ {
		ordererOrg := input.OrdererOrganizations[i]
		numComponents = ordererOrg.NumOrderers
		err = deleteConfigMaps(numComponents, "orderer", ordererOrg.Name, kubeConfigPath, input.TLS, "configmaps")
		if err != nil {
			utils.PrintLogs(fmt.Sprintf("Failed to delete orderer configmaps in %s", ordererOrg.Name))
		}
		if input.TLS == "mutual" {
			secrets = append(secrets, fmt.Sprintf("%s-clientrootca-secret", ordererOrg.Name))
		}
	}

	for i := 0; i < len(input.PeerOrganizations); i++ {
		peerOrg := input.PeerOrganizations[i]
		numComponents = peerOrg.NumPeers
		err = deleteConfigMaps(numComponents, "peer", peerOrg.Name, kubeConfigPath, input.TLS, "configmaps")
		if err != nil {
			utils.PrintLogs(fmt.Sprintf("Failed to delete peer secrets in %s", peerOrg.Name))
		}
		if input.TLS == "mutual" {
			secrets = append(secrets, fmt.Sprintf("%s-clientrootca-secret", peerOrg.Name))
		}
	}
	k8sServicesFile := utils.ConfigFilePath("services")
	k8sPodsFile := utils.ConfigFilePath("pods")

	var inputPaths []string
	var k8s K8s
	if input.K8s.DataPersistence == "local" {
		inputPaths = []string{dataPersistenceFilePath(input)}
		k8s = K8s{Action: "apply", Input: inputPaths}
		_, err = client.ExecuteK8sCommand(k8s.Args(kubeConfigPath), true)
		if err != nil {
			utils.PrintLogs("Failed to launch k8s pod")
		}
	}
	inputPaths = []string{k8sServicesFile, k8sPodsFile}
	if input.K8s.DataPersistence == "true" || input.K8s.DataPersistence == "local" {
		inputPaths = append(inputPaths, dataPersistenceFilePath(input))
	}

	k8s = K8s{Action: "delete", Input: inputPaths}
	_, err = client.ExecuteK8sCommand(k8s.Args(kubeConfigPath), true)
	if err != nil {
		utils.PrintLogs("Failed to down k8s pods")
	}
	inputArgs := []string{"delete", "secrets"}
	inputArgs = append(inputArgs, secrets...)
	k8s = K8s{Action: "", Input: inputArgs}
	_, err = client.ExecuteK8sCommand(k8s.Args(kubeConfigPath), true)
	if err != nil {
		utils.PrintLogs("Failed to delete secrets")
	}
	return nil
}

func dataPersistenceFilePath(input networkspec.Config) string {
	var path string
	currDir, err := utils.GetCurrentDir()
	if err != nil {
		utils.PrintLogs("Failed to get the current working directory")
	}
	switch input.K8s.DataPersistence {
	case "local":
		path = utils.JoinPath(currDir, "alpine.yaml")
	default:
		path = utils.ConfigFilePath("pvc")
	}
	return path
}

func deleteConfigMaps(numComponents int, componentType, orgName, kubeConfigPath, tls, k8sType string) error {

	componentsList := []string{fmt.Sprintf("%s-ca", orgName)}
	var componentName string
	for j := 0; j < numComponents; j++ {
		componentName = fmt.Sprintf("%s%d-%s", componentType, j, orgName)
		componentsList = append(componentsList, []string{fmt.Sprintf("%s-tls", componentName), fmt.Sprintf("%s-msp", componentName)}...)
	}
	input := []string{"delete", k8sType}
	input = append(input, componentsList...)
	k8s := K8s{Action: "", Input: input}
	_, err := client.ExecuteK8sCommand(k8s.Args(kubeConfigPath), true)
	if err != nil {
		return err
	}
	return nil
}
