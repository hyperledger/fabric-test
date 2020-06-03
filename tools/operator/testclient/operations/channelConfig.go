package operations

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//ChannelUIObject --
type ChannelUIObject struct {
	TransType            string         `json:"transType,omitempty"`
	TLS                  string         `json:"TLS,omitempty"`
	ChannelOpt           ChannelOptions `json:"channelOpt,omitempty"`
	ConnProfilePath      string         `json:"ConnProfilePath,omitempty"`
	OrdererSystemChannel string         `json:"ordererSystemChannel,omitempty"`
}

//ChannelOptions --
type ChannelOptions struct {
	Name      string   `json:"name,omitempty"`
	ChannelTX string   `json:"channelTX,omitempty"`
	Action    string   `json:"action,omitempty"`
	OrgName   []string `json:"orgName,omitempty"`
}

//ChannelConfigs -- To create channel objects based on create, join and anchorpeer and perform the channel configs and to update connection profile
func (c ChannelUIObject) ChannelConfigs(config inputStructs.Config, tls, action string) error {

	var err error
	var channelUIObjects, channelObjects []ChannelUIObject
	var configObjects []inputStructs.Channel
	var channelConfigObjects []interface{}
	switch action {
	case "create":
		configObjects = config.CreateChannel
	case "join":
		configObjects = config.JoinChannel
	case "anchorpeer":
		configObjects = config.AnchorPeerUpdate
	}
	for i := 0; i < len(configObjects); i++ {
		channelObjects = c.generateChannelUIObjects(configObjects[i], config.Organizations, tls, action, config.OrdererSystemChannel)
		if len(channelObjects) > 0 {
			channelUIObjects = append(channelUIObjects, channelObjects...)
		}
		channelConfigObjects = append(channelConfigObjects, &configObjects[i])
	}
	err = c.doChannelAction(channelUIObjects)
	if err != nil {
		return err
	}
	var connProfileObject connectionprofile.ConnProfile
	err = connProfileObject.UpdateConnectionProfiles(channelConfigObjects, config.Organizations, action)
	if err != nil {
		return err
	}
	return nil
}

//generateChannelUIObjects -- To generate channel user input objects for all the channels
func (c ChannelUIObject) generateChannelUIObjects(channel inputStructs.Channel, organizations []inputStructs.Organization, tls, action, ordererChannel string) []ChannelUIObject {

	var channelObjects []ChannelUIObject
	if channel.ChannelPrefix != "" && channel.NumChannels > 0 {
		channelObjects = c.createChannelObjectIfChanPrefix(channel, organizations, tls, action, ordererChannel)
		return channelObjects
	}
	orgNames := strings.Split(channel.Organizations, ",")
	channelObjects = c.createChannelConfigObjects(orgNames, channel.ChannelName, channel.ChannelTxPath, channel.AnchorPeerTxPath, tls, action, ordererChannel, organizations)
	return channelObjects
}

//createChannelConfigObjects -- To create channel object per channel
func (c ChannelUIObject) createChannelConfigObjects(orgNames []string, channelName, channelTxPath, anchorPeerTxPath, tls, action, ordererChannel string, organizations []inputStructs.Organization) []ChannelUIObject {

	var channelObjects []ChannelUIObject
	var channelOpt ChannelOptions
	if action != "join" && len(orgNames) > 1 {
		orgNames = []string{orgNames[0]}
	}
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		if action == "anchorpeer" {
			action = "update"
			channelTxPath = anchorPeerTxPath
		}
		channelOpt = ChannelOptions{
			Name:      channelName,
			Action:    action,
			OrgName:   []string{orgName},
			ChannelTX: channelTxPath,
		}
		c = ChannelUIObject{
			TransType:            "Channel",
			TLS:                  tls,
			ConnProfilePath:      paths.GetConnProfilePath([]string{orgName}, organizations),
			ChannelOpt:           channelOpt,
			OrdererSystemChannel: ordererChannel,
		}
		channelObjects = append(channelObjects, c)
	}
	return channelObjects
}

//createChannelObjectIfChanPrefix -- To create channel objects of channel prefix and number of channels is given
func (c ChannelUIObject) createChannelObjectIfChanPrefix(channel inputStructs.Channel, organizations []inputStructs.Organization, tls, action, ordererChannel string) []ChannelUIObject {

	var channelUIObjects []ChannelUIObject
	var channelTxPath, anchopPeerTxPath, channelName string
	if action != "anchorpeer" {
		for j := 0; j < channel.NumChannels; j++ {
			channelName = fmt.Sprintf("%s%s", channel.ChannelPrefix, strconv.Itoa(j))
			channelTxPath = paths.JoinPath(channel.ChannelTxPath, fmt.Sprintf("%s.tx", channelName))
			orgNames := strings.Split(channel.Organizations, ",")
			channelobjects := c.createChannelConfigObjects(orgNames, channelName, channelTxPath, anchopPeerTxPath, tls, action, ordererChannel, organizations)
			channelUIObjects = append(channelUIObjects, channelobjects...)
		}
		return channelUIObjects
	}
	for j := 0; j < channel.NumChannels; j++ {
		channelName = fmt.Sprintf("%s%s", channel.ChannelPrefix, strconv.Itoa(j))
		anchopPeerTxPath = paths.JoinPath(channel.AnchorPeerTxPath, fmt.Sprintf("%s%sanchor.tx", channelName, channel.Organizations))
		orgNames := strings.Split(channel.Organizations, ",")
		anchorPeerObjects := c.createChannelConfigObjects(orgNames, channelName, channelTxPath, anchopPeerTxPath, tls, action, ordererChannel, organizations)
		channelUIObjects = append(channelUIObjects, anchorPeerObjects...)
	}
	return channelUIObjects
}

func (c ChannelUIObject) channelConfig(action, channelName string, args []string, wg *sync.WaitGroup) error {
	defer wg.Done()
	_, err := networkclient.ExecuteCommand("node", args, true)
	if err != nil {
		logger.ERROR(fmt.Sprintf("Failed to perform %s action on %s channel: %v", action, channelName, err))
		os.Exit(1)
	}
	return nil
}

//doChannelAction -- To perform channel operations including create, anchorpeer update and join channel
func (c ChannelUIObject) doChannelAction(channelUIObjects []ChannelUIObject) error {

	var err error
	var jsonObject []byte
	var wg sync.WaitGroup
	pteMainPath := paths.PTEPath()
	var args []string
	for i, channelObject := range channelUIObjects {
		jsonObject, err = json.Marshal(channelObject)
		if err != nil {
			return err
		}
		startTime := time.Now().String()
		args = []string{pteMainPath, strconv.Itoa(i), string(jsonObject), startTime}
		wg.Add(1)
		go c.channelConfig(channelObject.ChannelOpt.Action, channelObject.ChannelOpt.Name, args, &wg)
	}
	wg.Wait()
	return nil
}
