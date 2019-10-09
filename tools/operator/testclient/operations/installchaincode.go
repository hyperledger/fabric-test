package operations

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//InstallCCUIObject --
type InstallCCUIObject struct {
	TransType       string             `json:"transType,omitempty"`
	TLS             string             `json:"TLS,omitempty"`
	ChainCodeID     string             `json:"chaincodeID,omitempty"`
	ChainCodeVer    string             `json:"chaincodeVer,omitempty"`
	ChannelOpt      ChannelOptions     `json:"channelOpt,omitempty"`
	DeployOpt       InstallCCDeployOpt `json:"deploy,omitempty"`
	ConnProfilePath string             `json:"ConnProfilePath,omitempty"`
}

//InstallCCDeployOpt --
type InstallCCDeployOpt struct {
	ChainCodePath string `json:"chaincodePath,omitempty"`
	MetadataPath  string `json:"metadataPath,omitempty"`
	Language      string `json:"language,omitempty"`
}

//InstallCC -- To install chaincode with the chaincode objects created
func (i InstallCCUIObject) InstallCC(config inputStructs.Config, tls string) error {

	var installCCObjects []InstallCCUIObject
	for index := 0; index < len(config.InstallCC); index++ {
		ccObjects := i.createInstallCCObjects(config.InstallCC[index], config.Organizations, tls)
		installCCObjects = append(installCCObjects, ccObjects...)
	}
	err := i.installCC(installCCObjects)
	if err != nil {
		return err
	}
	return nil
}

//createInstallCCObjects -- To create chaincode objects for install
func (i InstallCCUIObject) createInstallCCObjects(ccObject inputStructs.InstallCC, organizations []inputStructs.Organization, tls string) []InstallCCUIObject {

	var installCCObjects []InstallCCUIObject
	var channelOpt ChannelOptions
	var deployOpt InstallCCDeployOpt
	i = InstallCCUIObject{TransType: "install", TLS: tls, ChainCodeVer: ccObject.ChainCodeVersion, ChainCodeID: ccObject.ChainCodeName}
	orgNames := strings.Split(ccObject.Organizations, ",")
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		channelOpt = ChannelOptions{OrgName: []string{orgName}}
		deployOpt = InstallCCDeployOpt{ChainCodePath: ccObject.ChainCodePath, Language: ccObject.Language}
		deployOpt.MetadataPath = ccObject.MetadataPath
		i.DeployOpt = deployOpt
		i.ChannelOpt = channelOpt
		i.ConnProfilePath = paths.GetConnProfilePathForOrg(orgName, organizations)
		installCCObjects = append(installCCObjects, i)
	}
	return installCCObjects
}

//installCC -- To install chaincode
func (i InstallCCUIObject) installCC(installCCObjects []InstallCCUIObject) error {

	var err error
	var jsonObject []byte
	pteMainPath := paths.PTEPath()
	for j := 0; j < len(installCCObjects); j++ {
		jsonObject, err = json.Marshal(installCCObjects[j])
		if err != nil {
			return err
		}
		startTime := fmt.Sprintf("%s", time.Now())
		args := []string{pteMainPath, strconv.Itoa(j), string(jsonObject), startTime}
		_, err = networkclient.ExecuteCommand("node", args, true)
		if err != nil {
			return err
		}
	}
	return err
}
