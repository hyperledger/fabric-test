// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/utils"
	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

func createMspJSON(input networkspec.Config, path string, caPath string, componentName string, kubeConfigPath string) error {

	var msp networkspec.MSP
	var tls networkspec.TLS
	var ca, tlsCa networkspec.CA
	var component networkspec.Component
	var tlsArr []string
	if strings.HasPrefix(componentName, "orderer") || strings.HasPrefix(componentName, "peer") {
		files, err := ioutil.ReadDir(path)
		if err != nil {
			return err
		}
		dir := path
		for _, f := range files {
			if f.Name() == "msp" {
				mspDir, _ := ioutil.ReadDir(fmt.Sprintf("%s/msp", dir))
				var mspArr []string
				for _, sf := range mspDir {
					mspSubDir, _ := ioutil.ReadDir(fmt.Sprintf("%s/msp/%s", dir, sf.Name()))
					for _, j := range mspSubDir {
						data, _ := ioutil.ReadFile(fmt.Sprintf("%s/msp/%s/%s", dir, sf.Name(), j.Name()))
						mspArr = append(mspArr, string(data))
					}
				}
				msp.AdminPem = mspArr[0]
				msp.CAPem = mspArr[1]
				msp.PrivateKey = mspArr[2]
				msp.Pem = mspArr[3]
				msp.TLSPem = mspArr[4]
			} else {
				tlsDir, _ := ioutil.ReadDir(fmt.Sprintf("%s/tls", dir))
				for _, sf := range tlsDir {
					data, _ := ioutil.ReadFile(fmt.Sprintf("%s/tls/%s", dir, sf.Name()))
					tlsArr = append(tlsArr, string(data))
				}
				tls.CACert = tlsArr[0]
				tls.ServerCert = tlsArr[1]
				tls.ServerKey = tlsArr[2]
			}
		}
		component.Msp = msp
		component.TLS = tls
	}

	files, err := ioutil.ReadDir(caPath)
	if err != nil {
		return err
	}

	for _, f := range files {
		dir := fmt.Sprintf("%s/%s", caPath, f.Name())
		if f.Name() == "ca" {
			caDir, _ := ioutil.ReadDir(fmt.Sprintf("%s/", dir))
			caCerts := make(map[string]string)
			for _, file := range caDir {
				data, _ := ioutil.ReadFile(fmt.Sprintf("%s/%s", dir, file.Name()))
				if strings.HasSuffix(file.Name(), "pem") {
					caCerts["pem"] = string(data)
				} else {
					caCerts["private_key"] = string(data)
				}
			}
			ca.PrivateKey = caCerts["private_key"]
			ca.Pem = caCerts["pem"]
		} else if f.Name() == "tlsca" {
			tlsCaDir, _ := ioutil.ReadDir(fmt.Sprintf("%s/", dir))
			tlsCaCerts := make(map[string]string)
			for _, file := range tlsCaDir {
				data, _ := ioutil.ReadFile(fmt.Sprintf("%s/%s", dir, file.Name()))
				if strings.HasSuffix(file.Name(), "pem") {
					tlsCaCerts["pem"] = string(data)
				} else {
					tlsCaCerts["private_key"] = string(data)
				}
			}
			tlsCa.PrivateKey = tlsCaCerts["private_key"]
			tlsCa.Pem = tlsCaCerts["pem"]
		}
	}

	component.CA = ca
	component.TLSCa = tlsCa
	b, _ := json.MarshalIndent(component, "", "  ")
	_ = ioutil.WriteFile(fmt.Sprintf("./../configFiles/%s.json", componentName), b, 0644)

	err = client.ExecuteK8sCommand(kubeConfigPath, "create", "secret", "generic", fmt.Sprintf("%s", componentName), fmt.Sprintf("--from-file=./../configFiles/%s.json", componentName))
	if err != nil {
		return err
	}
	return nil
}

//CreateMspSecret - to create msp secret for peers, orderers and CA
func CreateMspSecret(input networkspec.Config, kubeConfigPath string) error{

	var err error
	numOrdererOrganizations := len(input.OrdererOrganizations)
	if input.Orderer.OrdererType == "solo" || input.Orderer.OrdererType == "kafka" {
		numOrdererOrganizations = 1
	}
	for i := 0; i < numOrdererOrganizations; i++ {
		organization := input.OrdererOrganizations[i]
		numOrderers := organization.NumOrderers
		if input.Orderer.OrdererType == "solo" {
			numOrderers = 1
		}
		err = launchMspSecret(numOrderers, false, "orderer", organization.Name, kubeConfigPath, input)
		if err != nil{
			return err
		}
		err = launchMspSecret(organization.NumCA, true, "orderer", organization.Name, kubeConfigPath, input)
		if err != nil{
			return err
		}
	}

	for i := 0; i < len(input.PeerOrganizations); i++ {
		organization := input.PeerOrganizations[i]
		err = launchMspSecret(organization.NumPeers, false, "peer", organization.Name, kubeConfigPath, input)
		if err != nil{
			return err
		}
		err = launchMspSecret(organization.NumCA, true, "peer", organization.Name, kubeConfigPath, input)
		if err != nil{
			return err
		}
	}
	
	return nil
}

func launchMspSecret(numComponents int, isCA bool, componentType, orgName, kubeConfigPath string, input networkspec.Config) error{

	var path, caPath, componentName string
	cryptoConfigPath := helper.CryptoConfigDir(input.ArtifactsLocation)
	for j := 0; j < numComponents; j++ {
		componentName = fmt.Sprintf("ca%d-%s", j, orgName)
		if isCA != true {
			componentName = fmt.Sprintf("%s%d-%s", componentType, j, orgName)
			path = helper.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s/%ss/%s.%s", componentType, orgName, componentType, componentName, orgName))
		}
		caPath = helper.JoinPath(cryptoConfigPath, fmt.Sprintf("%sOrganizations/%s", componentType, orgName))
		err := createMspJSON(input, path, caPath, componentName, kubeConfigPath)
		if err != nil {
			utils.PrintLogs(fmt.Sprintf("Failed to create msp secret for %s", componentName))
			return err
		}
	}
	if isCA == false && input.TLS == "mutual" {
		err := client.ExecuteK8sCommand(kubeConfigPath, "create", "secret", "generic", fmt.Sprintf("%s-clientrootca-secret", orgName), fmt.Sprintf("--from-file=%s/%sOrganizations/%s/ca/ca.%s-cert.pem", cryptoConfigPath, componentType, orgName, orgName))
		if err != nil {
			utils.PrintLogs(fmt.Sprintf("Failed to create msp secret with client root CA for %s", componentName))
			return err
		}
	}
	return nil
}
