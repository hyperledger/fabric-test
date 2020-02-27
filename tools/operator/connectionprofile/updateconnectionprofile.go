package connectionprofile

import (
	"fmt"
	"io/ioutil"
	"strings"
	"errors"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	yaml "gopkg.in/yaml.v2"
)

//UpdateConnectionProfiles -- To update connection profiles
func (c ConnProfile) UpdateConnectionProfiles(configObjects []interface{}, organizations []inputStructs.Organization, action string) error {

	var err error
	for key := range configObjects {
		err = c.updateConnectionProfilePerChannel(configObjects[key], organizations, action)
		if err != nil {
			return err
		}
	}
	return err
}

//updateConnectionProfilePerChannel -- To update connection profile per channel
func (c ConnProfile) updateConnectionProfilePerChannel(inputObject interface{}, organizations []inputStructs.Organization, action string) error {

	var err error
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
			err = c.updateConnectionProfilesIfChanPrefix(organizations, numChannels, action, orgName, channelPrefix, chainCodeID)
			if err != nil {
				return err
			}
		} else {
			err = c.updateConnectionProfilePerOrg(organizations, action, orgName, channelName, chainCodeID)
			if err != nil {
				return err
			}
		}
	}
	return err
}

//updateConnectionProfilePerOrg -- To update connection profile per an organization
func (c ConnProfile) updateConnectionProfilePerOrg(organizations []inputStructs.Organization, inputArgs ...string) error {

	var err error
	connectionProfilesList := []string{}
	if len(inputArgs) < 3 || len(inputArgs) > 4{
		return errors.New("Incorrect number of arguments passed")
	}
	action, orgName, channelName := inputArgs[0], inputArgs[1], inputArgs[2]
	connProfilePath := paths.GetConnProfilePath([]string{orgName}, organizations)
	connectionProfilesList = append(connectionProfilesList, connProfilePath)
	if !strings.HasSuffix(connProfilePath, ".yaml") && !strings.HasSuffix(connProfilePath, ".yml"){
		connectionProfilesList = []string{}
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			logger.ERROR("ConnectionProfile: Failed to get the current directory, connProfilePath: ", connProfilePath)
			return err
		}
		filesList, err := ioutil.ReadDir(paths.JoinPath(currentDir, connProfilePath))
		if err != nil{
			logger.ERROR("Failed to read the connection profiles directory, connProfilePath: ", connProfilePath)
			return err
		}
		for _, file := range filesList {
			connProfileFilePath := paths.JoinPath(connProfilePath, file.Name())
			_, connProfileObject, err := c.getComponentsListFromConnProfile(connProfileFilePath, "")
			if err != nil{
				logger.ERROR("ConnectionProfile: Failed to read the connection profile, connProfilePath: ", connProfileFilePath)
			}
			if connProfileObject.Organizations[orgName].Name == orgName{
				connectionProfilesList = append(connectionProfilesList, connProfileFilePath)

			}
		}
	}
	for _, file := range connectionProfilesList{
		switch action {
		case "create":
			err = c.updateConnectionProfile(file, channelName, "orderer")
		case "join":
			err = c.updateConnectionProfile(file, channelName, "peer")
		case "instantiate", "upgrade":
			err = c.updateConnectionProfile(file, channelName, "chaincodes", inputArgs[len(inputArgs)-1])
		}
	}
	if err != nil {
		logger.ERROR("Failed to update connection profile after channel ", action)
		return err
	}
	return err
}

//updateConnectionProfilesIfChanPrefix -- To update connection profiles if channel prefix and number of channels are provided
func (c ConnProfile) updateConnectionProfilesIfChanPrefix(organizations []inputStructs.Organization, numChannels int, inputArgs ...string) error {

	var err error
	var channelName string
	action, orgName, channelPrefix := inputArgs[0], inputArgs[1], inputArgs[2]
	for i := 0; i < numChannels; i++ {
		channelName = fmt.Sprintf("%s%d", channelPrefix, i)
		err = c.updateConnectionProfilePerOrg(organizations, action, orgName, channelName, inputArgs[2])
		if err != nil {
			return err
		}
	}
	return err
}

//updateConnectionProfile -- To update connection profile
func (c ConnProfile) updateConnectionProfile(inputArgs ...string) error {

	connProfileFilePath, channelName, componentType := inputArgs[0], inputArgs[1], inputArgs[2]
	if !(strings.HasPrefix(connProfileFilePath, "/")) {
		currentDir, _ := paths.GetCurrentDir()
		connProfileFilePath = paths.JoinPath(currentDir, connProfileFilePath)
	}
	componentsList, connProfileObject, err := c.getComponentsListFromConnProfile(connProfileFilePath, componentType)
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
		connProfileObject.Channels[channelName] = networkspec.Channel{Orderers: channelObject.Orderers, Peers: channelObject.Peers, Chaincodes: []string{inputArgs[len(inputArgs)-1]}}
	}
	yamlBytes, err := yaml.Marshal(connProfileObject)
	yamlBytes = append([]byte("version: 1.0 \nname: My network \ndescription: Connection Profile for Blockchain Network \n"), yamlBytes...)
	err = ioutil.WriteFile(connProfileFilePath, yamlBytes, 0644)
	if err != nil {
		logger.ERROR("Failed to update connection profile")
		return err
	}
	logger.INFO("Successfully update connection profile ", connProfileFilePath)
	return err
}

//getComponentsListFromConnProfile -- To get the list of peers/orderers from the connection profile file
func (c ConnProfile) getComponentsListFromConnProfile(connProfileFilePath, componentType string) ([]string, networkspec.ConnectionProfile, error) {

	var componentsList []string
	var err error
	var connectionProfileObject networkspec.ConnectionProfile
	yamlFile, err := ioutil.ReadFile(connProfileFilePath)
	if err != nil {
		logger.ERROR("Failed to read connection profile")
		return componentsList, connectionProfileObject, err
	}
	err = yaml.Unmarshal(yamlFile, &connectionProfileObject)
	if err != nil {
		logger.ERROR("Failed to unmarshall yaml file")
		return componentsList, connectionProfileObject, err
	}
	if componentType == "orderer" {
		for key := range connectionProfileObject.Orderers {
			componentsList = append(componentsList, key)
		}
		return componentsList, connectionProfileObject, nil
	}
	for key := range connectionProfileObject.Peers {
		componentsList = append(componentsList, key)
	}
	return componentsList, connectionProfileObject, nil
}
