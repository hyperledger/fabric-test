// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package connectionprofile

import (
	"fmt"
	"io/ioutil"
	"os"
	"reflect"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
	yaml "gopkg.in/yaml.v2"
)

func ordererOrganizations(input networkspec.Config, kubeconfigPath string) (map[string]networkspec.Orderer, error) {
	orderers := make(map[string]networkspec.Orderer)
	artifactsLocation := input.ArtifactsLocation
	ordererOrgsPath := utils.OrdererOrgsDir(artifactsLocation)
	var err error
	var orderer networkspec.Orderer
	var portNumber, NodeIP string
	protocol := "grpc"
	if input.TLS == "true" || input.TLS == "mutual" {
		protocol = "grpcs"
	}
	for org := 0; org < len(input.OrdererOrganizations); org++ {
		ordererOrg := input.OrdererOrganizations[org]
		orgName := ordererOrg.Name
		for i := 0; i < ordererOrg.NumOrderers; i++ {
			ordererName := fmt.Sprintf("orderer%d-%s", i, orgName)
			portNumber, err = ServicePort(kubeconfigPath, ordererName, input.K8s.ServiceType, false)
			if err != nil {
				return orderers, err
			}
			NodeIP, err = ExternalIP(kubeconfigPath, input, ordererName)
			if err != nil {
				return orderers, err
			}
			orderer = networkspec.Orderer{MSPID: ordererOrg.MSPID, URL: fmt.Sprintf("%s://%s:%s", protocol, NodeIP, portNumber), AdminPath: utils.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp", orgName, orgName))}
			orderer.GrpcOptions.SslTarget = ordererName
			orderer.TLSCACerts.Path = utils.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/orderers/%s.%s/msp/tlscacerts/tlsca.%s-cert.pem", orgName, ordererName, orgName, orgName))
			orderers[ordererName] = orderer
		}
	}
	return orderers, nil
}

func certificateAuthorities(peerOrg networkspec.PeerOrganizations, kubeconfigPath string, input networkspec.Config) (map[string]networkspec.CertificateAuthority, error) {
	CAs := make(map[string]networkspec.CertificateAuthority)
	var err error
	var CA networkspec.CertificateAuthority
	var portNumber, NodeIP string
	protocol := "http"
	if input.TLS == "true" || input.TLS == "mutual" {
		protocol = "https"
	}
	artifactsLocation := input.ArtifactsLocation
	orgName := peerOrg.Name
	for i := 0; i < peerOrg.NumCA; i++ {
		caName := fmt.Sprintf("ca%d-%s", i, orgName)
		portNumber, err = ServicePort(kubeconfigPath, caName, input.K8s.ServiceType, false)
		if err != nil {
			return CAs, err
		}
		NodeIP, err = ExternalIP(kubeconfigPath, input, caName)
		if err != nil {
			return CAs, err
		}
		CA = networkspec.CertificateAuthority{URL: fmt.Sprintf("%s://%s:%s", protocol, NodeIP, portNumber), CAName: caName}
		CA.TLSCACerts.Path = utils.JoinPath(utils.PeerOrgsDir(artifactsLocation), fmt.Sprintf("%s/ca/ca.%s-cert.pem", orgName, orgName))
		CA.HTTPOptions.Verify = false
		CA.Registrar.EnrollID, CA.Registrar.EnrollSecret = "admin", "adminpw"
		CAs[fmt.Sprintf("ca%d", i)] = CA
	}
	return CAs, nil
}

func getKeysFromMap(newMap interface{}) []string {
	var componentsList []string
	v := reflect.ValueOf(newMap)
	if v.Kind() != reflect.Map {
		logger.ERROR("not a map!")
		return nil
	}
	keys := v.MapKeys()
	for i := range keys {
		componentsList = append(componentsList, fmt.Sprintf("%s", keys[i]))
	}
	return componentsList
}

func peersPerOrganization(peerorg networkspec.PeerOrganizations, input networkspec.Config, kubeconfigPath, peerOrgsLocation string) (map[string]networkspec.Peer, error) {
	var err error
	var peer networkspec.Peer
	var portNumber, NodeIP string
	peers := make(map[string]networkspec.Peer)
	protocol := "grpc"
	if input.TLS == "true" || input.TLS == "mutual" {
		protocol = "grpcs"
	}
	for i := 0; i < peerorg.NumPeers; i++ {
		peerName := fmt.Sprintf("peer%d-%s", i, peerorg.Name)
		portNumber, err = ServicePort(kubeconfigPath, peerName, input.K8s.ServiceType, false)
		if err != nil {
			return peers, err
		}
		NodeIP, err = ExternalIP(kubeconfigPath, input, peerName)
		if err != nil {
			return peers, err
		}
		peer = networkspec.Peer{URL: fmt.Sprintf("%s://%s:%s", protocol, NodeIP, portNumber)}
		peer.GrpcOptions.SslTarget = peerName
		peer.TLSCACerts.Path = utils.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/tlsca/tlsca.%s-cert.pem", peerorg.Name, peerorg.Name))
		peers[peerName] = peer
	}
	return peers, nil
}

//GenerateConnectionProfiles -- To generate conenction profiles
func GenerateConnectionProfiles(input networkspec.Config, kubeconfigPath string) error {

	peerOrgsLocation := utils.PeerOrgsDir(input.ArtifactsLocation)
	orderersMap, err := ordererOrganizations(input, kubeconfigPath)
	if err != nil {
		return err
	}
	for org := 0; org < len(input.PeerOrganizations); org++ {
		organizations := make(map[string]networkspec.Organization)
		peerorg := input.PeerOrganizations[org]
		peersMap, err := peersPerOrganization(peerorg, input, kubeconfigPath, peerOrgsLocation)
		if err != nil {
			return err
		}
		ca, err := certificateAuthorities(peerorg, kubeconfigPath, input)
		if err != nil {
			return err
		}
		caList := make([]string, 0, len(ca))
		for k := range ca {
			caList = append(caList, k)
		}
		org := organization(peerorg, peersMap, input, kubeconfigPath, peerOrgsLocation, caList)
		organizations[peerorg.Name] = org
		err = generateConnProfilePerOrg(kubeconfigPath, peerorg.Name, input, peersMap, organizations, ca, orderersMap)
		if err != nil {
			logger.ERROR("Failed to generate connection profile")
			return err
		}
	}
	return nil
}

func organization(peerorg networkspec.PeerOrganizations, peersMap map[string]networkspec.Peer, input networkspec.Config, kubeconfigPath, peerOrgsLocation string, caList []string) networkspec.Organization {
	var organization networkspec.Organization
	path := utils.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/users/Admin@%s/msp", peerorg.Name, peerorg.Name))
	organization = networkspec.Organization{Name: peerorg.Name, MSPID: peerorg.MSPID}
	organization.AdminPrivateKey.Path = path
	organization.SignedCert.Path = path
	organization.CertificateAuthorities = append(organization.CertificateAuthorities, caList...)
	organization.Peers = append(organization.Peers, getKeysFromMap(peersMap)...)
	return organization
}

func generateConnProfilePerOrg(kubeconfigPath, orgName string, input networkspec.Config, peersMap map[string]networkspec.Peer, organizations map[string]networkspec.Organization, certificateAuthorities map[string]networkspec.CertificateAuthority, orderersMap map[string]networkspec.Orderer) error {

	var err error
	path := utils.ConnectionProfilesDir(input.ArtifactsLocation)
	fileName := utils.JoinPath(path, fmt.Sprintf("connection_profile_%s.yaml", orgName))
	channels := make(map[string]networkspec.Channel)
	for i := 0; i < input.NumChannels; i++ {
		var channel networkspec.Channel
		orderersList := getKeysFromMap(orderersMap)
		peersList := getKeysFromMap(peersMap)
		channel = networkspec.Channel{Orderers: orderersList, Peers: peersList}
		channelName := fmt.Sprintf("testorgschannel%d", i)
		channels[channelName] = channel
	}
	client := networkspec.Client{Organization: orgName}
	client.Conenction.Timeout.Peer.Endorser = 300
	client.Conenction.Timeout.Peer.EventHub = 600
	client.Conenction.Timeout.Peer.EventReg = 300
	client.Conenction.Timeout.Orderer = 300
	cp := networkspec.ConnectionProfile{Client: client, Channels: channels, Organizations: organizations, Orderers: orderersMap, Peers: peersMap, CA: certificateAuthorities}
	yamlBytes, err := yaml.Marshal(cp)
	if err != nil {
		logger.ERROR("Failed to convert the connection profile struct to bytes")
		return err
	}
	_, err = os.Create(fileName)
	if err != nil {
		logger.ERROR("Failed to create ", fileName)
		return err
	}
	yamlBytes = append([]byte("version: 1.0 \nname: My network \ndescription: Connection Profile for Blockchain Network \n"), yamlBytes...)
	err = ioutil.WriteFile(fileName, yamlBytes, 0644)
	if err != nil {
		logger.ERROR("Failed to write content to ", fileName)
		return err
	}
	logger.INFO("Successfully created ", fileName)
	return nil
}
