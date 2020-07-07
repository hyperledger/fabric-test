package operations

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	yaml "gopkg.in/yaml.v2"
)

//InstantiateCCUIObject --
type InstantiateCCUIObject struct {
	SDK             string                   `json:"sdk,omitempty"`
	TransType       string                   `json:"transType,omitempty"`
	TLS             string                   `json:"TLS,omitempty"`
	ChainCodeID     string                   `json:"chaincodeID,omitempty"`
	ChainCodeVer    string                   `json:"chaincodeVer,omitempty"`
	ConnProfilePath string                   `json:"ConnProfilePath,omitempty"`
	ChannelOpt      ChannelOptions           `json:"channelOpt,omitempty"`
	DeployOpt       InstantiateDeployOptions `json:"deploy,omitempty"`
	TimeOutOpt      TimeOutOptions           `json:"timeoutOpt,omitempty"`
	Sequence        string                   `json:"sequence,omitempty"`
	TargetPeers     []string                 `json:"targetPeers,omitempty"`
}

//InstantiateDeployOptions --
type InstantiateDeployOptions struct {
	Function              string             `json:"fcn,omitempty"`
	Arguments             []string           `json:"args,omitempty"`
	Endorsement           *EndorsementPolicy `json:"endorsement,omitempty"`
	CollectionsConfigPath string             `json:"collectionsConfigPath,omitempty"`
}

//TimeOutOptions --
type TimeOutOptions struct {
	PreConfig string `json:"preConfig,omitempty"`
	Request   string `json:"request,omitempty"`
}

//EndorsementPolicy --
type EndorsementPolicy struct {
	Identities      []Identity          `json:"identities,omitempty"`
	Policy          map[string][]Policy `json:"policy,omitempty"`
	SignaturePolicy string              `json:"signaturePolicy,omitempty"`
}

//Policy --
type Policy struct {
	SignedBy int `json:"signed-by"`
}

//Identity --
type Identity struct {
	Role struct {
		Name  string `json:"name,omitempty"`
		MSPID string `json:"mspId,omitempty"`
	} `json:"role,omitempty"`
}

//ConnProfileOptions --
type ConnProfileOptions struct {
	Organizations map[string]struct {
		MSPID string   `yaml:"mspid,omitempty"`
		Peers []string `yaml:"peers,omitempty"`
	} `yaml:"organizations,omitempty"`
	Peers map[string]struct {
		URL        string `yaml:"url,omitempty"`
		MetricsURL string `yaml:"metricsURL,omitempty"`
	} `yaml:"peers,omitempty"`
	Orderers map[string]struct {
		URL        string `yaml:"url,omitempty"`
		MetricsURL string `yaml:"metricsURL,omitempty"`
	}
	Channels map[string]struct {
		Orderers []string `yaml:"orderers,omitempty"`
		Peers    []string `yaml:"peers,omitempty"`
	}
}

//InstalledCC --
type InstalledCC struct {
	CC []struct {
		PackageID string `json:"package_id,omitempty"`
		Label     string `json:"label,omitempty"`
	} `json:"installed_chaincodes,omitempty"`
}

//InstantiateCC -- To instantiate/upgrade chaincode with the objects created and to update connection profile
func (i InstantiateCCUIObject) InstantiateCC(config inputStructs.Config, tls, action string) error {

	var instantiateCCObjects []InstantiateCCUIObject
	configObjects := config.InstantiateCC
	var ccConfigObjects []interface{}
	if action == "upgrade" {
		configObjects = config.UpgradeCC
	}
	for index := 0; index < len(configObjects); index++ {
		ccObjects, err := i.generateInstantiateCCObjects(configObjects[index], config.Organizations, tls, action)
		if err != nil {
			return err
		}
		ccConfigObjects = append(ccConfigObjects, &configObjects[index])
		instantiateCCObjects = append(instantiateCCObjects, ccObjects...)
	}
	err := i.instantiateCC(instantiateCCObjects)
	if err != nil {
		return err
	}
	var connProfileObject connectionprofile.ConnProfile
	err = connProfileObject.UpdateConnectionProfiles(ccConfigObjects, config.Organizations, action)
	if err != nil {
		return err
	}
	return nil
}

//generateInstantiateCCObjects -- To generate chaincode objects for instantiation/upgrade
func (i InstantiateCCUIObject) generateInstantiateCCObjects(ccObject inputStructs.InstantiateCC, organizations []inputStructs.Organization, tls, action string) ([]InstantiateCCUIObject, error) {

	var instantiateCCObjects []InstantiateCCUIObject
	var err error
	if ccObject.ChannelPrefix != "" && ccObject.NumChannels > 0 {
		instantiateCCObjects, err = i.createInstantiateCCObjectIfChanPrefix(ccObject, organizations, tls, action)
		if err != nil {
			return instantiateCCObjects, err
		}
		return instantiateCCObjects, nil
	}
	orgNames := strings.Split(ccObject.Organizations, ",")
	instantiateCCObjects, err = i.createInstantiateCCObjects(orgNames, ccObject.ChannelName, tls, action, organizations, ccObject)
	if err != nil {
		return instantiateCCObjects, err
	}
	return instantiateCCObjects, nil
}

//createInstantiateCCObjects -- To create chaincode objects for instantiation/upgrade per channel
func (i InstantiateCCUIObject) createInstantiateCCObjects(orgNames []string, channelName, tls, action string, organizations []inputStructs.Organization, ccObject inputStructs.InstantiateCC) ([]InstantiateCCUIObject, error) {

	var instantiateCCObjects []InstantiateCCUIObject
	targetPeers := strings.Split(ccObject.TargetPeers, ",")
	i = InstantiateCCUIObject{
		SDK:             ccObject.SDK,
		TransType:       action,
		TLS:             tls,
		ConnProfilePath: paths.GetConnProfilePath(orgNames, organizations),
		ChainCodeID:     ccObject.ChainCodeName,
		ChainCodeVer:    ccObject.ChainCodeVersion,
		TargetPeers:     targetPeers,
		Sequence:        ccObject.Sequence,
		ChannelOpt: ChannelOptions{
			Name:    channelName,
			OrgName: orgNames,
		},
		DeployOpt: InstantiateDeployOptions{
			Function:  ccObject.CCFcn,
			Arguments: strings.Split(ccObject.CCFcnArgs, ","),
		},
		TimeOutOpt: TimeOutOptions{
			PreConfig: ccObject.TimeOutOpt.PreConfig,
			Request:   ccObject.TimeOutOpt.Request,
		},
	}
	if ccObject.TimeOutOpt.PreConfig == "" {
		i.TimeOutOpt = TimeOutOptions{PreConfig: "600000", Request: "600000"}
	}
	if ccObject.EndorsementPolicy != "" {
		if ccObject.SDK != "cli" || strings.Contains(ccObject.EndorsementPolicy, "of") {
			endorsementPolicy, err := i.getEndorsementPolicy(organizations, ccObject.EndorsementPolicy)
			if err != nil {
				logger.ERROR("Failed to get the endorsement policy")
				return instantiateCCObjects, err
			}
			i.DeployOpt.Endorsement = endorsementPolicy
		} else {
			endorsementPolicy := &EndorsementPolicy{SignaturePolicy: ccObject.EndorsementPolicy}
			i.DeployOpt.Endorsement = endorsementPolicy
		}
	}
	if ccObject.CollectionPath != "" {
		i.DeployOpt.CollectionsConfigPath = ccObject.CollectionPath
	}
	instantiateCCObjects = append(instantiateCCObjects, i)
	return instantiateCCObjects, nil
}

//createInstantiateCCObjectIfChanPrefix -- To create chaincode objects if channel prefix and number of channels are given
func (i InstantiateCCUIObject) createInstantiateCCObjectIfChanPrefix(ccObject inputStructs.InstantiateCC, organizations []inputStructs.Organization, tls, action string) ([]InstantiateCCUIObject, error) {

	var instantiateCCObjects []InstantiateCCUIObject
	var channelName string
	for j := 0; j < ccObject.NumChannels; j++ {
		channelName = fmt.Sprintf("%s%s", ccObject.ChannelPrefix, strconv.Itoa(j))
		orgNames := strings.Split(ccObject.Organizations, ",")
		ccObjects, err := i.createInstantiateCCObjects(orgNames, channelName, tls, action, organizations, ccObject)
		if err != nil {
			return instantiateCCObjects, err
		}
		instantiateCCObjects = append(instantiateCCObjects, ccObjects...)
	}
	return instantiateCCObjects, nil
}

//getEndorsementPolicy -- To get the endorsement policy
func (i InstantiateCCUIObject) getEndorsementPolicy(organizations []inputStructs.Organization, policy string) (*EndorsementPolicy, error) {

	var endorsementPolicy *EndorsementPolicy
	var identities []Identity
	var policies []Policy
	var identity Identity
	args := strings.Split(policy, "(")
	orgs := args[len(args)-1]
	orgs = orgs[:len(orgs)-1]
	orgNames := strings.Split(orgs, ",")

	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		connProfilePath := paths.GetConnProfilePath([]string{orgName}, organizations)
		connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName)
		if err != nil {
			return endorsementPolicy, err
		}
		mspID := connProfConfig.Organizations[orgName].MSPID
		identity.Role.Name = "member"
		identity.Role.MSPID = mspID
		identities = append(identities, identity)
	}
	numPolicies, err := strconv.Atoi(args[0][0:1])
	if err != nil {
		logger.ERROR("Failed to convert string to integer")
		return endorsementPolicy, err
	}
	key := fmt.Sprintf("%d-of", numPolicies)
	for i := 0; i < len(orgNames); i++ {
		policy := Policy{SignedBy: i}
		policies = append(policies, policy)
	}
	policyMap := make(map[string][]Policy)
	policyMap[key] = policies
	endorsementPolicy = &EndorsementPolicy{Identities: identities, Policy: policyMap}
	return endorsementPolicy, nil
}

//ConnProfileInformationForOrg -- To get the MSP ID for an organization
func ConnProfileInformationForOrg(connProfilePath, orgName string) (ConnProfileOptions, error) {

	var config ConnProfileOptions
	if !(strings.HasSuffix(connProfilePath, "yaml") || strings.HasSuffix(connProfilePath, "yml")) {
		files, err := ioutil.ReadDir(connProfilePath)
		if err != nil {
			return config, err
		}
		for _, file := range files {
			if strings.Contains(file.Name(), orgName) {
				connProfilePath = paths.JoinPath(connProfilePath, file.Name())
				break
			}
		}
	}
	yamlFile, err := ioutil.ReadFile(connProfilePath)
	if err != nil {
		logger.ERROR("Failed to read connectionprofile to get MSPID ")
		return config, err
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		logger.ERROR("Failed to create ConnProfileOptions object")
		return config, err
	}
	return config, nil
}

func fetchOrdererInformation(currentDir string) ([]string, error) {

	files, err := ioutil.ReadDir(fmt.Sprintf("%s/crypto-config/ordererOrganizations/", currentDir))
	if err != nil {
		logger.ERROR("failed opening directory")
		return nil, err
	}
	ordererDirectory, err := ioutil.ReadDir(fmt.Sprintf("%s/crypto-config/ordererOrganizations/%s/orderers/", currentDir, files[0].Name()))
	if err != nil {
		logger.ERROR("failed opening orderer directory")
		return nil, err
	}
	ordererName := strings.Split(ordererDirectory[0].Name(), ".")
	return ordererName, nil
}

//queryInstalledusingCLI -- querying installed cc using cli
func (i InstantiateCCUIObject) queryInstalledusingCLI(orgName, peerName, peerAddress, TLS string) (InstalledCC, error) {

	var queryInstalled InstalledCC
	currentDir, err := paths.GetCurrentDir()
	if err != nil {
		return queryInstalled, err
	}
	args := []string{"lifecycle",
		"chaincode",
		"queryinstalled",
		"--peerAddresses", peerAddress,
		"--tlsRootCertFiles", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/%s.%s/tls/ca.crt", currentDir, orgName, peerName, orgName),
		"--output",
		"json"}

	if TLS == "clientauth" {
		args = append(args, "--tls")
	}
	installedCC, err := networkclient.ExecuteCommand("peer", args, true)
	if err != nil {
		return queryInstalled, err
	}
	err = json.Unmarshal([]byte(installedCC), &queryInstalled)
	if err != nil {
		return queryInstalled, err
	}
	return queryInstalled, nil
}

//approveCCusingCLI -- approving cc for organization using CLI
func (i InstantiateCCUIObject) approveCCusingCLI(instantiateObject InstantiateCCUIObject) error {

	var packageID string
	for _, orgName := range instantiateObject.ChannelOpt.OrgName {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			return err
		}
		var connProfilePath string
		if strings.Contains(instantiateObject.ConnProfilePath, ".yaml") || strings.Contains(instantiateObject.ConnProfilePath, ".json") {
			connProfilePath = instantiateObject.ConnProfilePath
		} else {
			connProfilePath = fmt.Sprintf("%s/connection_profile_%s.yaml", instantiateObject.ConnProfilePath, orgName)
		}
		connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName)
		if err != nil {
			return err
		}
		ordererName, err := fetchOrdererInformation(currentDir)
		ordererURL, err := url.Parse(connProfConfig.Orderers[ordererName[0]].URL)
		if err != nil {
			logger.ERROR("Failed to get orderer url from connection profile")
			return err
		}
		ordererAddress := ordererURL.Host
		args := []string{
			"lifecycle",
			"chaincode",
			"approveformyorg",
			"--channelID", instantiateObject.ChannelOpt.Name,
			"--name", instantiateObject.ChainCodeID,
			"--version", instantiateObject.ChainCodeVer,
			"--sequence", instantiateObject.Sequence,
			"--waitForEvent",
			"--orderer", ordererAddress,
			"--cafile", fmt.Sprintf("%s/crypto-config/ordererOrganizations/%s/orderers/%s.%s/tls/ca.crt", currentDir, ordererName[1], ordererName[0], ordererName[1]),
			// "--connectionProfile",
			// instantiateObject.ConnProfilePath,
		}
		for _, peerName := range instantiateObject.TargetPeers {
			peerOrgName := strings.Split(peerName, "-")
			if peerOrgName[1] == orgName {
				peerURL, err := url.Parse(connProfConfig.Peers[peerName].URL)
				if err != nil {
					logger.ERROR("Failed to get peer url from connection profile")
					return err
				}
				peerAddress := peerURL.Host
				err = SetEnvForCLI(orgName, peerName, connProfilePath, instantiateObject.TLS, currentDir)
				if err != nil {
					return err
				}
				queryInstalled, _ := i.queryInstalledusingCLI(orgName, peerName, peerAddress, instantiateObject.TLS)
				for j := 0; j < len(queryInstalled.CC); j++ {
					if queryInstalled.CC[j].Label == fmt.Sprintf("%s_%s", instantiateObject.ChainCodeID, instantiateObject.ChainCodeVer) {
						packageID = queryInstalled.CC[j].PackageID
						break
					}
				}
				args = append(args,
					"--peerAddresses", peerAddress,
					"--tlsRootCertFiles", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/%s.%s/tls/ca.crt", currentDir, orgName, peerName, orgName),
				)
			}
		}
		args = append(args, "--package-id", packageID)
		if instantiateObject.TLS == "clientauth" {
			args = append(args, "--tls")
		}
		if instantiateObject.DeployOpt.Endorsement != nil && instantiateObject.SDK == "cli" {
			args = append(args, "--signature-policy", instantiateObject.DeployOpt.Endorsement.SignaturePolicy)
		}
		if instantiateObject.DeployOpt.CollectionsConfigPath != "" {
			args = append(args, "--collections-config", instantiateObject.DeployOpt.CollectionsConfigPath)
		}
		_, err = networkclient.ExecuteCommand("peer", args, true)
		if err != nil {
			return err
		}
	}
	return nil
}

//commitCCusingCLI -- committing cc using CLI
func (i InstantiateCCUIObject) commitCCusingCLI(instantiateObject InstantiateCCUIObject) error {

	orgName := instantiateObject.ChannelOpt.OrgName[0]
	var connProfilePath string
	if strings.Contains(instantiateObject.ConnProfilePath, ".yaml") || strings.Contains(instantiateObject.ConnProfilePath, ".json") {
		connProfilePath = instantiateObject.ConnProfilePath
	} else {
		connProfilePath = fmt.Sprintf("%s/connection_profile_%s.yaml", instantiateObject.ConnProfilePath, orgName)
	}
	currentDir, err := paths.GetCurrentDir()
	if err != nil {
		return err
	}
	connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName)
	if err != nil {
		return err
	}
	ordererName, err := fetchOrdererInformation(currentDir)
	ordererURL, err := url.Parse(connProfConfig.Orderers[ordererName[0]].URL)
	if err != nil {
		logger.ERROR("Failed to get orderer url from connection profile")
		return err
	}
	ordererAddress := ordererURL.Host
	args := []string{"lifecycle",
		"chaincode",
		"commit",
		"--channelID", instantiateObject.ChannelOpt.Name,
		"--name", instantiateObject.ChainCodeID,
		"--version", instantiateObject.ChainCodeVer,
		"--sequence", instantiateObject.Sequence,
		"--waitForEvent",
		"--orderer", ordererAddress,
		"--cafile", fmt.Sprintf("%s/crypto-config/ordererOrganizations/%s/orderers/%s.%s/tls/ca.crt", currentDir, ordererName[1], ordererName[0], ordererName[1]),
		// "--connectionProfile",
		// instantiateObject.ConnProfilePath,
	}
	for _, peerName := range instantiateObject.TargetPeers {
		peerOrgName := strings.Split(peerName, "-")
		if peerOrgName[1] == orgName {
			peerURL, err := url.Parse(connProfConfig.Peers[peerName].URL)
			if err != nil {
				logger.ERROR("Failed to get peer url from connection profile")
				return err
			}
			peerAddress := peerURL.Host
			args = append(args,
				"--peerAddresses", peerAddress,
				"--tlsRootCertFiles", fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/%s.%s/tls/ca.crt", currentDir, orgName, peerName, orgName),
			)
			err = SetEnvForCLI(orgName, peerName, connProfilePath, instantiateObject.TLS, currentDir)
			if err != nil {
				return err
			}
		}
	}
	if instantiateObject.TLS == "clientauth" {
		args = append(args, "--tls")
	}
	if instantiateObject.DeployOpt.Endorsement != nil && instantiateObject.SDK == "cli" {
		args = append(args, "--signature-policy", instantiateObject.DeployOpt.Endorsement.SignaturePolicy)
	}
	if instantiateObject.DeployOpt.CollectionsConfigPath != "" {
		args = append(args, "--collections-config", instantiateObject.DeployOpt.CollectionsConfigPath)
	}
	_, err = networkclient.ExecuteCommand("peer", args, true)
	return err
}

//instantiateCC -- To instantiate chaincode
func (i InstantiateCCUIObject) instantiateCC(instantiateChainCodeObjects []InstantiateCCUIObject) error {

	var err error
	var jsonObject []byte
	pteMainPath := paths.PTEPath()
	for j := 0; j < len(instantiateChainCodeObjects); j++ {
		if instantiateChainCodeObjects[j].SDK == "cli" {
			err = i.approveCCusingCLI(instantiateChainCodeObjects[j])
			if err != nil {
				return err
			}
			err = i.commitCCusingCLI(instantiateChainCodeObjects[j])
			if err != nil {
				return err
			}
		} else {
			jsonObject, err = json.Marshal(instantiateChainCodeObjects[j])
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
