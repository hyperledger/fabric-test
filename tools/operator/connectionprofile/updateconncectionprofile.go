package connectionprofile

import (
	"fmt"
	"strings"
	"io/ioutil"


	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	yaml "gopkg.in/yaml.v2"
)

//UpdateConnectionProfiles -- to update connection profile
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

func (c ConnProfile) updateConnectionProfilePerChannel(inputObject interface{}, organizations []inputStructs.Organization, action string) error {

	var err error
	var channelName, channelPrefix string
	var numChannels int
	configObject, _ := inputObject.(*inputStructs.Channel)
	orgNames := strings.Split(configObject.Organizations, ",")
	channelName, channelPrefix, numChannels = configObject.ChannelName, configObject.ChannelPrefix, configObject.NumChannels
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		if configObject.ChannelPrefix != "" {
			err = c.updateConnectionProfilesIfChanPrefix( organizations, numChannels, action, orgName, channelPrefix)
			if err != nil {
				return err
			}
		} else {
			err = c.updateConnectionProfilePerOrg(organizations, action, orgName, channelName)
			if err != nil {
				return err
			}
		}
	}
	return err
}

func (c ConnProfile) updateConnectionProfilePerOrg(organizations []inputStructs.Organization, action, orgName, channelName string) error {

	var err error
	connProfilePath := paths.GetConnProfilePathForOrg(orgName, organizations)
	if action == "create" {
		err = c.updateConnectionProfile(connProfilePath, channelName, "orderer")
	} else if action == "join" {
		err = c.updateConnectionProfile(connProfilePath, channelName, "peer")
	}
	if err != nil {
		logger.ERROR("Failed to update connection profile after channel ", action)
		return err
	}
	return err
}

func (c ConnProfile) updateConnectionProfilesIfChanPrefix(organizations []inputStructs.Organization, numChannels int, action, orgName, channelPrefix string) error {

	var err error
	var channelName string
	for i := 0; i < numChannels; i++ {
		channelName = fmt.Sprintf("%s%d", channelPrefix, i)
		err = c.updateConnectionProfilePerOrg(organizations, action, orgName, channelName)
		if err != nil {
			return err
		}
	}
	return err
}


func (c ConnProfile) updateConnectionProfile(connProfileFilePath, channelName, componentType string) error {

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
	}
	yamlBytes, err := yaml.Marshal(connProfileObject)
	yamlBytes = append([]byte("version: 1.0 \nname: My network \ndescription: Connection Profile for Blockchain Network \n"), yamlBytes...)
	err = ioutil.WriteFile(connProfileFilePath, yamlBytes, 0644)
	if err != nil {
		logger.ERROR("Failed to update connection profile")
		return err
	}
	return err
}

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