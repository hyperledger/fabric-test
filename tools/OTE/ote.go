// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//

package main

// Orderer Traffic Engine
// ======================
//
// This file ote.go contains main(), for executing from command line
// using environment variables to override those in orderer/orderer.yaml
// or to set OTE test configuration parameters.
//
// Function ote() is called by main after reading environment variables,
// and is also called via "go test" from tests in ote_test.go. Those
// tests can be executed from automated Continuous Integration processes,
// which can use https://github.com/jstemmer/go-junit-report to convert the
// logs to produce junit output for CI reports.
//   go get github.com/jstemmer/go-junit-report
//   go test -v | go-junit-report > report.xml
//
// ote() invokes tool driver.sh (including network.json and json2yml.js) -
//   which is only slightly modified from the original version at
//   https://github.com/dongmingh/v1FabricGenOption -
//   to launch an orderer service network per the specified parameters
//   (including kafka brokers or other necessary support processes).
//   Function ote() performs several actions:
// + create Producer clients to connect via grpc to all the channels on
//   all the orderers to send/broadcast transaction messages
// + create Consumer clients to connect via grpc to ListenAddress:ListenPort
//   on all channels on all orderers and call deliver() to receive messages
//   containing batches of transactions
// + use parameters for specifying test configuration such as:
//   numBer of transactions, number of channels, number of orderers ...
// + load orderer/orderer.yml to retrieve environment variables used for
//   overriding orderer configuration such as batchsize, batchtimeout ...
// + generate unique transactions, dividing up the requested OTE_TXS count
//   among all the Producers
// + Consumers confirm the same number of blocks and TXs are delivered
//   by all the orderers on all the channels
// + print logs for any errors, and print final tallied results
// + return a pass/fail result and a result summary string

import (
        "fmt"
        "os"
        "encoding/json"
        "io/ioutil"
        "strings"
        "strconv"
        "math"
        "os/exec"
        "log"
        "time"
        "sync"
        "path/filepath"
        "github.com/hyperledger/fabric/common/crypto"

        genesisconfig "github.com/hyperledger/fabric/common/tools/configtxgen/localconfig" // config for genesis.yaml
        ordererConf "github.com/hyperledger/fabric/orderer/common/localconfig" // config, for the orderer.yaml
        "github.com/hyperledger/fabric/common/tools/protolator"
        "github.com/hyperledger/fabric/common/localmsp"
        mspmgmt "github.com/hyperledger/fabric/msp/mgmt"
        cb "github.com/hyperledger/fabric/protos/common"
        ab "github.com/hyperledger/fabric/protos/orderer"
        "github.com/hyperledger/fabric/protos/utils"
        "golang.org/x/net/context"
        "google.golang.org/grpc"
        "google.golang.org/grpc/credentials"
)

var ordConf *ordererConf.TopLevel
var genConf *genesisconfig.Profile
var genesisConfigLocation = "CONFIGTX_ORDERER_"
var ordererConfigLocation = "ORDERER_GENERAL_"
var batchSizeParamStr = genesisConfigLocation+"BATCHSIZE_MAXMESSAGECOUNT"
var batchTimeoutParamStr = genesisConfigLocation+"BATCHTIMEOUT"
var ordererTypeParamStr = genesisConfigLocation+"ORDERERTYPE"

var debugflagLaunch = false
var debugflagAPI = true
var debugflag1 = false
var debugflag2 = false
var debugflag3 = false // most detailed and voluminous

// To increase size of transactions, add data to this string:
var extraTxData = ""
// var extraTxData = "00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef00abcdef"

var masterSpyReadyWG sync.WaitGroup
var producersWG sync.WaitGroup
var logFile *os.File
var logEnabled = false
var envvar string

var numChannels = 1
var numOrdsInNtwk  = 1
var numOrdsToWatch = 1
var ordererType = "solo"
var numKBrokers int
var producersPerCh = 1
var numConsumers = 1
var numProducers = 1
var batchSize int64 = 100

// numTxToSend is the total number of Transactions to send; A fraction is
// sent by each producer for each channel for each orderer.

var numTxToSend int64 = 1

// One GO thread is created for each producer and each consumer client.
// To optimize go threads usage, to prevent running out of swap space
// in the (laptop) test environment for tests using either numerous
// channels or numerous producers per channel, set bool optimizeClientsMode
// true to only create one go thread MasterProducer per orderer, which will
// broadcast messages to all channels on one orderer. Note this option
// works a little less efficiently on the consumer side, where we
// share a single grpc connection but still need to use separate
// GO threads per channel per orderer (instead of one per orderer).

var optimizeClientsMode = false

// ordStartPort (default port is 7050, but driver.sh uses 5005).
// peerStartPort (default port is 7051, but driver.sh uses 7061).

var ordStartPort uint16 = 7050

const (
        // Indicate whether a test requires counters for a Spy monitor, and when.
        spyOff = 0               // No MasterSpy
        spyOn = 1                // Yes, start MasterSpy upon initialization / test startup
        spyDefer = 2             // Yes, prepare counter arrays for MasterSpy, but user will call function later to connect spy consumer
)
var masterSpy = spyOff
var masterSpyOrdIndx = 0          // MasterSpy will connect to this Orderer
var masterSpyIsActive = false

func spyStatus(spyState int) string {
        if spyState == spyOff { return "OFF" }
        if spyState == spyOn { return "ON" }
        if spyState == spyDefer { return "DEFER" }
        return ( fmt.Sprintf("UNKNOWN (%d)", spyState) )
}

func initialize() {
        // When running multiple tests, e.g. from go test, reset to defaults
        // for the parameters that could change per test.
        // We do NOT reset things that would apply to every test, such as
        // settings for environment variables
        logEnabled = false
        envvar = ""
        numChannels = 1
        numOrdsInNtwk = 1
        numOrdsToWatch = 1
        ordererType = "solo"
        numKBrokers = 0
        numConsumers = 1
        numProducers = 1
        numTxToSend = 1
        producersPerCh = 1
        masterSpy = spyOff
        masterSpyOrdIndx = 0
        masterSpyIsActive = false
        initLogger("ote")
}

func initLogger(fileName string) {
        if !logEnabled {
                layout := "Jan_02_2006"
                // Format Now with the layout const.
                t := time.Now()
                res := t.Format(layout)
                var err error
                logFile, err = os.OpenFile(fileName+"-"+res+".log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
                if err != nil {
                        panic(fmt.Sprintf("error opening file: %s", err))
                }
                logEnabled = true
                log.SetOutput(logFile)
                //log.SetFlags(log.LstdFlags | log.Lshortfile)
                log.SetFlags(log.LstdFlags)
        }
}

func logger(printStmt string) {
        fmt.Println(printStmt)
        if !logEnabled {
                return
        }
        log.Println(printStmt)
}

func closeLogger() {
        if logFile != nil {
                logFile.Close()
        }
        logEnabled = false
}

var (
        oldest  = &ab.SeekPosition{Type: &ab.SeekPosition_Oldest{Oldest: &ab.SeekOldest{}}}
        newest  = &ab.SeekPosition{Type: &ab.SeekPosition_Newest{Newest: &ab.SeekNewest{}}}
        maxStop = &ab.SeekPosition{Type: &ab.SeekPosition_Specified{Specified: &ab.SeekSpecified{Number: math.MaxUint64}}}
)

type config struct {
        Profile  string `json:"profile"`
        Channel  string `json:"channel"`
        Seek     int `json:"seek"`
        TLS      bool `json:"tls"`
        Quiet    bool `json:"quiet"`
}

type ordererdriveClient struct {
        client  ab.AtomicBroadcast_DeliverClient
        chanID  string
        signer  crypto.LocalSigner
        quiet   bool
}
type broadcastClient struct {
        client  ab.AtomicBroadcast_BroadcastClient
        chanID string
        signer crypto.LocalSigner
}
func newOrdererdriveClient(client ab.AtomicBroadcast_DeliverClient, chanID string, signer crypto.LocalSigner, quiet bool) *ordererdriveClient {
        return &ordererdriveClient{client: client, chanID: chanID, signer: signer, quiet: quiet}
}
func newBroadcastClient(client ab.AtomicBroadcast_BroadcastClient, chanID string, signer crypto.LocalSigner) *broadcastClient {
        return &broadcastClient{client: client, chanID: chanID, signer: signer}
}

func (r *ordererdriveClient) seekHelper(chanID string, start *ab.SeekPosition, stop *ab.SeekPosition) *cb.Envelope {
        env, err := utils.CreateSignedEnvelope(cb.HeaderType_DELIVER_SEEK_INFO, r.chanID, r.signer, &ab.SeekInfo{
                Start:    start,
                Stop:     stop,
                Behavior: ab.SeekInfo_BLOCK_UNTIL_READY,
        }, 0, 0)
        if err != nil {
                panic(err)
        }
        return env
}

func (r *ordererdriveClient) seekOldest() error {
        return r.client.Send(r.seekHelper(r.chanID, oldest, maxStop))
}

func (r *ordererdriveClient) seekNewest() error {
        return r.client.Send(r.seekHelper(r.chanID, oldest, maxStop))
}

func (r *ordererdriveClient) seekSingle(blockNumber uint64) error {
        specific := &ab.SeekPosition{Type: &ab.SeekPosition_Specified{Specified: &ab.SeekSpecified{Number: blockNumber}}}
        return r.client.Send(r.seekHelper(r.chanID, specific, specific))
}

func (r *ordererdriveClient) readUntilClose(ordererIndex int, channelIndex int, txRecvCntrP *int64, blockRecvCntrP *int64) {
        myName := clientName("Consumer", ordererIndex, channelIndex)
        for {
                msg, err := r.client.Recv()
                if err != nil {
                        if !strings.Contains(err.Error(),"transport is closing") {
                                // print if we do not see the msg indicating graceful closing of the connection
                                logger(fmt.Sprintf("Consumer for orderer %d channel %d readUntilClose() Recv error: %v", ordererIndex, channelIndex, err))
                        }
                        if debugflag1 { logger(fmt.Sprintf("%s CLOSING. Totals received numtrans=%d numBlocks=%d, %v", myName, *txRecvCntrP, *blockRecvCntrP, time.Now())) }
                        return
                }
                switch t := msg.Type.(type) {
                case *ab.DeliverResponse_Status:
                        logger(fmt.Sprintf("Got DeliverResponse_Status: %v", t))
                        return
                case *ab.DeliverResponse_Block:
                        if !r.quiet {
                                logger("Received block: ")
                                err := protolator.DeepMarshalJSON(os.Stdout, t.Block)
                                if err != nil {
                                         logger(fmt.Sprintf("Error pretty printing block: %s", err))
                                }
                        }
                        *txRecvCntrP += int64(len(t.Block.Data.Data))
                        (*blockRecvCntrP)++
                        if ((*blockRecvCntrP) <= 2) || (int64(len(t.Block.Data.Data)) < batchSize) {
                                if debugflag1 {
                                         logger(fmt.Sprintf("===%s recvd blockNum %d with numtrans=%d/%d; numBlocks=%d, %v", myName, t.Block.Header.Number, len(t.Block.Data.Data), batchSize, (*blockRecvCntrP), time.Now()))
                                         //if debugflag3 { logger(fmt.Sprintf("===Block.Data: %v", t.Block.Data)) }
                                         if (*blockRecvCntrP) <= 2 { logger(fmt.Sprintf("===Block.Data: %v", t.Block.Data)) }
                                }
                        } else if debugflag2 {
                                logger(fmt.Sprintf("===%s recvd blockNum %d with numtrans=%d; numBlocks=%d %v", myName, t.Block.Header.Number, len(t.Block.Data.Data), (*blockRecvCntrP), time.Now()))
                                if debugflag3 { logger(fmt.Sprintf("Block.Data: %v", t.Block.Data )) }
                        }
                }
        }
}

func (b *broadcastClient) broadcast(transaction []byte) error {
        env, err := utils.CreateSignedEnvelope(cb.HeaderType_MESSAGE, b.chanID, b.signer, &cb.ConfigValue{Value: transaction}, 0, 0)
        if err != nil {
                panic(err)
        }
        return b.client.Send(env)
}

func (b *broadcastClient) getAck() error {
       msg, err := b.client.Recv()
       if err != nil {
                return err
       }
       if msg.Status != cb.Status_SUCCESS {
                return fmt.Errorf("Got unexpected status: %v", msg.Status)
       }
       return nil
}

func startConsumer(serverAddr string, chanID string, ordererIndex int, channelIndex int, txRecvCntrP *int64, blockRecvCntrP *int64, consumerConnP **grpc.ClientConn, seek int, quiet bool, tlsEnabled bool) {
        myName := clientName("Consumer", ordererIndex, channelIndex)
        signer := localmsp.NewSigner()
        for orgIndex := 0; orgIndex < len(genConf.Orderer.Organizations); orgIndex++ {
                if strings.Contains(serverAddr, genConf.Orderer.Addresses[ordererIndex]) == true {
                        ordererName := strings.Trim(serverAddr, fmt.Sprintf(":%s", ordStartPort))
                        matches, _ := filepath.Glob(fmt.Sprintf("/var/hyperledger/fabric/artifacts/ordererOrganizations/example.com/orderers/%s" + "*", ordererName))
                        err := mspmgmt.LoadLocalMsp(fmt.Sprintf("%s/msp", matches[0]), ordConf.General.BCCSP, genConf.Orderer.Organizations[orgIndex].ID)
                        if err != nil { // Handle errors reading the config file
                                fmt.Println("Failed to initialize local MSP:", err)
                                //os.Exit(0)
                        }
                        if seek < -2 {
                                fmt.Println("Wrong seek value.")
                        }
                        var conn *grpc.ClientConn
                        if tlsEnabled {
                                creds, err := credentials.NewClientTLSFromFile(fmt.Sprintf("%s/tls/ca.crt", matches[0]), fmt.Sprintf("%s", ordererName))
                                conn, err = grpc.Dial(serverAddr, grpc.WithTransportCredentials(creds))
                                if err != nil {
                                        panic(fmt.Sprintf("Error on client %s connecting (grpc) to %s, err: %v", myName, serverAddr, err))
                                }
                        } else {
                                conn, err = grpc.Dial(serverAddr, grpc.WithInsecure())
                                if err != nil {
                                        panic(fmt.Sprintf("Error on client %s connecting (grpc) to %s, err: %v", myName, serverAddr, err))
                                }
                        }
                        (*consumerConnP) = conn
                        client, err := ab.NewAtomicBroadcastClient(*consumerConnP).Deliver(context.TODO())
                        if err != nil {
                                panic(fmt.Sprintf("Error on client %s invoking Deliver() on grpc connection to %s, err: %v", myName, serverAddr, err))
                        }
                        s := newOrdererdriveClient(client, chanID, signer, quiet)
                        if err = s.seekOldest(); err != nil {
                                panic(fmt.Sprintf("ERROR starting client %s srvr=%s chID=%s; err: %v", myName, serverAddr, chanID, err))
                        }
                        if debugflag1 { logger(fmt.Sprintf("Started client %s to recv delivered batches srvr=%s chID=%s", myName, serverAddr, chanID)) }
                        s.readUntilClose(ordererIndex, channelIndex, txRecvCntrP, blockRecvCntrP)
               }
        }
}

func startConsumerMaster(serverAddr string, chanIdsP *[]string, ordererIndex int, txRecvCntrsP *[]int64, blockRecvCntrsP *[]int64, consumerConnP **grpc.ClientConn) {
        myName := clientName("MasterConsumer", ordererIndex, numChannels)
        // create one conn to the orderer and share it for communications to all channels
        conn, err := grpc.Dial(serverAddr, grpc.WithInsecure())
        if err != nil {
                panic(fmt.Sprintf("Error on client %s connecting (grpc) to %s, err: %v", myName, serverAddr, err))
        }
        (*consumerConnP) = conn

        // create an orderer driver client for every channel on this orderer
        dc := make ([]*ordererdriveClient, numChannels)
        for c := 0; c < numChannels; c++ {
                client, err := ab.NewAtomicBroadcastClient(*consumerConnP).Deliver(context.TODO())
                if err != nil {
                        panic(fmt.Sprintf("Error on client %s invoking Deliver() on grpc connection to %s, err: %v", myName, serverAddr, err))
                }
                quiet := true
                signer := localmsp.NewSigner()
                dc[c] = newOrdererdriveClient(client, (*chanIdsP)[c], signer, quiet)
                if err = dc[c].seekOldest(); err != nil {
                        panic(fmt.Sprintf("ERROR starting client %s srvr=%s chID=%s; err: %v", myName, serverAddr, (*chanIdsP)[c], err))
                }
                if debugflag1 { logger(fmt.Sprintf("Started client %s to recv delivered batches from ord[%d] ch[%d] srvr=%s chID=%s", myName, ordererIndex, c, serverAddr, (*chanIdsP)[c])) }

                // Create a client thread to receive deliveries on this and
                // every channel on this orderer.
                // (It would be more efficient if we could skip all these "go"
                // threads, and create only one call to "readUntilClose" and
                // have it look for deliveries on all channels. But, of course,
                // fabric rejects that.)

                go dc[c].readUntilClose(ordererIndex, c, &((*txRecvCntrsP)[c]), &((*blockRecvCntrsP)[c]))
        }
}

func startSpyDefer(listenAddr string, ordStartPort uint16, chanIdsP *[]string, ordererIndex int, txRecvCntrsP *[]int64, blockRecvCntrsP *[]int64, consumerConnP **grpc.ClientConn) {

        // Wait here until the user test application code successfully calls
        // startMasterSpy(), and provides a masterSpyOrdIndx

        masterSpyReadyWG.Wait()

        logger(fmt.Sprintf("=== startSpyDefer proceeding to startConsumerMaster to spy on orderer%d", masterSpyOrdIndx))
        serverAddr := fmt.Sprintf("%s:%d", listenAddr, ordStartPort + uint16(masterSpyOrdIndx))
        startConsumerMaster(serverAddr, chanIdsP, ordererIndex, txRecvCntrsP, blockRecvCntrsP, consumerConnP)
}

// This API function can be called by go tests in one thread, some time (at least 20 seconds)
// after calling ote to start the traffic in main flow. Pass in (-1) to use OTE_SPY_ORDERER.
func startMasterSpy(ordToWatch int) {
        if masterSpyIsActive {
                logger(fmt.Sprintf("Test Error: Cannot start more than one MasterSpy. Already watching orderer %d.", masterSpyOrdIndx))
                return
        }
        if ordToWatch >= numOrdsInNtwk {
                logger(fmt.Sprintf("Test Error: Cannot start MasterSpy to watch orderer index %d. Only %d orderers exist in network.", ordToWatch, numOrdsInNtwk))
                return
        }
        if ordToWatch >= 0 {
                masterSpyOrdIndx = ordToWatch
        }
        // else ok to keep using masterSpyOrdIndx default or what was passed in already in env variable OTE_SPY_ORDERER.
        masterSpyIsActive = true
        masterSpyReadyWG.Done()
}

func clientName(clientType string, ordIdx int, chIdx int) string {
        return (fmt.Sprintf("%s-o%d-c%d", clientType, ordIdx, chIdx))
}

func executeCmd(cmd string) ([]byte, error) {
        out, err := exec.Command("/bin/sh", "-c", cmd).Output()
        if (err != nil) {
                logger(fmt.Sprintf("Unsuccessful exec command: "+cmd+"\nstdout="+string(out)+"\nstderr=%v", err))
        }
        return out, err
}

func executeCmdAndDisplay(cmd string) {
        out,_ := executeCmd(cmd)
        logger("Results of exec command: "+cmd+"\nstdout="+string(out))
}

func connClose(consumerConnsPP **([][]*grpc.ClientConn)) {
        for i := 0; i < numOrdsToWatch; i++ {
                for j := 0; j < numChannels; j++ {
                        if (**consumerConnsPP)[i][j] != nil {
                                _ = (**consumerConnsPP)[i][j].Close()
                        }
                }
        }
}

func cleanNetwork(consumerConnsP *([][]*grpc.ClientConn)) {
        if debugflag1 { logger("Removing the Network Consumers") }
        connClose(&consumerConnsP)

        // Docker is not perfect; we need to unpause any paused containers, before removing them.
        // Currently, OTE will be running in a container, so cleaning the containers will be used when it is run from outside the container
        ///////////////////////////////////////////////////////////////////////////////////////
        //if out,_ := executeCmd("docker ps -aq -f status=paused"); out != nil && string(out) != "" {
        //        logger("Unpausing paused docker containers: " + string(out))
        //        _,_ = executeCmd("docker ps -aq -f status=paused | xargs docker unpause")
        //}

        // kill any containers that are still running
        //_ = executeCmd("docker kill $(docker ps -q)")

        //if debugflagLaunch {
        //        logger("Network containers will be left running; user must manually remove them when ready:  docker rm -f $(docker ps -aq)")
        //        return
        //        //logger("Sleep 60 secs, to allow checking docker logs orderer ..."); time.Sleep(60 * time.Second)
        //}
        //if debugflag1 { logger("Removing the Network orderers and associated docker containers") }

        //_,_ = executeCmd("docker rm -f $(docker ps -aq)")
        /////////////////////////////////////////////////////////////////////////////////////////
}

// Launching network using Network Launcher is done as a separate task
//////////////////////////////////////////////////////////////////////////////////////////////////
//func launchNetwork(appendFlags string) {
//        // Alternative way: hardcoded docker compose (not driver.sh tool)
//        //  _ = executeCmd("docker-compose -f docker-compose-3orderers.yml up -d")
//
//        cmd := fmt.Sprintf("cd ../v1Launcher && ./NetworkLauncher.sh -z 2 -r 2 -p 2 -n 1 -f test -w 10.0.2.15 %s", appendFlags)
//        logger(fmt.Sprintf("Launching network:  %s", cmd))
//        if debugflagLaunch {
//                executeCmdAndDisplay(cmd) // show stdout logs; debugging help
//        } else {
//                _,_ = executeCmd(cmd)
//        }
//
//        // display the network of docker containers with the orderers and such
//        executeCmdAndDisplay("docker ps -a")
//}
//////////////////////////////////////////////////////////////////////////////////////////////////////

func countGenesis() int64 {
        return int64(numChannels)
}
func sendEqualRecv(numTxToSend int64, totalTxRecvP *[]int64, totalTxRecvMismatch bool, totalBlockRecvMismatch bool) bool {
        var matching = false;
        if (*totalTxRecvP)[0] == numTxToSend {
                // recv count on orderer 0 matches the send count
                if !totalTxRecvMismatch && !totalBlockRecvMismatch {
                        // all orderers have same recv counters
                        matching = true
                }
        }
        return matching
}

func moreDeliveries(txSentP *[][]int64, totalNumTxSentP *int64, txSentFailuresP *[][]int64, totalNumTxSentFailuresP *int64, txRecvP *[][]int64, totalTxRecvP *[]int64, totalTxRecvMismatchP *bool, blockRecvP *[][]int64, totalBlockRecvP *[]int64, totalBlockRecvMismatchP *bool) (moreReceived bool) {
        moreReceived = false
        prevTotalTxRecv := make ([]int64, numOrdsToWatch)
        for ordNum := 0; ordNum < numOrdsToWatch; ordNum++ {
                prevTotalTxRecv[ordNum] = (*totalTxRecvP)[ordNum]
        }
        computeTotals(txSentP, totalNumTxSentP, txSentFailuresP, totalNumTxSentFailuresP, txRecvP, totalTxRecvP, totalTxRecvMismatchP, blockRecvP, totalBlockRecvP, totalBlockRecvMismatchP)
        for ordNum := 0; ordNum < numOrdsToWatch; ordNum++ {
                //if prevTotalTxRecv[ordNum] != (*totalTxRecvP)[ordNum] { moreReceived = true }
                if prevTotalTxRecv[ordNum] != (*totalTxRecvP)[ordNum] {
                        moreReceived = true
                        if debugflag1 {
                                logger(fmt.Sprintf("moreDeliveries (%d) received on ordererIndex %d, %v", (*totalTxRecvP)[ordNum]-prevTotalTxRecv[ordNum], ordNum, time.Now()))
                        }
                }
        }
        return moreReceived
}

func startProducer(serverAddr string, chanID string, ordererIndex int, channelIndex int, txReq int64, txSentCntrP *int64, txSentFailureCntrP *int64, tlsEnabled bool) {
        myName := clientName("Producer", ordererIndex, channelIndex)
        signer := localmsp.NewSigner()
        for orgIndex := 0; orgIndex < len(genConf.Orderer.Organizations); orgIndex++ {
                if strings.Contains(serverAddr, genConf.Orderer.Addresses[ordererIndex]) == true {
                        ordererName := strings.Trim(serverAddr, fmt.Sprintf(":%s", ordStartPort))
                        matches, _ := filepath.Glob(fmt.Sprintf("/var/hyperledger/fabric/artifacts/ordererOrganizations/example.com/orderers/%s" + "*", ordererName))
                        var conn *grpc.ClientConn
                        var err error
                        if tlsEnabled {
                                creds, err := credentials.NewClientTLSFromFile(fmt.Sprintf("%s/tls/ca.crt", matches[0]), fmt.Sprintf("%s", ordererName))
                                conn, err = grpc.Dial(serverAddr, grpc.WithTransportCredentials(creds))
                                if err != nil {
                                          panic(fmt.Sprintf("Error on client %s connecting (grpc) to %s, err: %v", myName, serverAddr, err))
                                }
                        } else {
                                conn, err = grpc.Dial(serverAddr, grpc.WithInsecure())
                                if err != nil {
                                          panic(fmt.Sprintf("Error on client %s connecting (grpc) to %s, err: %v", myName, serverAddr, err))
                                }
                        }
                        defer func() {
                                _ = conn.Close()
                        }()
                        if err != nil {
                                panic(fmt.Sprintf("Error creating connection for Producer for ord[%d] ch[%d], err: %v", ordererIndex, channelIndex, err))
                        }
                        client, err := ab.NewAtomicBroadcastClient(conn).Broadcast(context.TODO())
                        if err != nil {
                                panic(fmt.Sprintf("Error creating Producer for ord[%d] ch[%d], err: %v", ordererIndex, channelIndex, err))
                        }

                        time.Sleep(3 * time.Second)
                        if debugflag1 { logger(fmt.Sprintf("Starting Producer to send %d TXs to ord[%d] ch[%d] srvr=%s chID=%s, %v", txReq, ordererIndex, channelIndex, serverAddr, chanID, time.Now())) }
                        b := newBroadcastClient(client, chanID, signer)
                        time.Sleep(2 * time.Second)

                        // print a log after sending mulitples of this percentage of requested TX: 25,50,75%...
                        // only on one producer, and assume all producers are generating at same rate.
                        // e.g. when txReq = 50, to print log every 10. set progressPercentage = 20
                        printProgressLogs := false
                        var progressPercentage int64 = 25    // set this between 1 and 99
                        printLogCnt := txReq * progressPercentage / 100
                        if printLogCnt > 0 {
                                if debugflag1 {
                                          printProgressLogs = true     // to test logs for all producers
                                } else {
                                          if txReq > 10000 && printLogCnt > 0 && ordererIndex==0 && channelIndex==0 {
                                                    printProgressLogs = true
                                          }
                                }
                        }
                        var mult int64

                        // For tests that stop all kafka-brokers, and any others that temporarily interrupt traffic,
                        // let's slow doWN THE TRansaction broadcasts to one-per-second for awhile, before letting
                        // it spin quickly to get NACKs for all remaining transactions to be sent.
                        // Define the number of seconds for allowin continual failures, to wait around for recovery.
                        delayLimit := 120
                        errDelay := 0

                        prevMsgAck := false
                        for i := int64(0); i < txReq ; i++ {
                                b.broadcast([]byte(fmt.Sprintf("Testing %s TX=%d %v %s", myName, i, time.Now(), extraTxData)))
                                err = b.getAck()
                                if err == nil {
                                          (*txSentCntrP)++
                                          if !prevMsgAck { logger(fmt.Sprintf("%s successfully broadcast TX %d (ACK=%d NACK=%d), %v", myName, i, *txSentCntrP, *txSentFailureCntrP, time.Now())) }
                                          prevMsgAck = true
                                          if printProgressLogs && ((*txSentCntrP)%printLogCnt == 0) {
                                                    mult++
                                                    if debugflag1 {
                                                                logger(fmt.Sprintf("%s sent %4d /%4d = ~ %3d%%, %v", myName, (*txSentCntrP), txReq, progressPercentage*mult, time.Now()))
                                                    } else {
                                                                logger(fmt.Sprintf("Sent ~ %3d%%, %v", progressPercentage*mult, time.Now()))
                                                    }
                                          }
                                } else {
                                          (*txSentFailureCntrP)++
                                          if prevMsgAck || (*txSentFailureCntrP)==1 { logger(fmt.Sprintf("%s failed to broadcast TX %d (ACK=%d NACK=%d), %v, err: %v", myName, i, *txSentCntrP, *txSentFailureCntrP, time.Now(), err)) }
                                          prevMsgAck = false
                                          if errDelay < delayLimit {
                                                    errDelay++
                                                    time.Sleep(1 * time.Second)
                                                    if errDelay == delayLimit {
                                                                logger(fmt.Sprintf("%s broadcast error delay period (%d) ended (ACK=%d NACK=%d), %v", myName, errDelay, *txSentCntrP, *txSentFailureCntrP, time.Now()))
                                                    }
                                          }
                                }
                      }
                      if err != nil {
                                logger(fmt.Sprintf("Broadcast error on last TX %d of %s: %v", txReq, myName, err))
                      }
                      if txReq == *txSentCntrP {
                                if debugflag1 { logger(fmt.Sprintf("%s finished sending broadcast msgs: ACKs  %9d  (100%%) , %v", myName, *txSentCntrP, time.Now())) }
                      } else {
                                logger(fmt.Sprintf("%s finished sending broadcast msgs: ACKs  %9d  NACK %d (errDelayCntr %d)  Other %d , %v", myName, *txSentCntrP, *txSentFailureCntrP, errDelay, txReq - *txSentFailureCntrP - *txSentCntrP, time.Now()))
                      }
                      producersWG.Done()
                }
        }
}

func startProducerMaster(serverAddr string, chanIdsP *[]string, ordererIndex int, txReqP *[]int64, txSentCntrP *[]int64, txSentFailureCntrP *[]int64) {
        // This function creates a grpc connection to one orderer,
        // creates multiple clients (one per numChannels) for that one orderer,
        // and sends a TX to all channels repeatedly until no more to send.

        myName := clientName("MasterProducer", ordererIndex, numChannels)

        var txReqTotal int64
        var txMax int64
        for c := 0; c < numChannels; c++ {
                txReqTotal += (*txReqP)[c]
                if txMax < (*txReqP)[c] { txMax = (*txReqP)[c] }
        }
        conn, err := grpc.Dial(serverAddr, grpc.WithInsecure())
        defer func() {
                _ = conn.Close()
        }()
        if err != nil {
                panic(fmt.Sprintf("Error creating connection for %s, err: %v", myName, err))
        }
        client, err := ab.NewAtomicBroadcastClient(conn).Broadcast(context.TODO())
        if err != nil {
                panic(fmt.Sprintf("Error creating %s, err: %v", myName, err))
        }

        logger(fmt.Sprintf("Starting %s to send %d TXs to ord[%d] srvr=%s distributed across all channels", myName, txReqTotal, ordererIndex, serverAddr))
        // create the broadcast clients for every channel on this orderer
        bc := make ([]*broadcastClient, numChannels)
        for c := 0; c < numChannels; c++ {
                signer := localmsp.NewSigner()
                bc[c] = newBroadcastClient(client, (*chanIdsP)[c], signer)
        }

        firstErr := false
        for i := int64(0); i < txMax; i++ {
                // send one TX to every broadcast client (one TX on each chnl)
                for c := 0; c < numChannels; c++ {
                        if i < (*txReqP)[c] {
                                // more TXs to send on this channel
                                bc[c].broadcast([]byte(fmt.Sprintf("Testing %s %v %s", myName, time.Now(), extraTxData)))
                                err = bc[c].getAck()
                                if err == nil {
                                        (*txSentCntrP)[c]++
                                } else {
                                        (*txSentFailureCntrP)[c]++
                                        if !firstErr {
                                                firstErr = true
                                                logger(fmt.Sprintf("Broadcast error on TX %d (the first error for %s on ch[%d] channelID=%s); err: %v", i+1, myName, c, (*chanIdsP)[c], err))
                                        }
                                }
                        }
                }
        }
        if err != nil {
                logger(fmt.Sprintf("Broadcast error on last TX %d on %s on ch[%d]: %v", txReqTotal, myName, numChannels-1, err))
        }
        var txSentTotal int64
        var txSentFailTotal int64
        for c := 0; c < numChannels; c++ {
                txSentTotal += (*txSentCntrP)[c]
                txSentFailTotal += (*txSentFailureCntrP)[c]
        }
        if txReqTotal == txSentTotal {
                logger(fmt.Sprintf("%s finished sending broadcast msgs to all channels on ord[%d]: ACKs  %9d  (100%%)", myName, ordererIndex, txSentTotal))
        } else {
                logger(fmt.Sprintf("%s finished sending broadcast msgs to all channels on ord[%d]: ACKs  %9d  NACK %d  Other %d", myName, ordererIndex, txSentTotal, txSentFailTotal, txReqTotal - txSentTotal - txSentFailTotal))
        }
        producersWG.Done()
}

func computeTotals(txSent *[][]int64, totalNumTxSent *int64, txSentFailures *[][]int64, totalNumTxSentFailures *int64, txRecv *[][]int64, totalTxRecv *[]int64, totalTxRecvMismatch *bool, blockRecv *[][]int64, totalBlockRecv *[]int64, totalBlockRecvMismatch *bool) {
        // The counters for Producers are indexed by orderer (numOrdsInNtwk)
        // and channel (numChannels).
        // Total count includes all counters for all channels on ALL orderers.
        // e.g.    totalNumTxSent         = sum of txSent[*][*]
        // e.g.    totalNumTxSentFailures = sum of txSentFailures[*][*]

        *totalNumTxSent = 0
        *totalNumTxSentFailures = 0
        for i := 0; i < numOrdsInNtwk; i++ {
                for j := 0; j < numChannels; j++ {
                        *totalNumTxSent += (*txSent)[i][j]
                        *totalNumTxSentFailures += (*txSentFailures)[i][j]
                }
        }

        // Counters for consumers are indexed by orderer (numOrdsToWatch)
        // and channel (numChannels).
        // The total count includes all counters for all channels on
        // ONLY ONE orderer.
        // Tally up the totals for all the channels on each orderer, and
        // store them for comparison; they should all be the same.
        // e.g.    totalTxRecv[k]    = sum of txRecv[k][*]
        // e.g.    totalBlockRecv[k] = sum of blockRecv[k][*]

        *totalTxRecvMismatch = false
        *totalBlockRecvMismatch = false
        for k := 0; k < numOrdsToWatch; k++ {
                // count only the requested TXs - not the genesis block TXs
                (*totalTxRecv)[k] = -countGenesis()
                (*totalBlockRecv)[k] = -countGenesis()
                for l := 0; l < numChannels; l++ {
                        (*totalTxRecv)[k] += (*txRecv)[k][l]
                        (*totalBlockRecv)[k] += (*blockRecv)[k][l]
                        if debugflag3 { logger(fmt.Sprintf("in compute(): k %d l %d txRecv[k][l] %d blockRecv[k][l] %d", k , l , (*txRecv)[k][l] , (*blockRecv)[k][l] )) }
                }
                if (k>0) && (*totalTxRecv)[k] != (*totalTxRecv)[k-1] { *totalTxRecvMismatch = true }
                if (k>0) && (*totalBlockRecv)[k] != (*totalBlockRecv)[k-1] { *totalBlockRecvMismatch = true }
        }
        if debugflag2 { logger(fmt.Sprintf("in compute(): totalTxRecv[]= %v, totalBlockRecv[]= %v", *totalTxRecv, *totalBlockRecv)) }
}

func reportTotals(testname string, numTxToSendTotal int64, countToSend [][]int64, txSent [][]int64, totalNumTxSent int64, txSentFailures [][]int64, totalNumTxSentFailures int64, batchSize int64, txRecv [][]int64, totalTxRecv []int64, totalTxRecvMismatch bool, blockRecv [][]int64, totalBlockRecv []int64, totalBlockRecvMismatch bool, channelIDs *[]string, testDuration int64) (successResult bool, resultStr string) {

        // default to failed
        var passFailStr = "FAILED"
        successResult = false
        resultStr = "TEST " + testname + " "

        // For each Producer, print the ordererIndex and channelIndex, the
        // number of TX requested to be sent, the actual number of TX sent,
        // and the number we failed to send.

        if numOrdsInNtwk > 3 || numChannels > 3 {
                logger(fmt.Sprintf("Print only the first 3 chans of only the first 3 ordererIdx; and any others ONLY IF they contain failures.\nTotals numOrdInNtwk=%d numChan=%d numPRODUCERs=%d", numOrdsInNtwk, numChannels, numOrdsInNtwk*numChannels))
        }
        logger("PRODUCERS   OrdererIdx  ChannelIdx ChannelID              TX Target         ACK        NACK")
        for i := 0; i < numOrdsInNtwk; i++ {
                for j := 0; j < numChannels; j++ {
                        if (i < 3 && j < 3) || txSentFailures[i][j] > 0 || countToSend[i][j] != txSent[i][j] + txSentFailures[i][j] {
                                logger(fmt.Sprintf("%22d%12d %-20s%12d%12d%12d",i,j,(*channelIDs)[j],countToSend[i][j],txSent[i][j],txSentFailures[i][j]))
                        } else if (i < 3 && j == 3) {
                                logger(fmt.Sprintf("%34s","..."))
                        } else if (i == 3 && j == 0) {
                                logger(fmt.Sprintf("%22s","..."))
                        }
                }
        }

        // for each consumer print the ordererIndex & channel, the num blocks and the num transactions received/delivered
        if numOrdsToWatch > 3 || numChannels > 3 {
                logger(fmt.Sprintf("Print only the first 3 chans of only the first 3 ordererIdx (and the last ordererIdx if masterSpy is present), plus any others that contain failures.\nTotals numOrdIdx=%d numChanIdx=%d numCONSUMERS=%d", numOrdsToWatch, numChannels, numOrdsToWatch*numChannels))
        }
        logger("CONSUMERS   OrdererIdx  ChannelIdx ChannelID                    TXs     Batches")
        for i := 0; i < numOrdsToWatch; i++ {
                for j := 0; j < numChannels; j++ {
                        if (j < 3 && (i < 3 || (masterSpy != spyOff && i==numOrdsToWatch-1))) || (i>1 && (blockRecv[i][j] != blockRecv[1][j] || txRecv[1][j] != txRecv[1][j])) {
                                // Subtract one from the received Block count and TX count, to ignore the genesis block
                                // (we already ignore genesis blocks when we compute the totals in totalTxRecv[n] , totalBlockRecv[n])
                                outStr := fmt.Sprintf("%22d%12d %-20s%12d%12d",i,j,(*channelIDs)[j],txRecv[i][j]-1,blockRecv[i][j]-1)
                                if (masterSpy != spyOff && i==numOrdsToWatch-1) { outStr += fmt.Sprintf("  * MasterSpy on orderer %d", masterSpyOrdIndx) }
                                logger(outStr)
                        } else if (i < 3 && j == 3) {
                                logger(fmt.Sprintf("%34s","..."))
                        } else if (i == 3 && j == 0) {
                                logger(fmt.Sprintf("%22s","..."))
                        }
                }
        }

        // Check for differences on the deliveries from the orderers. These are
        // probably errors - unless the test stopped an orderer on purpose and
        // never restarted it, while the others continued to deliver TXs.
        // (If an orderer is restarted, then it would reprocess all the
        // back-ordered transactions to catch up with the others.)

        if totalTxRecvMismatch { logger("!!!!! Num TXs Delivered is not same on all orderers!!!!!") }
        if totalBlockRecvMismatch { logger("!!!!! Num Blocks Delivered is not same on all orderers!!!!!") }

        if totalTxRecvMismatch || totalBlockRecvMismatch {
                resultStr += "Orderers were INCONSISTENT! "
        }
        if totalTxRecv[0] == numTxToSendTotal {
                // recv count on orderer 0 matches the send count
                if !totalTxRecvMismatch && !totalBlockRecvMismatch {
                        logger("Hooray! Every TX was successfully sent AND delivered by orderer service.")
                        successResult = true
                        passFailStr = "PASSED"
                } else {
                        resultStr += "Every TX was successfully sent AND delivered by orderer0 but not all orderers"
                }
        } else if totalTxRecv[0] == totalNumTxSent {
                resultStr += "Every ACked TX was delivered, but failures occurred:"
        } else if totalTxRecv[0] < totalNumTxSent {
                resultStr += "BAD! Some ACKed TX were LOST by orderer service!"
        } else {
                resultStr += "BAD! Some EXTRA TX were delivered by orderer service!"
        }

        ////////////////////////////////////////////////////////////////////////
        //
        // Before we declare success, let's check some more things...
        //
        // At this point, we have decided if most of the numbers make sense by
        // setting succssResult to true if the tests passed. Thus we assume
        // successReult=true and just set it to false if we find a problem.

        // Check the totals to verify if the number of blocks on each channel
        // is appropriate for the given batchSize and number of TXs sent.

        expectedBlocksOnChan := make([]int64, numChannels) // create a counter for all the channels on one orderer
        for c := 0; c < numChannels; c++ {
                var chanSentTotal int64
                for ord := 0; ord < numOrdsInNtwk; ord++ {
                        chanSentTotal += txSent[ord][c]
                }
                expectedBlocksOnChan[c] = chanSentTotal / batchSize
                if chanSentTotal % batchSize > 0 { expectedBlocksOnChan[c]++ }
                for ord := 0; ord < numOrdsToWatch; ord++ {
                        if expectedBlocksOnChan[c] != blockRecv[ord][c] - 1 { // ignore genesis block
                                successResult = false
                                passFailStr = "FAILED"
                                logger(fmt.Sprintf("Error: Unexpected Block count %d (expected %d) on ordIndx=%d channelIDs[%d]=%s, chanSentTxTotal=%d BatchSize=%d", blockRecv[ord][c]-1, expectedBlocksOnChan[c], ord, c, (*channelIDs)[c], chanSentTotal, batchSize))
                        } else {
                                if debugflag1 { logger(fmt.Sprintf("GOOD block count %d on ordIndx=%d channelIDs[%d]=%s chanSentTxTotal=%d BatchSize=%d", expectedBlocksOnChan[c], ord, c, (*channelIDs)[c], chanSentTotal, batchSize)) }
                        }
                }
        }


        // TODO - Verify the contents of the last block of transactions.
        //        Since we do not know exactly what should be in the block,
        //        then at least we can do:
        //            for each channel, verify if the block delivered from
        //            each orderer is the same (i.e. contains the same
        //            Data bytes (transactions) in the last block)


        // print some counters totals
        logger(fmt.Sprintf("Not counting genesis blks (1 per chan)%9d", countGenesis()))
        logger(fmt.Sprintf("Total TX broadcasts Requested to Send %9d", numTxToSendTotal))
        logger(fmt.Sprintf("Total TX broadcasts send success ACK  %9d", totalNumTxSent))
        logger(fmt.Sprintf("Total TX broadcasts sendFailed - NACK %9d", totalNumTxSentFailures))
        logger(fmt.Sprintf("Total Send-LOST TX (Not Ack or Nack)) %9d", numTxToSendTotal - totalNumTxSent - totalNumTxSentFailures ))
        clarification := ""
        if (totalTxRecvMismatch || totalBlockRecvMismatch) {
                clarification += "(on ordIndx[0] - but see all actuals below)"
        }
        logger(fmt.Sprintf("Total Recv-LOST TX (Ack but not Recvd)%9d %s", totalNumTxSent - totalTxRecv[0], clarification))
        if successResult {
                logger(fmt.Sprintf("Total deliveries received TX          %9d", totalTxRecv[0]))
                logger(fmt.Sprintf("Total deliveries received Blocks      %9d", totalBlockRecv[0]))
        } else {
                logger(fmt.Sprintf("Total deliveries received TX on each ordrr     %7d", totalTxRecv))
                logger(fmt.Sprintf("Total deliveries received Blocks on each ordrr %7d", totalBlockRecv))
        }

        var overallTPS int64 = 0
        if testDuration > 0 {
                overallTPS = (numTxToSendTotal/testDuration)
                logger(fmt.Sprintf("THROUGHPUT TPS = %d , %s using batchSize=%d numChannels=%d numOrdsInNtwk=%d ordType=%s numKafkaBrokers=%d", overallTPS, testname, batchSize, numChannels, numOrdsInNtwk, ordererType, numKBrokers))
                logger(fmt.Sprintf("TPS - Overall Transactions per second %9d", overallTPS))
                logger(fmt.Sprintf("TPS per channel                       %9d", (numTxToSendTotal/int64(numChannels)/testDuration)))
                logger(fmt.Sprintf("TPS per orderer                       %9d", (numTxToSendTotal/int64(numOrdsInNtwk)/testDuration)))
                logger(fmt.Sprintf("BPS - Overall Blocks per second       %9d", (totalBlockRecv[0]/testDuration)))
                logger(fmt.Sprintf("BPS per channel                       %9d", (totalBlockRecv[0]/int64(numChannels)/testDuration)))
                logger(fmt.Sprintf("BPS per orderer                       %9d", (totalBlockRecv[0]/int64(numOrdsInNtwk)/testDuration)))
        }
        // print output result and counts : overall summary
        resultStr += fmt.Sprintf(" RESULT=%s: TX Req=%d BrdcstACK=%d NACK=%d DelivBlk=%d DelivTX=%d numChannels=%d batchSize=%d TPS=%d", passFailStr, numTxToSendTotal, totalNumTxSent, totalNumTxSentFailures, totalBlockRecv, totalTxRecv, numChannels, batchSize, overallTPS)
        logger(fmt.Sprintf(resultStr))

        return successResult, resultStr
}

// Function:    ote - the Orderer Test Engine
// Outputs:     print report to stdout with lots of counters
// Returns:     passed bool, resultSummary string
func ote( testname string, txs int64, chans int, orderers int, ordType string, kbs int, oteSpy int, pPerCh int ) (passed bool, resultSummary string) {

        initialize() // multiple go tests could be run; we must call initialize() each time

        passed = false
        resultSummary = testname + " test not completed: INPUT ERROR: "
        defer closeLogger()

        logger(fmt.Sprintf("==========\n========== OTE testname=%s TX=%d Channels=%d Orderers=%d ordererType=%s kafka-brokers=%d oteSpy=%s producersPerCh=%d", testname, txs, chans, orderers, ordType, kbs, spyStatus(oteSpy), pPerCh))

        raw, err := ioutil.ReadFile("./config.json")
        if err != nil {
                  fmt.Println(err.Error())
                  os.Exit(1)
        }

        var p config
        json.Unmarshal(raw, &p)
        seek := p.Seek
        quiet := p.Quiet
        tlsEnabled := p.TLS

        // Establish the default configuration from yaml files - and this also
        // picks up any variables overridden on command line or in environment
        ordConf = ordererConf.Load()
        genConf = genesisconfig.Load(fmt.Sprintf("%s", p.Profile))
        var launchAppendFlags string

        ////////////////////////////////////////////////////////////////////////
        // Check parameters and/or env vars to see if user wishes to override
        // default config parms.
        ////////////////////////////////////////////////////////////////////////

        //////////////////////////////////////////////////////////////////////
        // Arguments for OTE settings for test variations:
        //////////////////////////////////////////////////////////////////////

        if txs > 0        { numTxToSend = txs   }      else { return passed, resultSummary + "number of transactions must be > 0" }
        if chans > 0      { numChannels = chans }      else { return passed, resultSummary + "number of channels must be > 0" }
        if orderers > 0   {
                numOrdsInNtwk = orderers
                launchAppendFlags += fmt.Sprintf(" -o %d", orderers)
        } else { return passed, resultSummary + "number of orderers in network must be > 0" }

        if pPerCh > 1 {
                producersPerCh = pPerCh
                return passed, resultSummary + "Multiple producersPerChannel NOT SUPPORTED yet."
        }

        // this is not an argument, but user may set this tuning parameter before running test
        envvar = os.Getenv("OTE_CLIENTS_SHARE_CONNS")
        if envvar != "" {
                if (strings.ToLower(envvar) == "true" || strings.ToLower(envvar) == "t") {
                        optimizeClientsMode = true
                }
                if debugflagAPI {
                        logger(fmt.Sprintf("%-50s %s=%t", "OTE_CLIENTS_SHARE_CONNS="+envvar, "optimizeClientsMode", optimizeClientsMode))
                        logger("Setting OTE_CLIENTS_SHARE_CONNS option to true does the following:\n1. All Consumers on an orderer (one GO thread per each channel) will share grpc connection.\n2. All Producers on an orderer will share a grpc conn AND share one GO-thread.\nAlthough this reduces concurrency and lengthens the test duration, it satisfies\nthe objective of reducing swap space requirements and should be selected when\nrunning tests with numerous channels or producers per channel.")
                }
        }
        if optimizeClientsMode {
                // use only one MasterProducer and one MasterConsumer on each orderer
                numProducers = numOrdsInNtwk
                numConsumers = numOrdsInNtwk
        } else {
                // one Producer and one Consumer for EVERY channel on each orderer
                numProducers = numOrdsInNtwk * numChannels
                numConsumers = numOrdsInNtwk * numChannels
        }

        envvar = "<ignored>"
        if oteSpy < 0 {
                // this ote() was called from the command line
                if debugflagAPI { logger("Using environment variable settings for OTE_MASTERSPY and OTE_SPY_ORDERER...") }
                envvar = strings.ToLower(os.Getenv("OTE_MASTERSPY"))
                if envvar != "" {
                        if strings.Contains(envvar, "on") {
                                masterSpy = spyOn
                        } else if strings.Contains(envvar, "defer") {
                                masterSpy = spyDefer
                        } else {
                                panic("Input error: invalid input for OTE_MASTERSPY: " + envvar)
                        }
                }

        } else if oteSpy == spyOff {
                masterSpy = spyOff
        } else if oteSpy == spyOn {
                masterSpy = spyOn
        } else if oteSpy == spyDefer {
                masterSpy = spyDefer
        } else {
                panic("Input error: invalid input for oteSpy (OTE_MASTERSPY)")
        }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%s", "OTE_MASTERSPY="+envvar, "masterSpy", spyStatus(masterSpy))) }

        envvar = "<ignored>"
        if oteSpy != spyOff {
                // Invoked from a go test or from command line.
                // Env var indicates which orderer to spy on.
                // Note: when using spyDefer, this might be overridden by the go test
                // that calls startMasterSpy() with a valid orderer index number.
                envvar = os.Getenv("OTE_SPY_ORDERER")
                if envvar != "" {
                        if spyOrd, spyOrdErr := strconv.Atoi(envvar); spyOrdErr != nil {
                                panic("Input error: cannot translate OTE_SPY_ORDERER to integer; bad input: " + envvar)
                        } else {
                                if spyOrd >= 0 && spyOrd < numOrdsInNtwk {
                                        masterSpyOrdIndx = spyOrd
                                } else {
                                        panic("Input error: invalid OTE_SPY_ORDERER number; bad input: " + envvar)
                                }
                        }
                }
        }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", "OTE_SPY_ORDERER="+envvar, "spyOrd", masterSpyOrdIndx)) }


        // Watch every orderer to verify they are all delivering the same.
        numOrdsToWatch = numOrdsInNtwk

        if masterSpy != spyOff {
                // Create another set of counters (the masterSpy) for
                // this test to watch every channel on an orderer - so that means
                // every channel on one orderer will be watched by two processes
                numOrdsToWatch++
        }


        //////////////////////////////////////////////////////////////////////
        // Arguments to override configuration parameter values in yaml file:
        //////////////////////////////////////////////////////////////////////

        // ordererType is an argument of ote(), and is also in the genesisconfig
        if genConf.Orderer == nil {
                fmt.Println("unable to load configtx.yaml")
                os.Exit(0)
        }
        ordererType = genConf.Orderer.OrdererType
        if ordType != "" {
                ordererType = ordType
        } else {
                logger(fmt.Sprintf("Null value provided for ordererType; using value from config file: %s", ordererType))
        }
        launchAppendFlags += fmt.Sprintf(" -t %s", ordererType)
        if "kafka" == strings.ToLower(ordererType) {
                if kbs > 0 {
                        numKBrokers = kbs
                        launchAppendFlags += fmt.Sprintf(" -k %d", numKBrokers)
                } else {
                        return passed, resultSummary + "When using kafka ordererType, number of kafka-brokers must be > 0"
                }
        } else { numKBrokers = 0 }

        // batchSize and batchTimeout are not arguments of ote(), but are in the genesisconfig
        // (genConf) which contains the environment variable values that were set on the
        // command line, or exported in environment, or default values from yaml file.

        batchSize = int64(genConf.Orderer.BatchSize.MaxMessageCount) // retype the uint32 config param we read
        envvar = os.Getenv(batchSizeParamStr)
        if batchSize != 10 { launchAppendFlags += fmt.Sprintf(" -b %d", batchSize) }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", batchSizeParamStr+"="+envvar, "batchSize", batchSize)) }

        //logger(fmt.Sprintf("DEBUG=====BatchTimeout conf:%v Seconds-float():%v Seconds-int:%v", genConf.Orderer.BatchTimeout, (genConf.Orderer.BatchTimeout).Seconds(), int((genConf.Orderer.BatchTimeout).Seconds())))

        batchTimeout := int((genConf.Orderer.BatchTimeout).Seconds()) // Seconds() converts time.Duration to float64, and then retypecast to int
        envvar = os.Getenv(batchTimeoutParamStr)
        //if batchTimeout != 10 { launchAppendFlags += fmt.Sprintf(" -c %d", batchTimeout) }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", batchTimeoutParamStr+"="+envvar, "batchTimeout", batchTimeout)) }

        // CoreLoggingLevel
        envvar = strings.ToUpper(os.Getenv("CORE_LOGGING_LEVEL")) // (default = not set)|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG
        if envvar != "" {
                launchAppendFlags += fmt.Sprintf(" -l %s", envvar)
        }
        if debugflagAPI { logger(fmt.Sprintf("CORE_LOGGING_LEVEL=%s", envvar)) }

        // CoreLedgerStateDB
        envvar = os.Getenv("CORE_LEDGER_STATE_STATEDATABASE")  // goleveldb | CouchDB
        if envvar != "" {
                launchAppendFlags += fmt.Sprintf(" -d %s", envvar)
        }
        if debugflagAPI { logger(fmt.Sprintf("CORE_LEDGER_STATE_STATEDATABASE=%s", envvar)) }


        //////////////////////////////////////////////////////////////////////////
        // Each producer sends TXs to one channel on one orderer, and increments
        // its own counters for the successfully sent Tx, and the send-failures
        // (rejected/timeout). These arrays are indexed by dimensions:
        // numOrdsInNtwk and numChannels

        var countToSend        [][]int64
        var txSent             [][]int64
        var txSentFailures     [][]int64
        var totalNumTxSent         int64
        var totalNumTxSentFailures int64

        // Each consumer receives blocks delivered on one channel from one
        // orderer, and must track its own counters for the received number of
        // blocks and received number of Tx.
        // We will create consumers for every channel on an orderer, and total
        // up the TXs received. And do that for all the orderers (indexed by
        // numOrdsToWatch). We will check to ensure all the orderers receive
        // all the same deliveries. These arrays are indexed by dimensions:
        // numOrdsToWatch and numChannels

        var txRecv       [][]int64
        var blockRecv    [][]int64
        var totalTxRecv    []int64 // total TXs rcvd by all consumers on an orderer, indexed by numOrdsToWatch
        var totalBlockRecv []int64 // total Blks recvd by all consumers on an orderer, indexed by numOrdsToWatch
        var totalTxRecvMismatch = false
        var totalBlockRecvMismatch = false
        var consumerConns [][]*grpc.ClientConn

        ////////////////////////////////////////////////////////////////////////
        // Create the 1D and 2D slices of counters for the producers and
        // consumers. All are initialized to zero.

        for i := 0; i < numOrdsInNtwk; i++ {                    // for all orderers

                countToSendForOrd := make([]int64, numChannels) // create a counter for all the channels on one orderer
                countToSend = append(countToSend, countToSendForOrd) // orderer-i gets a set

                sendPassCntrs := make([]int64, numChannels)     // create a counter for all the channels on one orderer
                txSent = append(txSent, sendPassCntrs)          // orderer-i gets a set

                sendFailCntrs := make([]int64, numChannels)     // create a counter for all the channels on one orderer
                txSentFailures = append(txSentFailures, sendFailCntrs) // orderer-i gets a set
        }

        for i := 0; i < numOrdsToWatch; i++ {  // for all orderers which we will watch/monitor for deliveries

                blockRecvCntrs := make([]int64, numChannels)  // create a set of block counters for each channel
                blockRecv = append(blockRecv, blockRecvCntrs) // orderer-i gets a set

                txRecvCntrs := make([]int64, numChannels)     // create a set of tx counters for each channel
                txRecv = append(txRecv, txRecvCntrs)          // orderer-i gets a set

                consumerRow := make([]*grpc.ClientConn, numChannels)
                consumerConns = append(consumerConns, consumerRow)
        }

        totalTxRecv    = make([]int64, numOrdsToWatch)  // create counter for each orderer, for total tx received (for all channels)
        totalBlockRecv = make([]int64, numOrdsToWatch)  // create counter for each orderer, for total blk received (for all channels)


        ////////////////////////////////////////////////////////////////////////

        //launchNetwork(launchAppendFlags)
        time.Sleep(12 * time.Second)

        ////////////////////////////////////////////////////////////////////////
        // Create the 1D slice of channel IDs, and create names for them
        // which we will use when producing/broadcasting/sending msgs and
        // consuming/delivering/receiving msgs.

        var channelIDs []string
        channelIDs = make([]string, numChannels)

        // TODO (after FAB-2001 and FAB-2083 are fixed) - Remove the if-then clause.
        // Due to those bugs, we cannot pass many tests using multiple orderers and multiple channels.
        // TEMPORARY PARTIAL SOLUTION: To test multiple orderers with a single channel,
        // use hardcoded TestChainID and skip creating any channels.
        if numChannels == 0 {
                //channelIDs[0] = genesisconfigProvisional.TestChainID
                logger(fmt.Sprintf("Using DEFAULT channelID = %s", channelIDs[0]))
        } else {
                logger(fmt.Sprintf("Using %d new channelIDs, e.g. testchan321", numChannels))
                // create all the channels using orderer0
                // CONFIGTX_ORDERER_ADDRESSES is the list of orderers. use the first one. Default is [127.0.0.1:7050]
                for c:=0; c < numChannels; c++ {
                          channelIDs[c] = fmt.Sprintf("%s%d", p.Channel, c+1)
                          cmd := fmt.Sprintf("peer channel create -o orderer0.example.com:7050 -c %s -f /var/hyperledger/fabric/artifacts/ordererOrganizations/%s.tx --tls --cafile /var/hyperledger/fabric/artifacts/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",  channelIDs[c],  channelIDs[c])
                          executeCmd(cmd)
                }
        }

        time.Sleep(5 * time.Second)

        ////////////////////////////////////////////////////////////////////////
        // Start threads for each consumer to watch each channel on all (the
        // specified number of) orderers. This code assumes orderers in the
        // network will use increasing port numbers, which is the same logic
        // used by the driver.sh tool that starts the network for us: the first
        // orderer uses ordStartPort, the second uses ordStartPort+1, etc.

        for ord := 0; ord < numOrdsToWatch; ord++ {
                serverAddr := fmt.Sprintf("%s", genConf.Orderer.Addresses[ord])
                if masterSpy != spyOff && ord == numOrdsToWatch-1 {
                        // Special case: this is the last row of counters,
                        // added (and incremented numOrdsToWatch) for the
                        // masterSpy to use to watch the first orderer for
                        // deliveries, on all channels. This will be a duplicate
                        // Consumer (it is the second one monitoring one of the
                        // orderers, masterSpyOrdIndx, selected by the user).

                        if masterSpy == spyOn {
                                serverAddr = fmt.Sprintf("%s", genConf.Orderer.Addresses[ord])
                                go startConsumerMaster(serverAddr, &channelIDs, ord, &(txRecv[ord]), &(blockRecv[ord]), &(consumerConns[ord][0]))
                        } else if masterSpy == spyDefer {
                                // startSpyDefer will start the MasterConsumer, but first
                                // waits until the user is ready and requests it by calling
                                // startMasterSpy with the index of the orderer to monitor.
                                go startSpyDefer(ordConf.General.ListenAddress, ordStartPort, &channelIDs, ord, &(txRecv[ord]), &(blockRecv[ord]), &(consumerConns[ord][0]))
                        }
                } else
                if optimizeClientsMode {
                        // Create just one Consumer to receive all deliveries
                        // (on all channels) on an orderer.
                        go startConsumerMaster(serverAddr, &channelIDs, ord, &(txRecv[ord]), &(blockRecv[ord]), &(consumerConns[ord][0]))
                } else {
                        // Normal mode: create a unique consumer client
                        // go-thread for each channel on each orderer.
                        for c := 0 ; c < numChannels ; c++ {
                                //consumerIdx := ord*numOrdsToWatch + c
                                go startConsumer(serverAddr, channelIDs[c], ord, c, &(txRecv[ord][c]), &(blockRecv[ord][c]), &(consumerConns[ord][c]), seek, quiet, tlsEnabled)
                        }
                }

        }

        logger("Finished creating all CONSUMERS clients")
        time.Sleep(5 * time.Second)
        defer cleanNetwork(&consumerConns)

        ////////////////////////////////////////////////////////////////////////
        // Now that the orderer service network is running, and the consumers
        // are watching for deliveries, we can start clients which will
        // broadcast the specified number of TXs to their associated orderers.

        if optimizeClientsMode {
                producersWG.Add(numOrdsInNtwk)
        } else {
                producersWG.Add(numProducers)
        }
        sendStart := time.Now().Unix()
        for ord := 0; ord < numOrdsInNtwk; ord++ {
                serverAddr := fmt.Sprintf("%s", genConf.Orderer.Addresses[ord])
                for c := 0 ; c < numChannels ; c++ {
                        countToSend[ord][c] = numTxToSend / int64(numOrdsInNtwk * numChannels)
                        if c==0 && ord==0 { countToSend[ord][c] += numTxToSend % int64(numOrdsInNtwk * numChannels) }
                }
                if optimizeClientsMode {
                        // create one Producer for all channels on this orderer
                        go startProducerMaster(serverAddr, &channelIDs, ord, &(countToSend[ord]), &(txSent[ord]), &(txSentFailures[ord]))
                } else {
                        // Normal mode: create a unique consumer client
                        // go thread for each channel
                        for c := 0 ; c < numChannels ; c++ {
                                go startProducer(serverAddr, channelIDs[c], ord, c, countToSend[ord][c], &(txSent[ord][c]), &(txSentFailures[ord][c]), tlsEnabled)
                        }
                }
        }

        if optimizeClientsMode {
                logger(fmt.Sprintf("Finished creating all %d MASTER-PRODUCERs at %v", numOrdsInNtwk, time.Now()))
        } else {
                logger(fmt.Sprintf("Finished creating all %d PRODUCERs at %v", numOrdsInNtwk * numChannels, time.Now()))
        }
        producersWG.Wait()
	sendDuration := (time.Now().Unix() - sendStart - 5) //5 is for time waited after creating the producer client to send the first transaction
        logger(fmt.Sprintf("Send Duration (seconds): %4d", sendDuration))
        recoverStart := time.Now().Unix()

        ////////////////////////////////////////////////////////////////////////
        // All producer threads are finished sending broadcast transactions.
        // Let's determine if the deliveries have all been received by the
        // consumer threads. We will check if the receive counts match the send
        // counts on all consumers, or if all consumers are no longer receiving
        // blocks. Wait and continue rechecking as necessary, as long as the
        // delivery (recv) counters are climbing closer to the broadcast (send)
        // counter. If the counts do not match, wait for up to batchTimeout
        // seconds, to ensure that we received the last (non-full) batch.

        computeTotals(&txSent, &totalNumTxSent, &txSentFailures, &totalNumTxSentFailures, &txRecv, &totalTxRecv, &totalTxRecvMismatch, &blockRecv, &totalBlockRecv, &totalBlockRecvMismatch)

        idleCount := 0
        waitSecs := 0
        for !sendEqualRecv(numTxToSend, &totalTxRecv, totalTxRecvMismatch, totalBlockRecvMismatch) {
                waitSecs += 1
                time.Sleep(1 * time.Second)
                // recheck every second for more messages
                if !(moreDeliveries(&txSent, &totalNumTxSent, &txSentFailures, &totalNumTxSentFailures, &txRecv, &totalTxRecv, &totalTxRecvMismatch, &blockRecv, &totalBlockRecv, &totalBlockRecvMismatch)) {
                        // idleCount keeps track of how long it has been since we last received a message.
                        // This is a stopgap, in case of code error miscount, or lost messages.
                        idleCount++
                        if idleCount >= (batchTimeout+30) {
                                waitSecs-=(batchTimeout+30)
                                break
                        }
                } else { idleCount=0 }
        }

        // Recovery Duration = time spent waiting for orderer service to finish delivering transactions,
        // after all producers finished sending them. AND if transactions were still missing, then
        // this includes the extra time (batchTimeout+30) we wasted, hoping they would arrive.
        recoveryDuration := (time.Now().Unix() - recoverStart)
        logger(fmt.Sprintf("Recovery Duration (secs):%4d", recoveryDuration))
        logger(fmt.Sprintf("waitSecs for last batch: %4d", waitSecs))
        testDuration := sendDuration + recoveryDuration - int64(idleCount)
        passed, resultSummary = reportTotals(testname, numTxToSend, countToSend, txSent, totalNumTxSent, txSentFailures, totalNumTxSentFailures, batchSize, txRecv, totalTxRecv, totalTxRecvMismatch, blockRecv, totalBlockRecv, totalBlockRecvMismatch, &channelIDs, testDuration)

        return passed, resultSummary
}

func main() {

        initialize()

        // Set reasonable defaults in case any env vars are unset.
        var txs int64 = 55
        chans    := numChannels
        orderers := numOrdsInNtwk
        ordType  := ordererType
        kbs      := numKBrokers

        pPerCh := producersPerCh
        // TODO lPerCh := listenersPerCh

        // Read env vars
        if debugflagAPI { logger("==========Environment variables provided for this test, and corresponding values actually used for the test:") }
        testcmd := ""
        envvar := os.Getenv("OTE_TXS")
        if envvar != "" { txs, _ = strconv.ParseInt(envvar, 10, 64); testcmd += " OTE_TXS="+envvar }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", "OTE_TXS="+envvar, "txs", txs)) }

        envvar = os.Getenv("OTE_CHANNELS")
        if envvar != "" { chans, _ = strconv.Atoi(envvar); testcmd += " OTE_CHANNELS="+envvar }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", "OTE_CHANNELS="+envvar, "chans", chans)) }

        envvar = os.Getenv("OTE_ORDERERS")
        if envvar != "" { orderers, _ = strconv.Atoi(envvar); testcmd += " OTE_ORDERERS="+envvar }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", "OTE_ORDERERS="+envvar, "orderers", orderers)) }

        envvar = os.Getenv(ordererTypeParamStr)
        if envvar != "" { ordType = envvar; testcmd += " "+ordererTypeParamStr+"="+envvar }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%s", ordererTypeParamStr+"="+envvar, "ordType", ordType)) }

        envvar = os.Getenv("OTE_KAFKABROKERS")
        if envvar != "" { kbs, _ = strconv.Atoi(envvar); testcmd += " OTE_KAFKABROKERS="+envvar }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", "OTE_KAFKABROKERS="+envvar, "kbs", kbs)) }

        envvar = os.Getenv("OTE_PRODUCERS_PER_CHANNEL")
        if envvar != "" { pPerCh, _ = strconv.Atoi(envvar); testcmd += " OTE_PRODUCERS_PER_CHANNEL="+envvar }
        if debugflagAPI { logger(fmt.Sprintf("%-50s %s=%d", "OTE_PRODUCERS_PER_CHANNEL="+envvar, "producersPerCh", pPerCh)) }

        _, _ = ote( "<commandline>"+testcmd+" ote", txs, chans, orderers, ordType, kbs, -1, pPerCh)
}
