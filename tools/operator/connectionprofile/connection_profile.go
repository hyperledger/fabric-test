// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package connectionprofile

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"reflect"
	"strings"
	"time"
	"github.com/hyperledger/fabric-test/tools/operator/helper"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
	yaml "gopkg.in/yaml.v2"
)

func GetK8sExternalIP(kubeconfigPath string, input networkspec.Config, serviceName string) (string, error) {

	if kubeconfigPath == "" {
		return "localhost", nil
	}
	var IPAddress string
	if input.K8s.ServiceType == "NodePort" {
		stdoutStderr, err := exec.Command("kubectl", fmt.Sprintf("--kubeconfig=%s", kubeconfigPath), "get", "nodes", "-o", `jsonpath='{ $.items[*].status.addresses[?(@.type=="ExternalIP")].address }'`).CombinedOutput()
		if err != nil {
            utils.PrintLogs("Failed to get the external IP for k8s using NodePor")
			return "", err
		}
		IPAddressList := strings.Split(string(stdoutStderr)[1:], " ")
		IPAddress = IPAddressList[0]
	} else if input.K8s.ServiceType == "LoadBalancer" {
		stdoutStderr, err := exec.Command("kubectl", fmt.Sprintf("--kubeconfig=%s", kubeconfigPath), "get", "-o", `jsonpath="{.status.loadBalancer.ingress[0].ip}"`, "services", serviceName).CombinedOutput()
		if err != nil {
            utils.PrintLogs("Failed to get the external IP for k8s using NodePort")
			return "", err
		}
		IPAddress = string(stdoutStderr)[1 : len(string(stdoutStderr))-1]
	}

	return IPAddress, nil
}

func GetK8sServicePort(kubeconfigPath, serviceName string, forHealth bool) (string, error) {

	var port string
	if kubeconfigPath != "" {
		stdoutStderr, err := exec.Command("kubectl", fmt.Sprintf("--kubeconfig=%s", kubeconfigPath), "get", "-o", `jsonpath="{.spec.ports[0].nodePort}"`, "services", serviceName).CombinedOutput()
		if forHealth {
			stdoutStderr, err = exec.Command("kubectl", fmt.Sprintf("--kubeconfig=%s", kubeconfigPath), "get", "-o", `jsonpath="{.spec.ports[1].nodePort}"`, "services", serviceName).CombinedOutput()
		}
		if err != nil {
            utils.PrintLogs(fmt.Sprintf("Failed to get the port number for service %s", serviceName))
			return "", err
		}
		port = string(stdoutStderr)
		port = port[1 : len(port)-1]
	} else {
		stdoutStderr, err := exec.Command("docker", "port", serviceName).CombinedOutput()
		if err != nil {
            utils.PrintLogs(fmt.Sprintf("Failed to get the port number for service %s", serviceName))
			return "", err
		}
		ports := strings.Split(string(stdoutStderr), "\n")
		if len(ports) == 0 {
			utils.PrintLogs(fmt.Sprintf("Unable to get the port number for service %s", serviceName))
			return "", errors.New("Unable to get the port number")
		}
		if forHealth {
			for i := 0; i < len(ports); i++ {
				if (strings.Contains(ports[i], "9443")) || (strings.Contains(ports[i], "8443")) {
					port = ports[i]
					port = port[len(port)-5 : len(port)]
					return port, nil
				}
			}
		} else {
			for i := 0; i < len(ports); i++ {
				if !(strings.Contains(ports[i], "9443")) {
					if !(strings.Contains(ports[i], "8443")) {
						port = ports[i]
						port = port[len(port)-5 : len(port)]
						return port, nil
					}
				}
			}
		}
	}
	return port, nil
}

func ordererOrganizations(input networkspec.Config, kubeconfigPath string) (map[string]networkspec.Orderer, error) {
	orderers := make(map[string]networkspec.Orderer)
	artifactsLocation := input.ArtifactsLocation
	ordererOrgsPath := helper.OrdererOrgsDir(artifactsLocation)
	var err error
	numOrdererOrganizations := len(input.OrdererOrganizations)
	if input.Orderer.OrdererType == "solo" || input.Orderer.OrdererType == "kafka" {
		numOrdererOrganizations = 1
	}

	for org := 0; org < numOrdererOrganizations; org++ {
		ordererOrg := input.OrdererOrganizations[org]
		orgName := ordererOrg.Name
		numOrderers := ordererOrg.NumOrderers
		if input.Orderer.OrdererType == "solo" {
			numOrderers = 1
		}
		for i := 0; i < numOrderers; i++ {
			var orderer networkspec.Orderer
			ordererName := fmt.Sprintf("orderer%d-%s", i, orgName)
			var portNumber, NodeIP, protocol string
			if kubeconfigPath != "" {
				if input.K8s.ServiceType == "NodePort" {
					portNumber, err = GetK8sServicePort(kubeconfigPath, ordererName, false)
					if err != nil {
						return orderers, err
					}
					NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, "")
					if err != nil {
						return orderers, err
					}
				} else {
					portNumber = "7050"
					NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, ordererName)
					if err != nil {
						return orderers, err
					}
				}
			} else {
				portNumber, err = GetK8sServicePort(kubeconfigPath, ordererName, false)
				if err != nil {
					return orderers, err
				}
				NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, ordererName)
				if err != nil {
					return orderers, err
				}
			}
			protocol = "grpc"
			if input.TLS == "true" || input.TLS == "mutual" {
				protocol = "grpcs"
			}
			orderer = networkspec.Orderer{MSPID: ordererOrg.MSPID, URL: fmt.Sprintf("%s://%s:%s", protocol, NodeIP, portNumber), AdminPath: helper.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp", ordererOrg.Name, ordererOrg.Name))}
			orderer.GrpcOptions.SslTarget = ordererName
			orderer.TLSCACerts.Path = helper.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/orderers/%s.%s/msp/tlscacerts/tlsca.%s-cert.pem", orgName, ordererName, orgName, orgName))
			orderers[ordererName] = orderer
		}
	}
	return orderers, nil
}

func certificateAuthorities(peerOrg networkspec.PeerOrganizations, kubeconfigPath string, input networkspec.Config) (map[string]networkspec.CertificateAuthority, error) {
	CAs := make(map[string]networkspec.CertificateAuthority)
	var err error
	artifactsLocation := input.ArtifactsLocation
	for i := 0; i < peerOrg.NumCA; i++ {
		var CA networkspec.CertificateAuthority
		var portNumber, NodeIP, protocol string
		orgName := peerOrg.Name
		caName := fmt.Sprintf("ca%d-%s", i, orgName)
		if kubeconfigPath != "" {
			if input.K8s.ServiceType == "NodePort" {
				portNumber, err = GetK8sServicePort(kubeconfigPath, caName, false)
				if err != nil {
					return CAs, err
				}
				NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, "")
				if err != nil {
					return CAs, err
				}
			} else {
				portNumber = "7054"
				NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, caName)
				if err != nil {
					return CAs, err
				}
			}
		} else {
			portNumber, err = GetK8sServicePort(kubeconfigPath, caName, false)
			if err != nil {
				return CAs, err
			}
			NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, caName)
			if err != nil {
				return CAs, err
			}
		}
		protocol = "http"
		if input.TLS == "true" || input.TLS == "mutual" {
			protocol = "https"
		}
		CA = networkspec.CertificateAuthority{URL: fmt.Sprintf("%s://%s:%s", protocol, NodeIP, portNumber), CAName: caName}
		CA.TLSCACerts.Path = helper.JoinPath(helper.PeerOrgsDir(artifactsLocation), fmt.Sprintf("%s/ca/ca.%s-cert.pem", orgName, orgName))
		CA.HTTPOptions.Verify = false
		CA.Registrar.EnrollID = "admin"
		CA.Registrar.EnrollSecret = "adminpw"
		CAs[fmt.Sprintf("ca%d", i)] = CA
	}
	return CAs, nil
}

func getKeysFromMap(newMap interface{}) []string {
	var componentsList []string
	v := reflect.ValueOf(newMap)
	if v.Kind() != reflect.Map {
		utils.PrintLogs("not a map!")
		return nil
	}
	keys := v.MapKeys()
	for i := range keys {
		componentsList = append(componentsList, fmt.Sprintf("%s", keys[i]))
	}
	return componentsList
}

func peerOrganizations(input networkspec.Config, kubeconfigPath string) error {

	peerOrgsLocation := helper.PeerOrgsDir(input.ArtifactsLocation)
	orderersMap, err := ordererOrganizations(input, kubeconfigPath)
	if err != nil {
		return err
	}
	for org := 0; org < len(input.PeerOrganizations); org++ {
		peers := make(map[string]networkspec.Peer)
		organizations := make(map[string]networkspec.Organization)
		peerorg := input.PeerOrganizations[org]
		var peer networkspec.Peer
		var organization networkspec.Organization
		peersList := []string{}
		for i := 0; i < input.PeerOrganizations[org].NumPeers; i++ {
			peerName := fmt.Sprintf("peer%d-%s", i, peerorg.Name)
			var portNumber, NodeIP, protocol string
			if kubeconfigPath != "" {
				if input.K8s.ServiceType == "NodePort" {
					portNumber, err = GetK8sServicePort(kubeconfigPath, peerName, false)
					if err != nil {
						return err
					}
					NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, "")
					if err != nil {
						return err
					}
				} else {
					portNumber = "7051"
					NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, peerName)
					if err != nil {
						return err
					}
				}
			} else {
				portNumber, err = GetK8sServicePort(kubeconfigPath, peerName, false)
				if err != nil {
					return err
				}
				NodeIP, err = GetK8sExternalIP(kubeconfigPath, input, peerName)
				if err != nil {
					return err
				}
			}
			protocol = "grpc"
			if input.TLS == "true" || input.TLS == "mutual" {
				protocol = "grpcs"
			}
			peer = networkspec.Peer{URL: fmt.Sprintf("%s://%s:%s", protocol, NodeIP, portNumber)}
			peer.GrpcOptions.SslTarget = peerName
			peer.TLSCACerts.Path = helper.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/tlsca/tlsca.%s-cert.pem", peerorg.Name, peerorg.Name))
			peersList = append(peersList, peerName)
			peers[peerName] = peer
			organization = networkspec.Organization{Name: peerorg.Name, MSPID: peerorg.MSPID}
		}
		path := helper.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/users/Admin@%s/msp", peerorg.Name, peerorg.Name))
		organization.AdminPrivateKey.Path = path
		organization.SignedCert.Path = path
		ca, err := certificateAuthorities(peerorg, kubeconfigPath, input)
		if err != nil {
			return err
		}
		caList := make([]string, 0, len(ca))
		for k := range ca {
			caList = append(caList, k)
		}
		organization.CertificateAuthorities = append(organization.CertificateAuthorities, caList...)
		organization.Peers = append(organization.Peers, peersList...)
		organizations[peerorg.Name] = organization

		err = generateConnectionProfileFile(kubeconfigPath, peerorg.Name, input, peers, organizations, ca, orderersMap)
		if err != nil {
            utils.PrintLogs("Failed to generate connection profile")
			return err
		}
	}
	return nil
}

func generateConnectionProfileFile(kubeconfigPath, orgName string, input networkspec.Config, peerOrganizations map[string]networkspec.Peer, organizations map[string]networkspec.Organization, certificateAuthorities map[string]networkspec.CertificateAuthority, orderersMap map[string]networkspec.Orderer) error {

	var err error
	path := helper.ConnectionProfilesDir(input.ArtifactsLocation)

	fileName := helper.JoinPath(path, fmt.Sprintf("connection_profile_%s.yaml", orgName))
	channels := make(map[string]networkspec.Channel)
	if err != nil {
		return err
	}
	for i := 0; i < input.NumChannels; i++ {
		var channel networkspec.Channel
		orderersList := getKeysFromMap(orderersMap)
		peersList := getKeysFromMap(peerOrganizations)
		channel = networkspec.Channel{Orderers: orderersList, Peers: peersList}
		channelName := fmt.Sprintf("testorgschannel%d", i)
		channels[channelName] = channel
	}
	client := networkspec.Client{Organization: orgName}
	client.Conenction.Timeout.Peer.Endorser = 300
	client.Conenction.Timeout.Peer.EventHub = 600
	client.Conenction.Timeout.Peer.EventReg = 300
	client.Conenction.Timeout.Orderer = 300
	cp := networkspec.ConnectionProfile{Client: client, Channels: channels, Organizations: organizations, Orderers: orderersMap, Peers: peerOrganizations, CA: certificateAuthorities}
	yamlBytes, err := yaml.Marshal(cp)
	if err != nil {
        utils.PrintLogs("Failed to convert the connection profile struct to bytes")
		return err
	}
	_, err = os.Create(fileName)
	if err != nil {
        utils.PrintLogs(fmt.Sprintf("Failed to create %s file", fileName))
		return err
	}
	yamlBytes = append([]byte("version: 1.0 \nname: My network \ndescription: Connection Profile for Blockchain Network \n"), yamlBytes...)
	err = ioutil.WriteFile(fileName, yamlBytes, 0644)
	if err != nil {
        utils.PrintLogs(fmt.Sprintf("Failed to write content to %s file", fileName))
		return err
	}
	utils.PrintLogs(fmt.Sprintf("Successfully created %s", fileName))
	return nil
}

//CreateConnectionProfile - to generate connection profile
func CreateConnectionProfile(input networkspec.Config, kubeconfigPath string) error {
	time.Sleep(5 * time.Second)
	err := peerOrganizations(input, kubeconfigPath)
	if err != nil {
        utils.PrintLogs("Error occured while generating the connection profile files")
		return err
	}
	return nil
}
