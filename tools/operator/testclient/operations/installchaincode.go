package operations

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
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
	TargetPeers     []string           `json:"targetPeers,omitempty"`
}

//InstallCCDeployOpt --
type InstallCCDeployOpt struct {
	ChainCodePath string `json:"chaincodePath,omitempty"`
	MetadataPath  string `json:"metadataPath,omitempty"`
	Language      string `json:"language,omitempty"`
}

//InstallCC -- To install chaincode with the chaincode objects created
func (i InstallCCUIObject) InstallCC(config inputStructs.Config, tls string) error {

	// print action (in bold) and input
	fmt.Printf("\033[1m\nAction:install\nInput:\033[0m\n%s\n", spew.Sdump(config.InstallCC))

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
	orgNames := strings.Split(ccObject.Organizations, ",")
	targetPeers := strings.Split(ccObject.TargetPeers, ",")
	i = InstallCCUIObject{
		SDK:          ccObject.SDK,
		TransType:    "install",
		TLS:          tls,
		ChainCodeVer: ccObject.ChainCodeVersion,
		ChainCodeID:  ccObject.ChainCodeName,
		DeployOpt: InstallCCDeployOpt{
			ChainCodePath: ccObject.ChainCodePath,
			Language:      ccObject.Language,
			MetadataPath:  ccObject.MetadataPath,
		},
		ChannelOpt: ChannelOptions{
			OrgName: orgNames,
		},
		TargetPeers:     targetPeers,
		ConnProfilePath: paths.GetConnProfilePath(orgNames, organizations),
	}
	installCCObjects = append(installCCObjects, i)
	return installCCObjects
}

//SetEnvForCLI -- sets environment variables for running peer cli commands
func SetEnvForCLI(orgName, peerName, connProfilePath, tls, currentDir string) error {

	var tlsNetwork string
	connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName)
	if err != nil {
		return err
	}
	if tls == "clientauth" {
		tlsNetwork = "true"
	} else {
		tlsNetwork = "false"
	}
	mspID := connProfConfig.Organizations[orgName].MSPID
	os.Setenv("CORE_PEER_LOCALMSPID", mspID)
	os.Setenv("CORE_PEER_TLS_ENABLED", tlsNetwork)
	os.Setenv("CORE_PEER_MSPCONFIGPATH", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/users/Admin@%s/msp", currentDir, orgName, orgName))
	os.Setenv("CORE_PEER_TLS_ROOTCERT_FILE", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/%s.%s/tls/ca.crt", currentDir, orgName, peerName, orgName))
	return nil
}

//packageCC -- package cc using cli
func (i InstallCCUIObject) packageCC(installObject InstallCCUIObject) error {
	currentDir, err := paths.GetCurrentDir()
	if err != nil {
		return err
	}
	peerName := fmt.Sprintf("peer0-%s", installObject.ChannelOpt.OrgName[0])
	err = SetEnvForCLI(installObject.ChannelOpt.OrgName[0], peerName, installObject.ConnProfilePath, installObject.TLS, currentDir)
	if err != nil {
		return err
	}

	relativePath := fmt.Sprintf("%s/../../%s", currentDir, installObject.DeployOpt.ChainCodePath)
	chaincodePath, err := filepath.Abs(relativePath)
	if err != nil {
		return err
	}
	args := []string{"lifecycle",
		"chaincode",
		"package",
		"cc.tgz",
		"--lang", strings.ToLower(installObject.DeployOpt.Language),
		"--path", chaincodePath,
		"--label", fmt.Sprintf("%s_%s", installObject.ChainCodeID, installObject.ChainCodeVer)}
	_, err = networkclient.ExecuteCommand("peer", args, true)
	return err
}

//installCCusingCLI -- installing cc using cli
func (i InstallCCUIObject) installCCusingCLI(installObject InstallCCUIObject) error {

	for _, orgName := range installObject.ChannelOpt.OrgName {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			return err
		}
		var connProfilePath string
		if strings.Contains(installObject.ConnProfilePath, ".yaml") || strings.Contains(installObject.ConnProfilePath, ".json") {
			connProfilePath = installObject.ConnProfilePath
		} else {
			connProfilePath = fmt.Sprintf("%s/connection_profile_%s.yaml", installObject.ConnProfilePath, orgName)
		}
		for _, peerName := range installObject.TargetPeers {
			peerOrgName := strings.Split(peerName, "-")
			if peerOrgName[1] == orgName {
				connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName)
				if err != nil {
					return err
				}
				peerURL, err := url.Parse(connProfConfig.Peers[peerName].URL)
				if err != nil {
					logger.ERROR("Failed to get peer url from connection profile")
					return err
				}
				peerAddress := peerURL.Host
				err = SetEnvForCLI(orgName, peerName, connProfilePath, installObject.TLS, currentDir)
				if err != nil {
					return err
				}
				args := []string{"lifecycle",
					"chaincode",
					"install",
					"cc.tgz",
					"--peerAddresses",
					peerAddress,
					"--tlsRootCertFiles",
					fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/%s.%s/tls/ca.crt", currentDir, orgName, peerName, orgName),
				}
				if installObject.TLS == "clientauth" {
					args = append(args, "--tls")
				}
				_, err = networkclient.ExecuteCommand("peer", args, true)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
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
