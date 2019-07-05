// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"path/filepath"
	"strings"

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
				mspDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/msp", dir))
				var mspArr []string
				for _, sf := range mspDir {
					mspSubDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/msp/%v", dir, sf.Name()))
					for _, j := range mspSubDir {
						data, _ := ioutil.ReadFile(fmt.Sprintf("%v/msp/%v/%v", dir, sf.Name(), j.Name()))
						mspArr = append(mspArr, string(data))
					}
				}
				msp.AdminPem = mspArr[0]
				msp.CAPem = mspArr[1]
				msp.PrivateKey = mspArr[2]
				msp.Pem = mspArr[3]
				msp.TLSPem = mspArr[4]
			} else {
				tlsDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/tls", dir))
				for _, sf := range tlsDir {
					data, _ := ioutil.ReadFile(fmt.Sprintf("%v/tls/%v", dir, sf.Name()))
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
		dir := fmt.Sprintf("%v/%v", caPath, f.Name())
		if f.Name() == "ca" {
			caDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/", dir))
			caCerts := make(map[string]string)
			for _, file := range caDir {
				data, _ := ioutil.ReadFile(fmt.Sprintf("%v/%v", dir, file.Name()))
				if strings.HasSuffix(file.Name(), "pem") {
					caCerts["pem"] = string(data)
				} else {
					caCerts["private_key"] = string(data)
				}
			}
			ca.PrivateKey = caCerts["private_key"]
			ca.Pem = caCerts["pem"]
		} else if f.Name() == "tlsca" {
			tlsCaDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/", dir))
			tlsCaCerts := make(map[string]string)
			for _, file := range tlsCaDir {
				data, _ := ioutil.ReadFile(fmt.Sprintf("%v/%v", dir, file.Name()))
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
	_ = ioutil.WriteFile(fmt.Sprintf("./../configFiles/%v.json", componentName), b, 0644)

	err = client.ExecuteK8sCommand(kubeConfigPath, "create", "secret", "generic", fmt.Sprintf("%v", componentName), fmt.Sprintf("--from-file=./../configFiles/%v.json", componentName))
	if err != nil {
		return err
	}
	return nil
}

//CreateMspSecret - to create msp secret for peers, orderers and CA
func CreateMspSecret(input networkspec.Config, kubeConfigPath string) {

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
		launchMspSecret(numOrderers, false, "orderer", organization.Name, kubeConfigPath, input)
		launchMspSecret(organization.NumCA, true, "orderer", organization.Name, kubeConfigPath, input)
	}

	for i := 0; i < len(input.PeerOrganizations); i++ {
		organization := input.PeerOrganizations[i]
		launchMspSecret(organization.NumPeers, false, "peer", organization.Name, kubeConfigPath, input)
		launchMspSecret(organization.NumCA, true, "peer", organization.Name, kubeConfigPath, input)
	}
}

func launchMspSecret(numComponents int, isCA bool, componentType, orgName, kubeConfigPath string, input networkspec.Config) {

	var path, caPath, componentName string
	for j := 0; j < numComponents; j++ {
		componentName = fmt.Sprintf("ca%v-%v", j, orgName)
		if isCA != true {
			componentName = fmt.Sprintf("%v%v-%v", componentType, j, orgName)
			path = filepath.Join(input.ArtifactsLocation, fmt.Sprintf("crypto-config/%vOrganizations/%v/%vs/%v.%v", componentType, orgName, componentType, componentName, orgName))
		}
		caPath = filepath.Join(input.ArtifactsLocation, fmt.Sprintf("crypto-config/%vOrganizations/%v", componentType, orgName))
		err := createMspJSON(input, path, caPath, componentName, kubeConfigPath)
		if err != nil {
			log.Fatalf("Failed to create msp secret for %v; err: %v", componentName, err)
		}
	}
	if isCA == false && input.TLS == "mutual" {
		err := client.ExecuteK8sCommand(kubeConfigPath, "create", "secret", "generic", fmt.Sprintf("%v-clientrootca-secret", orgName), fmt.Sprintf("--from-file=%v/crypto-config/%vOrganizations/%v/ca/ca.%v-cert.pem", input.ArtifactsLocation, componentType, orgName, orgName))
		if err != nil {
			log.Fatalf("Failed to create msp secret with client root CA for %v; err: %v", componentName, err)
		}
	}
}
