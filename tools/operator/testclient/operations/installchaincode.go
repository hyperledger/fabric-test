package operations

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//InstallCCUIObject --
type InstallCCUIObject struct {
	SDK             string             `json:"sdk,omitempty"`
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
	i = InstallCCUIObject{SDK: ccObject.SDK, TransType: "install", TLS: tls, ChainCodeVer: ccObject.ChainCodeVersion, ChainCodeID: ccObject.ChainCodeName}
	orgNames := strings.Split(ccObject.Organizations, ",")
	channelOpt = ChannelOptions{OrgName: orgNames}
	deployOpt = InstallCCDeployOpt{ChainCodePath: ccObject.ChainCodePath, Language: ccObject.Language}
	deployOpt.MetadataPath = ccObject.MetadataPath
	i.DeployOpt = deployOpt
	i.ChannelOpt = channelOpt
	i.ConnProfilePath = paths.GetConnProfilePath(orgNames, organizations)
	installCCObjects = append(installCCObjects, i)
	return installCCObjects
}

//SetEnvForCLI -- sets environment variables for running peer cli commands
func SetEnvForCLI(orgName, connProfilePath, tls, currentDir string) error {

	var tlsNetwork string
	mspID, err := GetMSPIDForOrg(connProfilePath, orgName)
	if err != nil {
		return err
	}

	if tls == "clientauth" {
		tlsNetwork = "true"
	} else {
		tlsNetwork = "false"
	}

	os.Setenv("CORE_PEER_LOCALMSPID", mspID)
	os.Setenv("CORE_PEER_TLS_ENABLED", tlsNetwork)
	os.Setenv("CORE_PEER_MSPCONFIGPATH", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/users/Admin@%s/msp", currentDir, orgName, orgName))
	os.Setenv("CORE_PEER_TLS_ROOTCERT_FILE", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/peer0-%s.%s/tls/ca.crt", currentDir, orgName, orgName, orgName))
	return nil
}

//packageCC -- package cc using cli
func (i InstallCCUIObject) packageCC(installObject InstallCCUIObject) error {

	currentDir, err := paths.GetCurrentDir()
	if err != nil {
		return err
	}
	err = SetEnvForCLI(installObject.ChannelOpt.OrgName[0], installObject.ConnProfilePath, installObject.TLS, currentDir)
	if err != nil {
		return err
	}

	args := []string{"lifecycle",
		"chaincode",
		"package",
		"cc.tgz",
		"--path", installObject.DeployOpt.ChainCodePath,
		"--label", fmt.Sprintf("%s_%s", installObject.ChainCodeID, installObject.ChainCodeVer)}

	_, err = networkclient.ExecuteCommand("peer", args, true)
	if err != nil {
		return err
	}
	return err
}

//installCCusingCLI -- installing cc using cli
func (i InstallCCUIObject) installCCusingCLI(installObject InstallCCUIObject) error {

	orgName := installObject.ChannelOpt.OrgName[0]
	currentDir, err := paths.GetCurrentDir()
	if err != nil {
		return err
	}
	err = SetEnvForCLI(orgName, installObject.ConnProfilePath, installObject.TLS, currentDir)
	if err != nil {
		return err
	}

	args := []string{"lifecycle",
		"chaincode",
		"install",
		"cc.tgz",
		"--peerAddresses", "127.0.0.1:31000",
		"--tlsRootCertFiles", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/peer0-%s.%s/tls/ca.crt", currentDir, orgName, orgName, orgName),
		// "--connectionProfile",
		// installObject.ConnProfilePath,
	}

	if installObject.TLS == "clientauth" {
		args = append(args, "--tls")
	}
	_, err = networkclient.ExecuteCommand("peer", args, true)
	if err != nil {
		return err
	}
	return err
}

//installCC -- To install chaincode
func (i InstallCCUIObject) installCC(installCCObjects []InstallCCUIObject) error {

	var err error
	var jsonObject []byte
	pteMainPath := paths.PTEPath()
	for j := 0; j < len(installCCObjects); j++ {
		if installCCObjects[j].SDK == "cli" {
			err = i.packageCC(installCCObjects[j])
			if err != nil {
				return err
			}
			err = i.installCCusingCLI(installCCObjects[j])
			if err != nil {
				return err
			}
		} else {
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
	}
	return err
}
