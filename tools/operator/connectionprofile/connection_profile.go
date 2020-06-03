package connectionprofile

import (
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	"gopkg.in/yaml.v2"
)

type ConnProfile struct {
	Config        networkspec.Config
	CA            map[string]networkspec.CertificateAuthority
	Peers         map[string]networkspec.Peer
	Orderers      map[string]networkspec.Orderer
	Organizations map[string]networkspec.Organization
}

func (c ConnProfile) Organization(peerOrg networkspec.PeerOrganizations, caList []string) (networkspec.Organization, error) {
	peerOrgsLocation := paths.PeerOrgsDir(c.Config.ArtifactsLocation)
	path := paths.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/users/Admin@%s/msp/signcerts/Admin@%s-cert.pem", peerOrg.Name, peerOrg.Name, peerOrg.Name))
	cert, err := c.GetCertificateFromFile(path)
	if err != nil {
		return networkspec.Organization{}, err
	}
	organization := networkspec.Organization{
		AdminCert:              cert,
		CertificateAuthorities: caList,
		MSPID:                  peerOrg.MSPID,
		Name:                   peerOrg.Name,
	}
	organization.SignedCert.Pem = cert

	keystorePath := paths.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/users/Admin@%s/msp/keystore", peerOrg.Name, peerOrg.Name))

	privKeyFile, err := ioutil.ReadDir(keystorePath)
	if err != nil {
		return networkspec.Organization{}, err
	}
	privKeyPath := paths.JoinPath(keystorePath, privKeyFile[0].Name())
	cert, err = c.GetCertificateFromFile(privKeyPath)
	if err != nil {
		return networkspec.Organization{}, err
	}

	var peerList []string
	for peer := range c.Peers {
		peerList = append(peerList, peer)
	}
	organization.Peers = append(organization.Peers, peerList...)
	organization.PrivateKey = cert
	organization.AdminPrivateKey.Pem = cert
	return organization, nil
}

func (c ConnProfile) GenerateConnProfilePerOrg(orgName string) error {
	client := networkspec.Client{
		Organization: orgName,
	}
	client.Connection.Timeout.Peer.Endorser = 300
	client.Connection.Timeout.Peer.EventHub = 600
	client.Connection.Timeout.Peer.EventReg = 300
	client.Connection.Timeout.Orderer = 300
	cp := networkspec.ConnectionProfile{
		Description:   "Connection Profile for Blockchain Network",
		Name:          "My Network",
		Version:       "1.0",
		Client:        client,
		Organizations: c.Organizations,
		CA:            c.CA,
		Orderers:      c.Orderers,
		Peers:         c.Peers,
	}
	yamlBytes, err := yaml.Marshal(cp)
	if err != nil {
		logger.ERROR("Failed to marshal connection profile")
		return err
	}

	path := paths.ConnectionProfilesDir(c.Config.ArtifactsLocation)
	fileName := paths.JoinPath(path, fmt.Sprintf("connection_profile_%s.yaml", orgName))
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
	fileContent, err := ioutil.ReadFile(certPath)
	if err != nil {
		logger.ERROR("Failed to read file content")
		return "", err
	}
	return string(fileContent), nil
}

//UpdateConnectionProfiles -- To update connection profiles
func (c ConnProfile) UpdateConnectionProfiles(configObjects []interface{}, organizations []inputStructs.Organization, action string) error {
	for key := range configObjects {
		err := c.updateConnectionProfilePerChannel(configObjects[key], organizations, action)
		if err != nil {
			return err
		}
	}
	return nil
}

//updateConnectionProfilePerChannel -- To update connection profile per channel
func (c ConnProfile) updateConnectionProfilePerChannel(inputObject interface{}, organizations []inputStructs.Organization, action string) error {
	var channelName, channelPrefix, chainCodeID string
	var numChannels int
	var orgNames []string
	if action == "instantiate" || action == "upgrade" {
		configObject, _ := inputObject.(*inputStructs.InstantiateCC)
		channelName, channelPrefix, numChannels = configObject.ChannelName, configObject.ChannelPrefix, configObject.NumChannels
		chainCodeID = fmt.Sprintf("%s:%s", configObject.ChainCodeName, configObject.ChainCodeVersion)
		orgNames = strings.Split(configObject.Organizations, ",")
	} else {
		configObject, _ := inputObject.(*inputStructs.Channel)
		channelName, channelPrefix, numChannels = configObject.ChannelName, configObject.ChannelPrefix, configObject.NumChannels
		orgNames = strings.Split(configObject.Organizations, ",")
	}
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		if channelPrefix != "" {
			err := c.updateConnectionProfilesIfChanPrefix(organizations, numChannels, action, orgName, channelPrefix)
			if err != nil {
				return err
			}
		} else {
			err := c.updateConnectionProfilePerOrg(organizations, action, orgName, channelName, chainCodeID)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

//updateConnectionProfilePerOrg -- To update connection profile per an organization
func (c ConnProfile) updateConnectionProfilePerOrg(organizations []inputStructs.Organization, action, orgName, channelName, chaincodeID string) error {
	connProfilePath := paths.GetConnProfilePath([]string{orgName}, organizations)

	var connectionProfilesList []string
	connectionProfilesList = append(connectionProfilesList, connProfilePath)
	if !strings.HasSuffix(connProfilePath, ".yaml") && !strings.HasSuffix(connProfilePath, ".yml") {
		connectionProfilesList = []string{}
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			logger.ERROR("ConnectionProfile: Failed to get the current directory, connProfilePath: ", connProfilePath)
			return err
		}
		filesList, err := ioutil.ReadDir(paths.JoinPath(currentDir, connProfilePath))
		if err != nil {
			logger.ERROR("Failed to read the connection profiles directory, connProfilePath: ", connProfilePath)
			return err
		}
		for _, file := range filesList {
			connProfileFilePath := paths.JoinPath(connProfilePath, file.Name())
			_, connProfileObject, err := c.getComponentsListFromConnProfile(connProfileFilePath, "")
			if err != nil {
				logger.ERROR("ConnectionProfile: Failed to read the connection profile, connProfilePath: ", connProfileFilePath)
				return err
			}
			if connProfileObject.Organizations[orgName].Name == orgName {
				connectionProfilesList = append(connectionProfilesList, connProfileFilePath)

			}
		}
	}
	var err error
	for _, file := range connectionProfilesList {
		switch action {
		case "create":
			err = c.updateConnectionProfile(file, channelName, "orderer")
		case "join":
			err = c.updateConnectionProfile(file, channelName, "peer")
		case "instantiate", "upgrade":
			err = c.updateConnectionProfile(file, channelName, "chaincodes", chaincodeID)
		}
		if err != nil {
			logger.ERROR("Failed to update connection profile after channel ", action)
			return err
		}
	}

	return nil
}

//updateConnectionProfilesIfChanPrefix -- To update connection profiles if channel prefix and number of channels are provided
func (c ConnProfile) updateConnectionProfilesIfChanPrefix(organizations []inputStructs.Organization, numChannels int, action, orgName, channelPrefix string) error {
	var channelName string
	for i := 0; i < numChannels; i++ {
		channelName = fmt.Sprintf("%s%d", channelPrefix, i)
		err := c.updateConnectionProfilePerOrg(organizations, action, orgName, channelName, channelPrefix)
		if err != nil {
			return err
		}
	}
	return nil
}

//updateConnectionProfile -- To update connection profile
func (c ConnProfile) updateConnectionProfile(connProfilePath, channelName, componentType string, chaincodes ...string) error {
	if !(strings.HasPrefix(connProfilePath, "/")) {
		currentDir, _ := paths.GetCurrentDir()
		connProfilePath = paths.JoinPath(currentDir, connProfilePath)
	}
	componentsList, connProfileObject, err := c.getComponentsListFromConnProfile(connProfilePath, componentType)
	if err != nil {
		logger.ERROR("Failed to get the components list from the connection profile file")
		return err
	}
	switch componentType {
	case "orderer":
		connProfileObject.Channels[channelName] = networkspec.Channel{Orderers: componentsList}
	case "peer":
		channelObject := connProfileObject.Channels[channelName]
		connProfileObject.Channels[channelName] = networkspec.Channel{Orderers: channelObject.Orderers, Peers: componentsList}
	case "chaincodes":
		channelObject := connProfileObject.Channels[channelName]
		connProfileObject.Channels[channelName] = networkspec.Channel{
			Orderers:   channelObject.Orderers,
			Peers:      channelObject.Peers,
			Chaincodes: chaincodes,
		}
	}
	yamlBytes, err := yaml.Marshal(connProfileObject)
	err = ioutil.WriteFile(connProfilePath, yamlBytes, 0644)
	if err != nil {
		logger.ERROR("Failed to update connection profile")
		return err
	}
	logger.INFO("Successfully update connection profile ", connProfilePath)
	return err
}

//getComponentsListFromConnProfile -- To get the list of peers/orderers from the connection profile file
func (c ConnProfile) getComponentsListFromConnProfile(connProfileFilePath, componentType string) ([]string, networkspec.ConnectionProfile, error) {
	connectionProfileBytes, err := ioutil.ReadFile(connProfileFilePath)
	if err != nil {
		logger.ERROR("Failed to read connection profile")
		return nil, networkspec.ConnectionProfile{}, err
	}

	var connectionProfile networkspec.ConnectionProfile
	err = yaml.Unmarshal(connectionProfileBytes, &connectionProfile)
	if err != nil {
		logger.ERROR("Failed to unmarshall yaml file")
		return nil, networkspec.ConnectionProfile{}, err
	}

	var componentsList []string
	if componentType == "orderer" {
		for key := range connectionProfile.Orderers {
			componentsList = append(componentsList, key)
		}
		return componentsList, connectionProfile, nil
	}
	for key := range connectionProfile.Peers {
		componentsList = append(componentsList, key)
	}
	return componentsList, connectionProfile, nil
}
