package operations

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
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
	TransType       string                   `json:"transType,omitempty"`
	TLS             string                   `json:"TLS,omitempty"`
	ChainCodeID     string                   `json:"chaincodeID,omitempty"`
	ChainCodeVer    string                   `json:"chaincodeVer,omitempty"`
	ConnProfilePath string                   `json:"ConnProfilePath,omitempty"`
	ChannelOpt      ChannelOptions           `json:"channelOpt,omitempty"`
	DeployOpt       InstantiateDeployOptions `json:"deploy,omitempty"`
	TimeOutOpt      TimeOutOptions           `json:"timeoutOpt,timeoutOpt"`
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
	Identities []Identity          `json:"identities,omitempty"`
	Policy     map[string][]Policy `json:"policy,omitempty"`
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

//GetMSPID --
type GetMSPID struct {
	Organizations map[string]struct {
		MSPID string `yaml:"mspid,omitempty"`
	} `yaml:"organizations,omitempty"`
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
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		i = InstantiateCCUIObject{TransType: action, TLS: tls, ConnProfilePath: paths.GetConnProfilePathForOrg(orgName, organizations), ChainCodeID: ccObject.ChainCodeName, ChainCodeVer: ccObject.ChainCodeVersion}
		i.ChannelOpt = ChannelOptions{Name: channelName, OrgName: []string{orgName}}
		i.DeployOpt = InstantiateDeployOptions{Function: "init", Arguments: strings.Split(ccObject.CCFcnArgs, ",")}
		i.TimeOutOpt = TimeOutOptions{PreConfig: ccObject.TimeOutOpt.PreConfig, Request: ccObject.TimeOutOpt.Request}
		if ccObject.TimeOutOpt.PreConfig == "" {
			i.TimeOutOpt = TimeOutOptions{PreConfig: "600000", Request: "600000"}
		}
		if ccObject.EndorsementPolicy != "" {
			endorsementPolicy, err := i.getEndorsementPolicy(organizations, ccObject.EndorsementPolicy)
			if err != nil {
				logger.ERROR("Failed to get the endorsement policy")
				return instantiateCCObjects, err
			}
			i.DeployOpt.Endorsement = endorsementPolicy
		}
		if ccObject.CollectionPath != "" {
			i.DeployOpt.CollectionsConfigPath = ccObject.CollectionPath
		}
		instantiateCCObjects = append(instantiateCCObjects, i)
	}
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
		connProfilePath := paths.GetConnProfilePathForOrg(orgName, organizations)
		mspID, err := i.getMSPIDForOrg(connProfilePath, orgName)
		if err != nil {
			return endorsementPolicy, err
		}
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
	for i := 0; i < numPolicies; i++ {
		policy := Policy{SignedBy: i}
		policies = append(policies, policy)
	}
	policyMap := make(map[string][]Policy)
	policyMap[key] = policies
	endorsementPolicy = &EndorsementPolicy{Identities: identities, Policy: policyMap}
	return endorsementPolicy, nil
}

//getMSPIDForOrg -- To get the MSP ID for an organization
func (i InstantiateCCUIObject) getMSPIDForOrg(connProfilePath, orgName string) (string, error) {
	var config GetMSPID
	var mspID string
	yamlFile, err := ioutil.ReadFile(connProfilePath)
	if err != nil {
		logger.ERROR("Failed to read connectionprofile to get MSPID ")
		return mspID, err
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		logger.ERROR("Failed to create GetMSPID object")
		return mspID, err
	}
	mspID = config.Organizations[orgName].MSPID
	return mspID, nil
}

//instantiateCC -- To instantiate chaincode
func (i InstantiateCCUIObject) instantiateCC(instantiateChainCodeObjects []InstantiateCCUIObject) error {
	var err error
	var jsonObject []byte
	pteMainPath := paths.PTEPath()
	for j := 0; j < len(instantiateChainCodeObjects); j++ {
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
	return err
}
