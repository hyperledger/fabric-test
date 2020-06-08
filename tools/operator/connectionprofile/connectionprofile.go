// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package connectionprofile

import (
	"fmt"
	"io/ioutil"
	"os"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	yaml "gopkg.in/yaml.v2"
)

type ConnProfile struct {
	Peers         map[string]networkspec.Peer
	Orderers      map[string]networkspec.Orderer
	CA            map[string]networkspec.CertificateAuthority
	Organizations map[string]networkspec.Organization
	Config        networkspec.Config
}

type CaliperConnProfile struct {
	Client        map[string]networkspec.CaliperClient
	Peers         map[string]networkspec.CaliperPeer
	Orderers      map[string]networkspec.CaliperOrderer
	CA            map[string]networkspec.CaliperCertificateAuthority
	Organizations map[string]networkspec.CaliperOrganization
	Config        networkspec.Config
}

func (c ConnProfile) Organization(peerorg networkspec.PeerOrganizations, caList []string) (networkspec.Organization, error) {

	var organization networkspec.Organization
	var err error
	var peerList []string
	orgName := peerorg.Name
	peerOrgsLocation := paths.PeerOrgsDir(c.Config.ArtifactsLocation)
	path := paths.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/users/Admin@%s/msp/signcerts/Admin@%s-cert.pem", orgName, orgName, orgName))
	cert, err := c.GetCertificateFromFile(path)
	if err != nil {
		return organization, err
	}
	organization = networkspec.Organization{Name: orgName, MSPID: peerorg.MSPID}
	organization.SignedCert.Pem = cert
	organization.AdminCert = cert
	organization.CertificateAuthorities = append(organization.CertificateAuthorities, caList...)
	for peer := range c.Peers {
		peerList = append(peerList, peer)
	}

	keystorePath := paths.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/users/Admin@%s/msp/keystore", orgName, orgName))

	privKeyFile, err := ioutil.ReadDir(keystorePath)
	if err != nil {
		return organization, err
	}
	privKeyPath := paths.JoinPath(keystorePath, privKeyFile[0].Name())
	cert, err = c.GetCertificateFromFile(privKeyPath)
	if err != nil {
		return organization, err
	}
	organization.PrivateKey = cert
	organization.AdminPrivateKey.Pem = cert
	organization.Peers = append(organization.Peers, peerList...)
	return organization, err
}

func (c ConnProfile) GenerateConnProfilePerOrg(orgName string) error {

	var err error
	path := paths.ConnectionProfilesDir(c.Config.ArtifactsLocation)
	fileName := paths.JoinPath(path, fmt.Sprintf("connection_profile_%s.yaml", orgName))
	client := networkspec.Client{Organization: orgName}
	client.Conenction.Timeout.Peer.Endorser = 300
	client.Conenction.Timeout.Peer.EventHub = 600
	client.Conenction.Timeout.Peer.EventReg = 300
	client.Conenction.Timeout.Orderer = 300
	cp := networkspec.ConnectionProfile{Client: client, Organizations: c.Organizations, Orderers: c.Orderers, Peers: c.Peers, CA: c.CA}
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

func (c ConnProfile) orderers2caliper(ordererMap map[string]networkspec.Orderer) map[string]networkspec.CaliperOrderer {
	caliperOrderers := make(map[string]networkspec.CaliperOrderer)
	for name, orderer := range ordererMap {
		caliperOrderer := networkspec.CaliperOrderer{
			URL:         orderer.URL,
			GrpcOptions: orderer.GrpcOptions,
			TLSCACerts:  orderer.TLSCACerts,
		}
		caliperOrderers[name] = caliperOrderer
	}

	return caliperOrderers
}

func (c ConnProfile) peers2caliper(peerMap map[string]networkspec.Peer) map[string]networkspec.CaliperPeer {
	caliperPeers := make(map[string]networkspec.CaliperPeer)
	for name, peer := range peerMap {
		caliperPeer := networkspec.CaliperPeer{
			URL:         peer.URL,
			GrpcOptions: peer.GrpcOptions,
			TLSCACerts:  peer.TLSCACerts,
		}
		caliperPeers[name] = caliperPeer
	}

	return caliperPeers
}

func (c ConnProfile) ca2caliper(caMAP map[string]networkspec.CertificateAuthority) map[string]networkspec.CaliperCertificateAuthority {
	caliperCAs := make(map[string]networkspec.CaliperCertificateAuthority)
	for name, ca := range caMAP {
		caliperCA := networkspec.CaliperCertificateAuthority{
			URL:         ca.URL,
			CAName:      ca.CAName,
			TLSCACerts:  ca.TLSCACerts,
			HTTPOptions: ca.HTTPOptions,
		}
		caReg := networkspec.CARegistrar{
			EnrollID:     ca.Registrar.EnrollID,
			EnrollSecret: ca.Registrar.EnrollSecret,
		}
		caliperCA.Registrar = append(caliperCA.Registrar, caReg)
		caliperCAs[name] = caliperCA
	}

	return caliperCAs
}

func (c ConnProfile) orgs2caliper(orgMAP map[string]networkspec.Organization) map[string]networkspec.CaliperOrganization {
	caliperOrgs := make(map[string]networkspec.CaliperOrganization)
	for o := range orgMAP {
		org := orgMAP[o]
		caliperOrg := networkspec.CaliperOrganization{MSPID: org.MSPID, Peers: org.Peers, CertificateAuthorities: org.CertificateAuthorities, AdminPrivateKey: org.AdminPrivateKey, SignedCert: org.SignedCert}
		caliperOrgs[o] = caliperOrg
	}

	return caliperOrgs
}

func (c ConnProfile) connprofile2caliper() CaliperConnProfile {
	return CaliperConnProfile{
		Orderers:      c.orderers2caliper(c.Orderers),
		Peers:         c.peers2caliper(c.Peers),
		CA:            c.ca2caliper(c.CA),
		Organizations: c.orgs2caliper(c.Organizations),
		Config:        c.Config,
	}
}

func (c ConnProfile) clientCaliper(orgName string) (map[string]networkspec.CaliperClient, error) {
	var client networkspec.CaliperClient

	client.Client.Organization = orgName
	client.Client.CredentialStore.Path = fmt.Sprintf("/tmp/%s", orgName)
	client.Client.CredentialStore.CryptoStore.Path = fmt.Sprintf("/tmp/%s", orgName)
	client.Client.Conenction.Timeout.Peer.Endorser = 300
	client.Client.Conenction.Timeout.Peer.EventHub = 600
	client.Client.Conenction.Timeout.Peer.EventReg = 300
	client.Client.Conenction.Timeout.Orderer = 300
	peerOrgsPath := paths.PeerOrgsDir(c.Config.ArtifactsLocation)

	//privateKey
	userMspDir := paths.JoinPath(peerOrgsPath, fmt.Sprintf("%s/users/User1@%s/msp", orgName, orgName))

	keystorePath := paths.JoinPath(userMspDir, "keystore")
	privKeyFile, err := ioutil.ReadDir(keystorePath)
	if err != nil {
		return nil, err
	}
	privKeyPath := paths.JoinPath(keystorePath, fmt.Sprintf("%s", privKeyFile[0].Name()))
	cert, err := c.GetCertificateFromFile(privKeyPath)
	if err != nil {
		return nil, err
	}
	client.Client.ClientPrivateKey.Pem = cert

	//signedCerts
	signCertsPath := paths.JoinPath(userMspDir, "signcerts")
	signCertsFile, err := ioutil.ReadDir(signCertsPath)
	if err != nil {
		return nil, err
	}
	userCertsPath := paths.JoinPath(signCertsPath, fmt.Sprintf("%s", signCertsFile[0].Name()))
	cert, err = c.GetCertificateFromFile(userCertsPath)
	if err != nil {
		return nil, err
	}
	client.Client.ClientSignedCert.Pem = cert
	clientName := fmt.Sprintf("client-%s", orgName)
	clients := make(map[string]networkspec.CaliperClient)
	clients[clientName] = client

	return clients, nil
}

func (c ConnProfile) channelCaliper(cprofile CaliperConnProfile) map[string]networkspec.CaliperChannel {
	channels := make(map[string]networkspec.CaliperChannel)

	// for each channel
	for i := 0; i < c.Config.NumChannels; i++ {
		//orderers
		orderers := make([]string, 0, len(cprofile.Orderers))
		for orderer := range cprofile.Orderers {
			orderers = append(orderers, orderer)
		}

		//peers
		peers := make(map[string]networkspec.CaliperChannelPeer, len(cprofile.Peers))
		for peer := range cprofile.Peers {
			peers[peer] = networkspec.CaliperChannelPeer{EventSource: true}
		}

		//chaincodes
		chaincodes := make([]networkspec.ChaincodeID, 0, len(c.Config.ChaincodeIDs))
		for _, chaincode := range c.Config.ChaincodeIDs {
			cc := networkspec.ChaincodeID{
				Id:      chaincode.Id,
				Version: chaincode.Version,
			}
			chaincodes = append(chaincodes, cc)
		}

		channel := networkspec.CaliperChannel{
			Created:    true,
			Chaincodes: chaincodes,
			Orderers:   orderers,
			Peers:      peers,
		}

		chName := c.Config.ChannelPrefix
		if chName == "" {
			chName = "testorgschannel"
		}
		chName = fmt.Sprintf("%s%d", chName, i)
		channels[chName] = channel
	}

	return channels
}

func (c ConnProfile) GenerateCaliperConnProfilePerOrg(orgName string) error {

	var err error
	path := paths.CaliperConnectionProfilesDir(c.Config.ArtifactsLocation)
	fileName := paths.JoinPath(path, fmt.Sprintf("caliper_connection_profile_%s.yaml", orgName))

	cp := ConnProfile{
		Organizations: c.Organizations,
		Orderers:      c.Orderers,
		Peers:         c.Peers,
		CA:            c.CA,
	}
	cprofile := cp.connprofile2caliper()

	caliper := networkspec.Caliper{
		Blockchain: "fabric",
	}

	clients, err := c.clientCaliper(orgName)
	if err != nil {
		logger.ERROR("Failed to get the clients for Caliper connection profile")
		return err
	}

	channels := c.channelCaliper(cprofile)

	ccp := networkspec.CaliperConnectionProfile{
		Caliper:       caliper,
		Clients:       clients,
		Channels:      channels,
		Organizations: cprofile.Organizations,
		Orderers:      cprofile.Orderers,
		Peers:         cprofile.Peers,
		CA:            cprofile.CA,
	}
	yamlBytes, err := yaml.Marshal(ccp)
	if err != nil {
		logger.ERROR("Failed to convert the connection profile struct to bytes")
		return err
	}
	tls := fmt.Sprintf("mutual-tls: %s\n", c.Config.TLS)
	yamlBytes = append([]byte(tls), yamlBytes...)
	yamlBytes = append([]byte("version: \"1.0\" \nname: My network \n"), yamlBytes...)
	err = ioutil.WriteFile(fileName, yamlBytes, 0644)
	if err != nil {
		logger.ERROR("Failed to write content to ", fileName)
		return err
	}
	logger.INFO("Successfully created ", fileName)
	return nil
}

//GetCertificateFromFile -- to get the certificate data from the file
func (c ConnProfile) GetCertificateFromFile(certPath string) (string, error) {

	var err error

	fileContent, err := ioutil.ReadFile(certPath)
	if err != nil {
		logger.ERROR("Failed to read file content")
		return "", err
	}
	return string(fileContent), err
}
