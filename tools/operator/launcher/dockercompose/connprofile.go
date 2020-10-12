// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package dockercompose

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"sort"

	yaml "gopkg.in/yaml.v2"

	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

type ContainerPorts struct {
	Ports map[string][]struct {
		HostPort string `json:"HostPort,omitempty"`
	} `json:"Ports,omitempty"`
}

//GetDockerExternalIP -- To get the externalIP of a fabric component
func (d DockerCompose) GetDockerExternalIP() string {
	return "127.0.0.1"
}

//GetDockerServicePort -- To get the port number of a docker container
func (d DockerCompose) GetDockerServicePort(serviceName string, forHealth bool) (string, error) {

	var port string
	var containerPorts ContainerPorts
	var ports []string
	args := []string{"inspect", "-f", `"{{json .NetworkSettings}}"`, serviceName}
	output, err := networkclient.ExecuteCommand("docker", args, false)
	output = output[1 : len(output)-1]
	if err != nil {
		logger.ERROR("Failed to get the port number for service ", serviceName)
		return "", err
	}
	err = json.Unmarshal([]byte(output), &containerPorts)
	if err != nil {
		logger.ERROR("Failed to unmarshall containerPorts object")
	}
	for port = range containerPorts.Ports {
		ports = append(ports, port)
	}
	sort.Strings(ports)
	/* We can't do anything with the input file, as it doesn't have anything regarding the ports.
	   Suppose if we take the first orderer and see the ports that the orderer container is using
	   will be [8443/tcp 30000/tcp 7050/tcp]. They will not appear in the same orderer every time.
	   So I am sorting them in line number 50. After sorting, they will be in alphabetical order
	   [30000/tcp 7050/tcp 8443/tcp]. 8443 is the port that we use to verify the health.
	   It will be always at index 2.
	*/
	port = containerPorts.Ports[ports[0]][0].HostPort
	if forHealth {
		port = containerPorts.Ports[ports[2]][0].HostPort
	}
	return port, nil
}

//OrdererOrgs --
func (d DockerCompose) ordererOrgs(config networkspec.Config) (map[string]networkspec.Orderer, error) {

	orderers := make(map[string]networkspec.Orderer)
	artifactsLocation := config.ArtifactsLocation
	ordererOrgsPath := paths.OrdererOrgsDir(artifactsLocation)
	nodeIP := d.GetDockerExternalIP()
	protocol := "grpc"
	if config.TLS == "true" || config.TLS == "mutual" {
		protocol = "grpcs"
	}
	for org := 0; org < len(config.OrdererOrganizations); org++ {
		ordererOrg := config.OrdererOrganizations[org]
		orgName := ordererOrg.Name
		connProfile := connectionprofile.ConnProfile{}
		for i := 0; i < ordererOrg.NumOrderers; i++ {
			ordererName := fmt.Sprintf("orderer%d-%s", i, orgName)
			portNumber, err := d.GetDockerServicePort(ordererName, false)
			if err != nil {
				return orderers, err
			}
			metricsPortNumber, err := d.GetDockerServicePort(ordererName, true)
			if err != nil {
				return orderers, err
			}
			orderer := networkspec.Orderer{
				MSPID:      ordererOrg.MSPID,
				URL:        fmt.Sprintf("%s://%s:%s", protocol, nodeIP, portNumber),
				MetricsURL: fmt.Sprintf("http://%s:%s", nodeIP, metricsPortNumber),
			}
			orderer.GrpcOptions.SslTarget = ordererName
			tlscaCertPath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/orderers/%s.%s/msp/tlscacerts/tlsca.%s-cert.pem", orgName, ordererName, orgName, orgName))
			cert, err := connProfile.GetCertificateFromFile(tlscaCertPath)
			if err != nil {
				return orderers, err
			}
			orderer.TLSCACerts.Pem = cert
			adminCertPath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp/signcerts/Admin@%s-cert.pem", orgName, orgName, orgName))
			cert, err = connProfile.GetCertificateFromFile(adminCertPath)
			if err != nil {
				return orderers, err
			}
			orderer.AdminCert = cert
			keystorePath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp/keystore", orgName, orgName))

			privKeyFile, err := ioutil.ReadDir(keystorePath)
			if err != nil {
				return orderers, err
			}
			privKeyPath := paths.JoinPath(keystorePath, fmt.Sprintf("%s", privKeyFile[0].Name()))

			cert, err = connProfile.GetCertificateFromFile(privKeyPath)
			if err != nil {
				return orderers, err
			}
			orderer.PrivateKey = cert
			orderers[ordererName] = orderer
		}
	}
	return orderers, nil
}

//CertificateAuthorities --
func (d DockerCompose) certificateAuthorities(peerOrg networkspec.PeerOrganizations, config networkspec.Config) (map[string]networkspec.CertificateAuthority, error) {

	CAs := make(map[string]networkspec.CertificateAuthority)
	nodeIP := d.GetDockerExternalIP()
	protocol := "http"
	if config.TLS == "true" || config.TLS == "mutual" {
		protocol = "https"
	}
	artifactsLocation := config.ArtifactsLocation
	orgName := peerOrg.Name
	for i := 0; i < peerOrg.NumCA; i++ {
		caName := fmt.Sprintf("ca%d-%s", i, orgName)
		connProfile := connectionprofile.ConnProfile{}
		portNumber, err := d.GetDockerServicePort(caName, false)
		if err != nil {
			return CAs, err
		}
		tlscaCertPath := paths.JoinPath(paths.PeerOrgsDir(artifactsLocation), fmt.Sprintf("%s/ca/ca.%s-cert.pem", orgName, orgName))
		cert, err := connProfile.GetCertificateFromFile(tlscaCertPath)
		if err != nil {
			return CAs, err
		}
		CA := networkspec.CertificateAuthority{
			URL:    fmt.Sprintf("%s://%s:%s", protocol, nodeIP, portNumber),
			CAName: caName,
		}
		CA.TLSCACerts.Pem = cert
		CA.HTTPOptions.Verify = false
		CA.Registrar.EnrollID, CA.Registrar.EnrollSecret = "admin", "adminpw"
		CAs[fmt.Sprintf("ca%d", i)] = CA
	}
	return CAs, nil
}

//PeersPerOrganization --
func (d DockerCompose) peersPerOrganization(peerorg networkspec.PeerOrganizations, config networkspec.Config, extend bool) (map[string]networkspec.Peer, error) {

	nodeIP := d.GetDockerExternalIP()
	peerOrgsLocation := paths.PeerOrgsDir(config.ArtifactsLocation)
	peers := make(map[string]networkspec.Peer)
	protocol := "grpc"
	if config.TLS == "true" || config.TLS == "mutual" {
		protocol = "grpcs"
	}
	var totalPeers int
	var peerIndex int
	if extend {
		for _, org := range config.PeerOrganizations {
			if org.Name == peerorg.Name {
				totalPeers = org.NumPeers + peerorg.NumPeers
				peerIndex = org.NumPeers
			}
		}
	} else {
		totalPeers = peerorg.NumPeers
		peerIndex = 0
	}
	for i := peerIndex; i < totalPeers; i++ {
		connProfile := connectionprofile.ConnProfile{}
		peerName := fmt.Sprintf("peer%d-%s", i, peerorg.Name)
		portNumber, err := d.GetDockerServicePort(peerName, false)
		if err != nil {
			return peers, err
		}
		metricsPortNumber, err := d.GetDockerServicePort(peerName, true)
		if err != nil {
			return peers, err
		}
		peer := networkspec.Peer{
			URL:        fmt.Sprintf("%s://%s:%s", protocol, nodeIP, portNumber),
			MetricsURL: fmt.Sprintf("http://%s:%s", nodeIP, metricsPortNumber),
		}
		peer.GrpcOptions.SslTarget = peerName
		tlscaCertPath := paths.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/tlsca/tlsca.%s-cert.pem", peerorg.Name, peerorg.Name))
		cert, err := connProfile.GetCertificateFromFile(tlscaCertPath)
		if err != nil {
			return peers, err
		}
		peer.TLSCACerts.Pem = cert
		peers[peerName] = peer
	}
	return peers, nil
}

//GenerateConnectionProfiles -- To generate conenction profiles
func (d DockerCompose) GenerateConnectionProfiles(config networkspec.Config) error {

	orderersMap, err := d.ordererOrgs(config)
	if err != nil {
		return err
	}
	connProfile := connectionprofile.ConnProfile{Orderers: orderersMap, Config: config}
	for org := 0; org < len(config.PeerOrganizations); org++ {
		organizations := make(map[string]networkspec.Organization)
		peerorg := config.PeerOrganizations[org]
		peersMap, err := d.peersPerOrganization(peerorg, config, false)
		if err != nil {
			return err
		}
		connProfile.Peers = peersMap
		ca, err := d.certificateAuthorities(peerorg, config)
		if err != nil {
			return err
		}
		connProfile.CA = ca
		caList := make([]string, 0, len(ca))
		for k := range ca {
			caList = append(caList, k)
		}
		org, err := connProfile.Organization(peerorg, caList)
		if err != nil {
			logger.ERROR("Failed to get the organization details")
			return err
		}
		organizations[peerorg.Name] = org
		connProfile.Organizations = organizations
		err = connProfile.GenerateConnProfilePerOrg(peerorg.Name)
		if err != nil {
			logger.ERROR("Failed to generate connection profile")
			return err
		}

		err = connProfile.GenerateCaliperConnProfilePerOrg(peerorg.Name)
		if err != nil {
			logger.ERROR("Failed to generate caliper connection profile")
			return err
		}
	}
	return nil
}

func (d DockerCompose) UpdateConnectionProfilesToAddNewPeers(config networkspec.Config) error {

	var connectionProfileObject networkspec.ConnectionProfile
	for _, org := range config.AddPeersToOrganization {
		peersMap, err := d.peersPerOrganization(org, config, true)
		if err != nil {
			return err
		}
		path := paths.ConnectionProfilesDir(config.ArtifactsLocation)
		fileName := paths.JoinPath(path, fmt.Sprintf("connection_profile_%s.yaml", org.Name))
		yamlFile, err := ioutil.ReadFile(fileName)
		if err != nil {
			logger.ERROR("Failed to read connection profile")
			return err
		}
		err = yaml.Unmarshal(yamlFile, &connectionProfileObject)
		if err != nil {
			logger.ERROR("Failed to unmarshall yaml file")
			return err
		}
		peers := connectionProfileObject.Peers
		orgPeers := connectionProfileObject.Organizations[org.Name].Peers
		for peerName, peerConfig := range peersMap {
			orgPeers = append(orgPeers, peerName)
			peers[peerName] = peerConfig
		}
		orgObject := connectionProfileObject.Organizations[org.Name]
		orgObject.Peers = orgPeers
		connectionProfileObject.Organizations[org.Name] = orgObject
		connectionProfileObject.Peers = peers
		yamlBytes, err := yaml.Marshal(connectionProfileObject)
		if err != nil {
			logger.ERROR("Failed to convert the connection profile struct to bytes")
			return err
		}
		yamlBytes = append([]byte("version: 1.0 \nname: My network \ndescription: Connection Profile for Blockchain Network \n"), yamlBytes...)
		err = ioutil.WriteFile(fileName, yamlBytes, 0644)
		if err != nil {
			logger.ERROR("Failed to write content to ", fileName)
			return err
		}
		logger.INFO("Successfully updated ", fileName)
	}
	return nil
}
