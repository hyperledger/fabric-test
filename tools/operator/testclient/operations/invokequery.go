package operations

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
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
	DiscoveryOpt    DiscoveryOptions      `json:"discoveryOpt,omitempty"`
	ListOpt         map[string][]string   `json:"listOpt,omitempty"`
	CCType          string                `json:"ccType,omitempty"`
	CCOpt           CCOptions             `json:"ccOpt,omitempty"`
	Parameters      map[string]Parameters `json:"invoke,omitempty"`
	ConnProfilePath string                `json:"ConnProfilePath,omitempty"`
	TimeOutOpt      TimeOutOptions        `json:"timeoutOpt,timeoutOpt"`
	PeerFailover    string                `json:"peerFailover,omitempty"`
	OrdererFailover string                `json:"ordererFailover,omitempty"`
	FailoverOpt     PeerOptions           `json:"failoverOpt,omitempty"`
	OrdererOpt      OrdererOptions        `json:"ordererOpt,omitempty"`
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
	KeyIdx      []int  `json:"keyIdx,omitempty"`
	KeyPayLoad  []int  `json:"keyPayLoad,omitempty"`
	KeyStart    string `json:"keyStart,omitempty"`
	PayLoadMin  string `json:"payLoadMin,omitempty"`
	PayLoadMax  string `json:"payLoadMax,omitempty"`
	PayLoadType string `json:"payLoadType,omitempty"`
}

//DiscoveryOptions --
type DiscoveryOptions struct {
	Localhost string `json:"localHost,omitempty"`
	InitFreq  int    `json:"initFreq,omitempty"`
}

//Parameters --
type Parameters struct {
	Fcn  string   `json:"fcn,omitempty"`
	Args []string `json:"args,omitempty"`
}

type PeerOptions struct {
	Method string `json:"method,omitempty"`
	List   string `json:"list,omitempty"`
}

type OrdererOptions struct {
	Method    string `json:"method,omitempty"`
	NOrderers int    `json:"nOrderers,omitempty"`
}

type BlockchainCount struct {
	peerTransactionCount int
	peerBlockchainHeight int
	peerBlockHash        string
}

type Result struct {
	Err error
}

//InvokeQuery -- To perform invoke/query with the objects created
func (i InvokeQueryUIObject) InvokeQuery(config inputStructs.Config, tls, action string) error {

	var invokeQueryObjects []InvokeQueryUIObject
	configObjects := config.Invoke
	if action == "Query" {
		configObjects = config.Query
	}
	for key := range configObjects {
		invkQueryObjects := i.generateInvokeQueryObjects(configObjects[key], config.Organizations, tls, action)
		invokeQueryObjects = append(invokeQueryObjects, invkQueryObjects...)
	}
	err := i.invokeQueryTransactions(invokeQueryObjects)
	if err != nil {
		return err
	}
	return err
}

//generateInvokeQueryObjects -- To generate objects for invoke/query
func (i InvokeQueryUIObject) generateInvokeQueryObjects(invkQueryObject inputStructs.InvokeQuery, organizations []inputStructs.Organization, tls, action string) []InvokeQueryUIObject {

	var invokeQueryObjects []InvokeQueryUIObject
	orgNames := strings.Split(invkQueryObject.Organizations, ",")
	invkQueryObjects := i.createInvokeQueryObjectForOrg(orgNames, action, tls, organizations, invkQueryObject)
	invokeQueryObjects = append(invokeQueryObjects, invkQueryObjects...)
	return invokeQueryObjects
}

//createInvokeQueryObjectForOrg -- To craete invoke/query objects for an organization
func (i InvokeQueryUIObject) createInvokeQueryObjectForOrg(orgNames []string, action, tls string, organizations []inputStructs.Organization, invkQueryObject inputStructs.InvokeQuery) []InvokeQueryUIObject {

	var invokeQueryObjects []InvokeQueryUIObject
	invokeParams := make(map[string]Parameters)
	invokeCheck := "TRUE"
	if invkQueryObject.QueryCheck > 0 {
		invokeCheck = "FALSE"
	}
	i = InvokeQueryUIObject{
		LogLevel:    "ERROR",
		InvokeCheck: invokeCheck,
		TransType:   "Invoke",
		InvokeType:  "Move",
		TargetPeers: invkQueryObject.TargetPeers,
		TLS:         tls,
		NProcPerOrg: strconv.Itoa(invkQueryObject.NProcPerOrg),
		NRequest:    strconv.Itoa(invkQueryObject.NRequest),
		RunDur:      strconv.Itoa(invkQueryObject.RunDuration),
		CCType:      invkQueryObject.CCOptions.CCType,
		ChaincodeID: invkQueryObject.ChaincodeName,
		EventOpt: EventOptions{
			Type:     invkQueryObject.EventOptions.Type,
			Listener: invkQueryObject.EventOptions.Listener,
			TimeOut:  strconv.Itoa(invkQueryObject.EventOptions.TimeOut),
		},
		CCOpt: CCOptions{
			KeyIdx:      invkQueryObject.CCOptions.KeyIdx,
			KeyPayLoad:  invkQueryObject.CCOptions.KeyPayload,
			KeyStart:    strconv.Itoa(invkQueryObject.CCOptions.KeyStart),
			PayLoadMin:  strconv.Itoa(invkQueryObject.CCOptions.PayLoadMin),
			PayLoadMax:  strconv.Itoa(invkQueryObject.CCOptions.PayLoadMax),
			PayLoadType: invkQueryObject.CCOptions.PayLoadType,
		},
		TimeOutOpt: TimeOutOptions{
			Request:   invkQueryObject.TimeOutOpt.Request,
			PreConfig: invkQueryObject.TimeOutOpt.PreConfig,
		},
		ChannelOpt: ChannelOptions{
			Name:    invkQueryObject.ChannelName,
			OrgName: orgNames,
		},
		ConnProfilePath: paths.GetConnProfilePath(orgNames, organizations),
	}
	if strings.EqualFold("DISCOVERY", invkQueryObject.TargetPeers) {
		localHost := strings.ToUpper(strconv.FormatBool(invkQueryObject.DiscoveryOptions.Localhost))
		i.DiscoveryOpt = DiscoveryOptions{
			Localhost: localHost,
			InitFreq:  invkQueryObject.DiscoveryOptions.InitFreq,
		}
	}
	if strings.EqualFold("LIST", invkQueryObject.TargetPeers) {
		i.ListOpt = invkQueryObject.ListOptions
	}
	if action == "Query" {
		i.InvokeType = action
		i.CCOpt = CCOptions{KeyIdx: invkQueryObject.CCOptions.KeyIdx, KeyStart: strconv.Itoa(invkQueryObject.CCOptions.KeyStart)}
	}
	invokeParams["move"] = Parameters{
		Fcn:  invkQueryObject.Fcn,
		Args: strings.Split(invkQueryObject.Args, ","),
	}
	invokeParams["query"] = Parameters{
		Fcn:  invkQueryObject.Fcn,
		Args: strings.Split(invkQueryObject.Args, ","),
	}
	i.Parameters = invokeParams
	if invkQueryObject.PeerFailOver {
		i.PeerFailover = "TRUE"
		i.FailoverOpt = PeerOptions{
			Method: invkQueryObject.PeerOpt.Method,
			List:   invkQueryObject.PeerOpt.List,
		}
	}
	if invkQueryObject.OrdererFailOver {
		i.OrdererFailover = "TRUE"
		i.OrdererOpt = OrdererOptions{
			Method:    invkQueryObject.OrdererOpt.Method,
			NOrderers: invkQueryObject.OrdererOpt.NOrderers,
		}
	}
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

func (i InvokeQueryUIObject) invokeConfig(channelName string, args []string) error {

	_, err := networkclient.ExecuteCommand("node", args, true)
	if err != nil {
		return errors.Errorf(fmt.Sprintf("Failed to perform invoke/query on %s channel: %v", channelName, err))
	}
	return nil
}

//invokeQueryTransactions -- To invoke/query transactions
func (i InvokeQueryUIObject) invokeQueryTransactions(invokeQueryObjects []InvokeQueryUIObject) error {
	var wg sync.WaitGroup
	pteMainPath := paths.PTEPath()
	errCh := make(chan error, 1)
	for key := range invokeQueryObjects {
		jsonObject, err := json.Marshal(invokeQueryObjects[key])
		if err != nil {
			return err
		}
		args := []string{pteMainPath, strconv.Itoa(key), string(jsonObject), time.Now().String()}
		wg.Add(1)
		go func(invokeQueryObjectIndex int, wg *sync.WaitGroup, errCh chan error) {
			defer wg.Done()
			err := i.invokeConfig(invokeQueryObjects[invokeQueryObjectIndex].ChannelOpt.Name, args)
			if err != nil {
				logger.ERROR("Failed to complete invokes/queries " + err.Error())
				checkAndPushError(errCh)
			}
			blockchain, err := i.fetchMetrics(invokeQueryObjects[invokeQueryObjectIndex])
			if err != nil {
				logger.ERROR("Failed fetching metrics " + err.Error())
				checkAndPushError(errCh)
			}
			err = validateLedger(blockchain[invokeQueryObjects[invokeQueryObjectIndex].ChannelOpt.Name])
			if err != nil {
				logger.ERROR(err.Error())
				checkAndPushError(errCh)
			}
		}(key, &wg, errCh)
	}
	wg.Wait()
	select {
	case err := <-errCh:
		close(errCh)
		return err
	default:
		close(errCh)
		return nil
	}
}

func checkAndPushError(errCh chan error) {
	if len(errCh) != cap(errCh) {
		errCh <- fmt.Errorf("Failed invoking/querying chaincode")
	}
}

func validateLedger(blocks map[string]BlockchainCount) error {
	var blockchainHeight int
	var transactionCount int
	var blockHash string
	for key, block := range blocks {
		if blockchainHeight == 0 && transactionCount == 0 {
			blockchainHeight = block.peerBlockchainHeight
			transactionCount = block.peerTransactionCount
			blockHash = block.peerBlockHash
		} else if block.peerBlockchainHeight != blockchainHeight || block.peerTransactionCount != transactionCount || block.peerBlockHash != blockHash {
			return fmt.Errorf("peer [%s] is not in sync", key)
		}
	}
	return nil
}

func (i InvokeQueryUIObject) fetchMetrics(invokeQueryObject InvokeQueryUIObject) (map[string]map[string]BlockchainCount, error) {

	channelBlockchainCount := make(map[string]map[string]BlockchainCount)
	connectionProfilePath := invokeQueryObject.ConnProfilePath
	orgName := invokeQueryObject.ChannelOpt.OrgName
	for index := range orgName {
		connProfilePath := fmt.Sprintf("%s/connection_profile_%s.yaml", connectionProfilePath, orgName[index])
		if strings.Contains(connectionProfilePath, ".yaml") || strings.Contains(connectionProfilePath, ".json") {
			connProfilePath = connectionProfilePath
		}
		connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName[index])
		if err != nil {
			return nil, err
		}
		channelName := invokeQueryObject.ChannelOpt.Name
		channelBlockchainCount[channelName] = make(map[string]BlockchainCount)
		for _, peerName := range connProfConfig.Channels[channelName].Peers {
			if connProfConfig.Peers[peerName].MetricsURL != "" {
				metricsURL, err := url.Parse(connProfConfig.Peers[peerName].MetricsURL)
				if err != nil {
					logger.ERROR("Failed to get peer url from connection profile")
					return nil, err
				}
				resp, err := http.Get(fmt.Sprintf("%s/metrics", metricsURL))
				if err != nil {
					logger.ERROR("Error while hitting the endpoint")
					return nil, err
				}
				defer resp.Body.Close()
				bodyBytes, err := ioutil.ReadAll(resp.Body)
				if err != nil {
					return nil, err
				}
				metrics := string(bodyBytes)
				blockHeight := strings.Split(metrics, fmt.Sprintf(`ledger_blockchain_height{channel="%s"}`, channelName))
				height := strings.Split(blockHeight[1], "\n")[0]
				num, _ := strconv.Atoi(strings.TrimSpace(height))
				regex := regexp.MustCompile(fmt.Sprintf(`ledger_transaction_count{chaincode="%s:[0-9A-Za-z]+",channel="%s",transaction_type="ENDORSER_TRANSACTION",validation_code="VALID"}`, invokeQueryObject.ChaincodeID, channelName))
				transactionCount := strings.Split(metrics, fmt.Sprintf(`%s`, regex.FindString(metrics)))
				trxnCount := strings.Split(transactionCount[1], "\n")[0]
				count, _ := strconv.Atoi(strings.TrimSpace(trxnCount))
				peerURL, err := url.Parse(connProfConfig.Peers[peerName].URL)
				if err != nil {
					logger.ERROR("Failed to get peer url from connection profile")
					return nil, err
				}
				peerAddress := peerURL.Host
				blockHash, _ := i.fetchBlockHash(peerAddress, orgName[index], peerName, channelName, connProfilePath, invokeQueryObject.TLS)
				channelBlockchainCount[channelName][peerName] = BlockchainCount{
					peerBlockchainHeight: num,
					peerTransactionCount: count,
					peerBlockHash:        blockHash,
				}
			}
		}
	}
	return channelBlockchainCount, nil
}

//fetchBlockHash --
func (i InvokeQueryUIObject) fetchBlockHash(peerAddress, orgName, peerName, channelName, connProfilePath, tls string) (string, error) {

	currentDir, err := paths.GetCurrentDir()
	if err != nil {
		return "", err
	}
	err = SetEnvForCLI(orgName, peerName, connProfilePath, tls, currentDir)
	if err != nil {
		return "", err
	}
	args := []string{
		"channel",
		"getinfo",
		"-c", channelName,
	}
	if tls == "clientauth" {
		args = append(args, "--tls")
	}
	os.Setenv("CORE_PEER_ADDRESS", peerAddress)
	peerGetInfo, err := networkclient.ExecuteCommand("peer", args, false)
	if err != nil {
		return "", err
	}
	blockHash := strings.Split(peerGetInfo, `"currentBlockHash":`)
	currentBlockHash := strings.Split(blockHash[1], ",")[0]
	currentBlockHash = strings.ReplaceAll(currentBlockHash, `"`, "")
	hash := strings.TrimSpace(currentBlockHash)
	return hash, err
}
