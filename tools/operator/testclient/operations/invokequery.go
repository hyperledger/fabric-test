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

//InvokeQueryUIObject --
type InvokeQueryUIObject struct {
	LogLevel        string                `json:"logLevel,omitempty"`
	ChaincodeID     string                `json:"chaincodeID,omitempty"`
	InvokeCheck     string                `json:"invokeCheck,omitempty"`
	TransMode       string                `json:"transMode,omitempty"`
	TransType       string                `json:"transType,omitempty"`
	InvokeType      string                `json:"invokeType,omitempty"`
	TargetPeers     string                `json:"targetPeers,omitempty"`
	TLS             string                `json:"TLS,omitempty"`
	NProcPerOrg     string                `json:"nProcPerOrg,omitempty"`
	NRequest        string                `json:"nRequest,omitempty"`
	RunDur          string                `json:"runDur,omitempty"`
	ChannelOpt      ChannelOptions        `json:"channelOpt,omitempty"`
	BurstOpt        BurstOptions          `json:"burstOpt,omitempty"`
	MixOpt          MixOptions            `json:"mixOpt,omitempty"`
	ConstOpt        ConstantOptions       `json:"constantOpt,omitempty"`
	EventOpt        EventOptions          `json:"eventOpt,omitempty"`
	CCType          string                `json:"ccType,omitempty"`
	CCOpt           CCOptions             `json:"ccOpt,omitempty"`
	Parameters      map[string]Parameters `json:"invoke,omitempty"`
	ConnProfilePath string                `json:"ConnProfilePath,omitempty"`
}

//BurstOptions --
type BurstOptions struct {
	BurstFreq0 string `json:"burstFreq0,omitempty"`
	BurstDur0  string `json:"burstDur0,omitempty"`
	BurstFreq1 string `json:"burstFreq1,omitempty"`
	BurstDur1  string `json:"burstDur1,omitempty"`
}

//MixOptions --
type MixOptions struct {
	MixFreq string `json:"mixFreq,omitempty"`
}

//ConstantOptions --
type ConstantOptions struct {
	RecHist   string `json:"recHist,omitempty"`
	ConstFreq string `json:"constFreq,omitempty"`
	DevFreq   string `json:"devFreq,omitempty"`
}

//EventOptions --
type EventOptions struct {
	Type     string `json:"type,omitempty"`
	Listener string `json:"listener,omitempty"`
	TimeOut  string `json:"timeout,omitempty"`
}

//CCOptions --
type CCOptions struct {
	KeyIdx     []int  `json:"keyIdx,omitempty"`
	KeyPayLoad []int  `json:"keyPayLoad,omitempty"`
	KeyStart   string `json:"keyStart,omitempty"`
	PayLoadMin string `json:"payLoadMin,omitempty"`
	PayLoadMax string `json:"payLoadMax,omitempty"`
}

//Parameters --
type Parameters struct {
	Fcn  string   `json:"fcn,omitempty"`
	Args []string `json:"args,omitempty"`
}

//InvokeQuery -- To perform invoke/query with the objects created
func (i InvokeQueryUIObject) InvokeQuery(config inputStructs.Config, tls, action string) error {

	var invokeQueryObjects []InvokeQueryUIObject
	var err error
	configObjects := config.Invoke
	if action == "Query" {
		configObjects = config.Query
	}
	for key := range configObjects {
		invkQueryObjects := i.generateInvokeQueryObjects(configObjects[key], config.Organizations, tls, action)
		invokeQueryObjects = append(invokeQueryObjects, invkQueryObjects...)
	}
	err = i.invokeQueryTransactions(invokeQueryObjects)
	if err != nil {
		return err
	}
	return err
}

//generateInvokeQueryObjects -- To generate objects for invoke/query
func (i InvokeQueryUIObject) generateInvokeQueryObjects(invkQueryObject inputStructs.InvokeQuery, organizations []inputStructs.Organization, tls, action string) []InvokeQueryUIObject {

	var invokeQueryObjects []InvokeQueryUIObject
	orgNames := strings.Split(invkQueryObject.Organizations, ",")
	for _, orgName := range orgNames {
		orgName = strings.TrimSpace(orgName)
		invkQueryObjects := i.createInvokeQueryObjectForOrg(orgName, action, tls, organizations, invkQueryObject)
		invokeQueryObjects = append(invokeQueryObjects, invkQueryObjects...)
	}
	return invokeQueryObjects
}

//createInvokeQueryObjectForOrg -- To craete invoke/query objects for an organization
func (i InvokeQueryUIObject) createInvokeQueryObjectForOrg(orgName, action, tls string, organizations []inputStructs.Organization, invkQueryObject inputStructs.InvokeQuery) []InvokeQueryUIObject {

	var invokeQueryObjects []InvokeQueryUIObject
	invokeParams := make(map[string]Parameters)
	invokeCheck := "TRUE"
	if invkQueryObject.QueryCheck > 0 {
		invokeCheck = "FALSE"
	}
	i = InvokeQueryUIObject{LogLevel: "ERROR", InvokeCheck: invokeCheck, TransType: "Invoke", InvokeType: "Move", TargetPeers: invkQueryObject.TargetPeers, TLS: tls, NProcPerOrg: strconv.Itoa(invkQueryObject.NProcPerOrg), NRequest: strconv.Itoa(invkQueryObject.NRequest), RunDur: strconv.Itoa(invkQueryObject.RunDuration), CCType: invkQueryObject.CCOptions.CCType, ChaincodeID: invkQueryObject.ChaincodeName}
	i.EventOpt = EventOptions{Type: invkQueryObject.EventOptions.Type, Listener: invkQueryObject.EventOptions.Listener, TimeOut: strconv.Itoa(invkQueryObject.EventOptions.TimeOut)}
	i.CCOpt = CCOptions{KeyStart: strconv.Itoa(invkQueryObject.CCOptions.KeyStart), PayLoadMin: strconv.Itoa(invkQueryObject.CCOptions.PayLoadMin), PayLoadMax: strconv.Itoa(invkQueryObject.CCOptions.PayLoadMax)}
	if action == "Query" {
		i.InvokeType = action
		i.CCOpt = CCOptions{KeyStart: strconv.Itoa(invkQueryObject.CCOptions.KeyStart)}
	}
	i.ChannelOpt = ChannelOptions{Name: invkQueryObject.ChannelName, OrgName: []string{orgName}}
	i.ConnProfilePath = paths.GetConnProfilePathForOrg(orgName, organizations)
	invokeParams["move"] = Parameters{Fcn: "invoke", Args: strings.Split(invkQueryObject.Args, ",")}
	invokeParams["query"] = Parameters{Fcn: "invoke", Args: strings.Split(invkQueryObject.Args, ",")}
	i.Parameters = invokeParams
	for key := range invkQueryObject.TxnOptions {
		mode := invkQueryObject.TxnOptions[key].Mode
		options := invkQueryObject.TxnOptions[key].Options
		i.TransMode = mode
		switch mode {
		case "constant":
			i.ConstOpt = ConstantOptions{RecHist: "HIST", ConstFreq: strconv.Itoa(options.ConstFreq), DevFreq: strconv.Itoa(options.DevFreq)}
		case "burst":
			i.BurstOpt = BurstOptions{BurstFreq0: strconv.Itoa(options.BurstFreq0), BurstDur0: strconv.Itoa(options.BurstDur0), BurstFreq1: strconv.Itoa(options.BurstFreq1), BurstDur1: strconv.Itoa(options.BurstDur1)}
		case "mix":
			i.MixOpt = MixOptions{MixFreq: strconv.Itoa(options.MixFreq)}
		}
		invokeQueryObjects = append(invokeQueryObjects, i)
	}
	return invokeQueryObjects
}

//invokeQueryTransactions -- To invoke/query transactions
func (i InvokeQueryUIObject) invokeQueryTransactions(invokeQueryObjects []InvokeQueryUIObject) error {

	var err error
	var jsonObject []byte
	pteMainPath := paths.PTEPath()
	for key := range invokeQueryObjects {
		jsonObject, err = json.Marshal(invokeQueryObjects[key])
		if err != nil {
			return err
		}
		startTime := fmt.Sprintf("%s", time.Now())
		args := []string{pteMainPath, strconv.Itoa(key), string(jsonObject), startTime}
		_, err = networkclient.ExecuteCommand("node", args, true)
		if err != nil {
			return err
		}
	}
	return err
}
