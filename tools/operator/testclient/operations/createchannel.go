package operations

import (
	"encoding/json"
	"fmt"
	"strings"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/helper"
)

//CreateChannelObject --
type CreateChannelObject struct {
	TransType       string         `json:"transType,omitempty"`
	TLS             string         `json:"TLS,omitempty"`
	ChannelOpt      ChannelOptions `json:"channelOpt,omitempty"`
	ConnProfilePath string         `json:"ConnProfilePath,omitempty"`
}

//ChannelOptions --
type ChannelOptions struct {
	Name      string   `json:"name,omitempty"`
	ChannelTX string   `json:"channelTX,omitempty"`
	Action    string   `json:"action,omitempty"`
	OrgName   []string `json:"orgName,omitempty"`
}

//CreateChannels -- To create a channel
func (c CreateChannelObject) CreateChannels(config helper.Config, tls string) error {

	var err error
	var createChannelObjects, channelObjects []CreateChannelObject
	for i := 0; i < len(config.CreateChannel); i++ {
		channelObjects = c.generateCreateChannelObjects(config.CreateChannel[i], config.Organizations, tls, config.CreateChannel[i].ChannelTxPath)
		if len(channelObjects) > 0 {
			createChannelObjects = append(createChannelObjects, channelObjects...)
		}
	}
	err = c.createChannel(createChannelObjects)
	if err != nil {
		return err
	}
	return nil
}

func (c CreateChannelObject) generateCreateChannelObjects(channel helper.Channel, organizations []helper.Organization, tls, channelTx string) []CreateChannelObject {

	var channelObjects []CreateChannelObject
	if channel.ChannelPrefix != "" && channel.NumChannels > 0 {
		channelObjects = c.createChannelObjectIfChanPrefix(channel, organizations, tls)
		return channelObjects
	}
	orgNames := strings.Split(channel.Organizations, ",")
	channelObjects = c.createChannelObjects(orgNames, channel.ChannelName, channel.ChannelTxPath, tls, organizations)
	return channelObjects
}

func (c CreateChannelObject) createChannelObjects(orgNames []string, channelName, channelTxPath, tls string, organizations []helper.Organization) []CreateChannelObject {

	var channelObjects []CreateChannelObject
	var channelOpt ChannelOptions
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		channelOpt = ChannelOptions{Name: channelName, Action: "create", OrgName: []string{orgName}, ChannelTX: channelTxPath}
		c = CreateChannelObject{TransType: "Channel", TLS: tls, ConnProfilePath: paths.GetConnProfilePathForOrg(orgName, organizations), ChannelOpt: channelOpt}
		channelObjects = append(channelObjects, c)
	}
	return channelObjects
}

func (c CreateChannelObject) createChannelObjectIfChanPrefix(channel helper.Channel,organizations []helper.Organization, tls string) []CreateChannelObject {

	var createChannelObjects []CreateChannelObject
	var channelTxPath, channelName string
	for j := 0; j < channel.NumChannels; j++ {
		channelName = fmt.Sprintf("%s%s", channel.ChannelPrefix, strconv.Itoa(j))
		channelTxPath = paths.JoinPath(channel.ChannelTxPath, fmt.Sprintf("%s.tx", channelName))
		orgNames := strings.Split(channel.Organizations, ",")
		channelobjects := c.createChannelObjects(orgNames, channelName, channelTxPath, tls, organizations)
		createChannelObjects = append(createChannelObjects, channelobjects...)
	}
	return createChannelObjects
}

func (c CreateChannelObject) createChannel(createChannelObjects []CreateChannelObject) error {

	var err error
	var jsonObject []byte
	pteMainPath := paths.PTEPath()
	for i := 0; i < len(createChannelObjects); i++ {
		jsonObject, err = json.Marshal(createChannelObjects[i])
		if err != nil {
			return err
		}
		startTime := fmt.Sprintf("%s", time.Now())
		args := []string{pteMainPath, strconv.Itoa(i), string(jsonObject), startTime}
		_, err = networkclient.ExecuteCommand("node", args, true)
		if err != nil {
			return err
		}
	}
	return nil
}
