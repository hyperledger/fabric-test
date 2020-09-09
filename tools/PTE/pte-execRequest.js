/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/*
 *   usage:
 *      node pte-execRequest.js <pid> <Nid> <uiFile> <tStart> <org> <PTEid>
 *        - pid: process id
 *        - Nid: Network id
 *        - uiFile: user input file
 *        - tStart: tStart
 *        - org: organization
 *        - PTEid: PTE id
 */
// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

var fs = require('fs');
var hfc = require('fabric-client');
var path = require('path');
var testUtil = require('./pte-util.js');
var util = require('util');

var PTEid = process.argv[7];
var loggerMsg = 'PTE ' + PTEid + ' exec';
var logger = new testUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });

// local vars
var tCurr;
var tEnd = 0;
var tLocal;
var i = 0;
var inv_m = 0;    // counter of invoke move
var inv_q = 0;    // counter of invoke query
var n_sd = 0;     // counter of service discovery
var evtType = 'FILTEREDBLOCK';        // event type: FILTEREDBLOCK|CHANNEL, default: FILTEREDBLOCK
var evtTimeout = 120000;              // event timeout, default: 120000 ms
var evtLastRcvdTime = 0;              // last event received time
var evtCode_VALID = 0;                // event valid code as defined in TxValidationCode in fabric transaction.pb.go (channel block only)
var lastSentTime = 0;                 // last transaction sent time
var IDone = 0;
var QDone = 0;
var invokeCheckExec = false;
var invokeCheck = new Boolean(0);
var invokeCheckPeers = 'NONE';
var invokeCheckTx = 'NONE';
var invokeCheckTxNum = 0;
var chaincode_id;
var chaincode_ver;
var tx_id = null;
var eventHubs = [];
var targets = [];
var eventPromises = [];
var txidList = [];
var initFreq = 0;     // init discovery freq default = 0
var initDiscTimer;
var serviceDiscovery = false;
var localHost = false;
var ARGS_DIR = path.join(__dirname, 'ccArgumentsGenerators');

var requestQueue = [];
var maxRequestQueueLength = 100;

// transactions status counts
var tx_stats = [];
var tx_sent = 0;                                 // tx_stats idx: total transactions sent
var tx_rcvd = tx_sent + 1;                         // tx_stats idx: total transactions succeeded (event or query results received)
var tx_pFail = tx_rcvd + 1;                        // tx_stats idx: total proposal (peer) failure
var tx_txFail = tx_pFail + 1;                      // tx_stats idx: total transaction (orderer ack) failure
var tx_evtTimeout = tx_txFail + 1;                 // tx_stats idx: total event timeout
var tx_evtInvalid = tx_evtTimeout + 1;             // tx_stats idx: total event received but invalid
var tx_evtUnreceived = tx_evtInvalid + 1;          // tx_stats idx: total event unreceived
for (var i = 0; i <= tx_evtUnreceived; i++) {
    tx_stats[i] = 0;
}
// need to override the default key size 384 to match the member service backend
// otherwise the client will not be able to decrypt the enrollment challenge
hfc.setConfigSetting('crypto-keysize', 256);

// need to override the default hash algorithm (SHA3) to SHA2 (aka SHA256 when combined
// with the key size 256 above), in order to match what the peer and COP use
hfc.setConfigSetting('crypto-hash-algo', 'SHA2');

//input args
var pid = parseInt(process.argv[2]);
var Nid = parseInt(process.argv[3]);
var uiFile = process.argv[4];
var tStart = parseInt(process.argv[5]);
var org = process.argv[6];
var uiContent;
var txCfgPtr;
var txCfgTmp;
if (fs.existsSync(uiFile)) {
    uiContent = testUtil.readConfigFileSubmitter(uiFile);
    if (!uiContent.hasOwnProperty('txCfgPtr')) {
        txCfgTmp = uiFile;
    } else {
        txCfgTmp = uiContent.txCfgPtr;
    }
    txCfgPtr = testUtil.readConfigFileSubmitter(txCfgTmp);
    logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input txCfgPtr[%s]: %j', Nid, channelName, org, pid, txCfgTmp, txCfgPtr);
} else {
    uiContent = JSON.parse(uiFile)
    txCfgPtr = uiContent
}
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input uiContent[%s]: %j', Nid, channelName, org, pid, uiFile, uiContent);

var channelOpt = uiContent.channelOpt;
var channelOrgName = [];
var channelName = channelOpt.name;
for (i = 0; i < channelOpt.orgName.length; i++) {
    channelOrgName.push(channelOpt.orgName[i]);
}

var distOpt;

var ccDfnPtr;
var ccDfntmp;
if (!uiContent.hasOwnProperty('ccDfnPtr')) {
    ccDfntmp = uiFile;
} else {
    ccDfntmp = uiContent.ccDfnPtr;
}
ccDfnPtr = uiContent;
if (fs.existsSync(uiFile)) {
    ccDfnPtr = testUtil.readConfigFileSubmitter(ccDfntmp);
}
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input ccDfnPtr[%s]: %j', Nid, channelName, org, pid, ccDfntmp, ccDfnPtr);

var ccType = ccDfnPtr.ccType;
if (!fs.existsSync(ARGS_DIR + '/' + ccType + '/ccFunctions.js')) {
    logger.error('No chaincode payload generation files found: ', ARGS_DIR + '/' + ccType + '/ccFunctions.js');
    process.exit(1);
}
var ccFunctions = require(ARGS_DIR + '/' + ccType + '/ccFunctions.js');
var TLS = testUtil.setTLS(txCfgPtr);

var targetPeers = txCfgPtr.targetPeers.toUpperCase();
if (targetPeers == 'DISCOVERY' && TLS != testUtil.TLSCLIENTAUTH) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invalid configuration: targetPeers (%s) requires TLS (clientauth)', Nid, channelName, org, pid, txCfgPtr.targetPeers);
    process.exit(1);
}
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: uiFile=%s, tStart=%d', Nid, channelName, org, pid, uiFile, tStart);
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] TLS: %s', Nid, channelName, org, pid, TLS);
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] targetPeers: %s', Nid, channelName, org, pid, targetPeers.toUpperCase());
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] channelOrgName.length: %d, channelOrgName: %s', Nid, channelName, org, pid, channelOrgName.length, channelOrgName);

var client = new hfc();
var channel = client.newChannel(channelName);

if ((txCfgPtr.hasOwnProperty('eventOpt')) && (txCfgPtr.eventOpt.hasOwnProperty('type'))) {
    evtType = txCfgPtr.eventOpt.type.toUpperCase();
    if ((evtType != 'FILTEREDBLOCK') && (evtType != 'CHANNEL')) {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] unsupported event type: %s', Nid, channelName, org, pid, evtType);
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] supported event types: FilteredBlock and Channel', Nid, channelName, org, pid);
        process.exit(1);
    }
}
if ((txCfgPtr.hasOwnProperty('eventOpt')) && (txCfgPtr.eventOpt.hasOwnProperty('timeout'))) {
    evtTimeout = txCfgPtr.eventOpt.timeout;
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] event type: %s, timeout: %d', Nid, channel.getName(), org, pid, evtType, evtTimeout);

if (txCfgPtr.hasOwnProperty('invokeCheck')) {
    if (txCfgPtr.invokeCheck == 'TRUE') {
        invokeCheck = true;
    } else if (txCfgPtr.invokeCheck == 'FALSE') {
        invokeCheck = false;
    } else {
        invokeCheck = txCfgPtr.invokeCheck;
    }
    if (invokeCheck) {
        if (txCfgPtr.invokeCheckOpt) {
            if (txCfgPtr.invokeCheckOpt.peers) {
                invokeCheckPeers = txCfgPtr.invokeCheckOpt.peers.toUpperCase();
            } else {
                invokeCheckPeers = txCfgPtr.targetPeers.toUpperCase();
            }
            if (txCfgPtr.invokeCheckOpt.transactions) {
                invokeCheckTx = txCfgPtr.invokeCheckOpt.transactions.toUpperCase();
            } else {
                invokeCheckTx = 'LAST';
            }
            if (txCfgPtr.invokeCheckOpt.txNum) {
                invokeCheckTxNum = parseInt(txCfgPtr.invokeCheckOpt.txNum);
            } else {
                invokeCheckTxNum = 1;
            }
        } else {
            invokeCheckPeers = txCfgPtr.targetPeers.toUpperCase();
            invokeCheckTx = 'LAST';
            invokeCheckTxNum = 1;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invokeCheck: peers=%s, tx=%s, num=%d', Nid, channel.getName(), org, pid, invokeCheckPeers, invokeCheckTx, invokeCheckTxNum);
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invokeCheck: %j', Nid, channel.getName(), org, pid, invokeCheck);

var channelID = uiContent.channelID;
chaincode_id = uiContent.chaincodeID
if (channelID) {
    chaincode_id = uiContent.chaincodeID + channelID;
}
var endorsement_hint = {chaincodes: [{name: chaincode_id}]}
chaincode_ver = uiContent.chaincodeVer;
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] chaincode_id: %s', Nid, channel.getName(), org, pid, chaincode_id);

// find all connection profiles
var cpList = [];
var cpPath = uiContent.ConnProfilePath;
logger.debug('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] connection profile path: ', Nid, channel.getName(), org, pid, cpPath);
cpList = testUtil.getConnProfileListSubmitter(cpPath);
if (cpList.length === 0) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] error: invalid connection profile path or no connection profiles found in the connection profile path: %s', Nid, channel.getName(), org, pid, cpPath);
    process.exit(1);
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] cpList: ', Nid, channel.getName(), org, pid, cpList);

// find all org from all connection profiles
var orgList = [];
orgList = testUtil.findAllOrgFromConnProfileSubmitter(cpList);
if (orgList.length === 0) {
    logger.error('[Nid=%d pte-main] error: no org contained in connection profiles', Nid);
    process.exit(1);
}
logger.info('[Nid=%d pte-main] orgList: ', Nid, orgList);

var orderersCPFList = {};
orderersCPFList = testUtil.getNodetypeFromConnProfilesSubmitter(cpList, 'orderers');

// set org connection profile
var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
if (0 === testUtil.getConnProfilePropCntSubmitter(cpf, 'orderers')) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] no orderer found in the connection profile', Nid, channel.getName(), org, pid);
    process.exit(1);
}
if (0 === testUtil.getConnProfilePropCntSubmitter(cpf, 'peers')) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] no peer found in the connection profile', Nid, channel.getName(), org, pid);
    process.exit(1);
}
var cpOrgs = cpf['organizations'];
var cpPeers = cpf['peers'];

var users = hfc.getConfigSetting('users');

//user parameters
var transMode = txCfgPtr.transMode.toUpperCase();
var transType = txCfgPtr.transType.toUpperCase();
var invokeType = txCfgPtr.invokeType.toUpperCase();
var nRequest = parseInt(txCfgPtr.nRequest);

if (transType == 'DISCOVERY' && TLS != testUtil.TLSCLIENTAUTH) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invalid configuration: transType (%s) requires mutual TLS (clientauth)', Nid, channelName, org, pid, transType);
    process.exit(1);
}

logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] transMode: %s, transType: %s, invokeType: %s, nRequest: %d', Nid, channel.getName(), org, pid, transMode, transType, invokeType, nRequest);


// orderer parameters
var ordererMethod = 'USERDEFINED';    // default method
if (txCfgPtr.hasOwnProperty('ordererOpt') && txCfgPtr.ordererOpt.hasOwnProperty('method')) {
    ordererMethod = txCfgPtr.ordererOpt.method.toUpperCase();
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: ordererMethod=%s', Nid, channelName, org, pid, ordererMethod);

//failover parameters
var peerList = [];
var currPeerId = 0;
var ordererList = [];
var currOrdererId = 0;
var peerFO = false;
var ordererFO = false;
var peerFOList = 'TARGETPEERS';
var peerFOMethod = 'ROUNDROBIN';

// failover is handled by SDK in discovery mode
if (targetPeers != 'DISCOVERY') {
    if (txCfgPtr.hasOwnProperty('peerFailover')) {
        if (txCfgPtr.peerFailover == 'TRUE') {
            peerFO = true;
        } else if (txCfgPtr.peerFailover == 'FALSE') {
            peerFO = false;
        } else {
            peerFO = txCfgPtr.peerFailover;
        }
    }
    if (txCfgPtr.hasOwnProperty('ordererFailover')) {
        if (txCfgPtr.ordererFailover == 'TRUE') {
            ordererFO = true;
        } else if (txCfgPtr.ordererFailover == 'FALSE') {
            ordererFO = false;
        } else {
            ordererFO = txCfgPtr.ordererFailover;
        }
    }
}
if (peerFO) {
    if (txCfgPtr.hasOwnProperty('failoverOpt')) {
        if (txCfgPtr.failoverOpt.hasOwnProperty('list')) {
            peerFOList = txCfgPtr.failoverOpt.list.toUpperCase();
        }
        if (txCfgPtr.failoverOpt.hasOwnProperty('method')) {
            peerFOMethod = txCfgPtr.failoverOpt.method.toUpperCase();
        }
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: peerFO=%s, ordererFO=%s, peerFOList=%s, peerFOMethod=%s', Nid, channelName, org, pid, peerFO, ordererFO, peerFOList, peerFOMethod);

var runDur = 0;
if (nRequest == 0) {
    runDur = parseInt(txCfgPtr.runDur);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] transMode: %s, transType: %s, invokeType: %s, runDur: %d', Nid, channel.getName(), org, pid, transMode, transType, invokeType, runDur);
    // convert runDur from second to ms
    runDur = 1000 * runDur;
}

var runForever = 0;
if ((nRequest == 0) && (runDur == 0)) {
    runForever = 1;
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] runForever: %d', Nid, channel.getName(), org, pid, runForever);

// timeout option
var timeoutOpt;
var reqTimeout = 45000;     // default 45 sec
var grpcTimeout = 3000;     // default 3 sec
if (txCfgPtr.hasOwnProperty('timeoutOpt')) {
    timeoutOpt = txCfgPtr.timeoutOpt;
    logger.info('main - timeoutOpt: %j', timeoutOpt);
    if (timeoutOpt.hasOwnProperty('request')) {
        reqTimeout = parseInt(timeoutOpt.request);
    }
    if (timeoutOpt.hasOwnProperty('grpcTimeout')) {
        grpcTimeout = parseInt(timeoutOpt.grpcTimeout);
        hfc.setConfigSetting('grpc-wait-for-ready-timeout', grpcTimeout);
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] reqTimeout: %d, grpcTimeout: %d', Nid, channel.getName(), org, pid, reqTimeout, grpcTimeout);

// init latencies matrix: tx num/avg/min/max
var latency_peer = [0, 0, 99999999, 0];
var latency_orderer = [0, 0, 99999999, 0];
var latency_event = [0, 0, 99999999, 0];

// Create instance of the chaincode function argument generation class
var ccFuncInst = new ccFunctions(ccDfnPtr, logger, Nid, channel.getName(), org, pid);
//set transaction ID: channelName+'_'+org+'_'+Nid+'_'+pid
var txIDVar = channelName + '_' + org + '_' + Nid + '_' + pid;
var bookmark = '';
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] tx IDVar: ', Nid, channel.getName(), org, pid, txIDVar);
var ccFunctionAccessPolicy = {};
if (ccFuncInst.getAccessControlPolicyMap) {		// Load access control policy for chaincode is specified
    ccFunctionAccessPolicy = ccFuncInst.getAccessControlPolicyMap();
}
var orgAdmins = {};		// Map org names to client handles

/*
 *   transactions begin ....
 */
execTransMode();

//construct invoke request
var request_invoke;
function getMoveRequest() {
    // Get the invoke arguments from the appropriate payload generation files
    ccFuncInst.getInvokeArgs(txIDVar);

    // Set the approprate signing identity for this function based on access policy
    // If the function has no access control, we can use any signing identity
    var orgsForAccess = ccFunctionAccessPolicy[ccDfnPtr.invoke.move.fcn];
    if (orgsForAccess && Array.isArray(orgsForAccess) && orgsForAccess.length > 0 && orgAdmins[orgsForAccess[0]]) {
        client.setUserContext(orgAdmins[orgsForAccess[0]], false);		// Just pick the first organization that satisfies the policy
    }

    tx_id = client.newTransactionID();
    hfc.setConfigSetting('E2E_TX_ID', tx_id.getTransactionID());
    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] tx id= %s', Nid, channelName, org, pid, tx_id.getTransactionID().toString());

    request_invoke = {
        chaincodeId: chaincode_id,
        endorsement_hint: endorsement_hint,
        fcn: ccDfnPtr.invoke.move.fcn,
        args: ccFuncInst.testInvokeArgs,
        transientMap: ccFuncInst.testInvokeTransientMapEncoded,
        txId: tx_id
    };

    if ((inv_m == nRequest) && (nRequest > 0)) {
        if (invokeCheck) {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] request_invoke: %j', Nid, channel.getName(), org, pid, request_invoke);
        }
    }

    var ri = Object.assign({}, request_invoke);
    return ri;
}

//construct query request
var request_query;
function getQueryRequest() {
    // Get the query arguments from the appropriate payload generation files
    ccFuncInst.getQueryArgs(txIDVar, bookmark);

    // Set the approprate signing identity for this function based on access policy
    // If the function has no access control, we can use any signing identity
    var orgsForAccess = ccFunctionAccessPolicy[ccDfnPtr.invoke.query.fcn];
    if (orgsForAccess && Array.isArray(orgsForAccess) && orgsForAccess.length > 0 && orgAdmins[orgsForAccess[0]]) {
        client.setUserContext(orgAdmins[orgsForAccess[0]], false);		// Just pick the first organization that satisfies the policy
    }

    tx_id = client.newTransactionID();
    request_query = {
        chaincodeId: chaincode_id,
        endorsement_hint: endorsement_hint,
        txId: tx_id,
        fcn: ccDfnPtr.invoke.query.fcn,
        args: ccFuncInst.testQueryArgs
    };
    //logger.info('request_query: %j', request_query);
}

function listenToEventHub() {
    // add event if Block listener
    if (evtType == 'FILTEREDBLOCK') {
        // filteredBlock event
        eventRegisterFilteredBlock();
    } else {
        // channel event
        eventRegisterBlock();
    }
}

var reConnectEvtHub = 0;
function peerFailover(channel, client) {
    // return if no peer failover or using discovery to send transactions
    // SDK handles failover when using discovery
    if ((!peerFO) || (targetPeers === 'DISCOVERY')) {
        return;
    }

    var currId = currPeerId;
    var eh;
    channel.removePeer(peerList[currPeerId]);
    if (peerFOMethod == 'RANDOM') {
        var r = Math.floor(Math.random() * (peerList.length - 1));
        if (r >= currPeerId) {
            currPeerId = r + 1;
        } else {
            currPeerId = r;
        }
    } else if (peerFOMethod == 'ROUNDROBIN') {
        currPeerId = currPeerId + 1;
    }
    currPeerId = currPeerId % peerList.length;
    channel.addPeer(peerList[currPeerId]);

    //handle channel eventHubs if evtType == CHANNEL
    if (invokeType == 'MOVE') {
        //delete channel eventHubs
        for (var i = 0; i < eventHubs.length; i++) {
            var str = peerList[currId]._url.split('//');
            if ((eventHubs[i].getPeerAddr()) && (str[1] == eventHubs[i].getPeerAddr())) {
                eventHubs[i].disconnect()
                delete eventHubs[i];
            }
        }
        //add channel eventHubs
        var str = peerList[currPeerId]._url.split('//');
        var found = 0;
        for (var i = 0; i < eventHubs.length; i++) {
            if ((eventHubs[i].getPeerAddr()) && (str[1] == eventHubs[i].getPeerAddr())) {
                found = 1;
                break;
            }
        }
        if (found == 0) {
            eh = channel.newChannelEventHub(peerList[currPeerId]);
            eventHubs.push(eh);
            if (evtType == 'FILTEREDBLOCK') {
                eh.connect();
            } else {
                eh.connect(true);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d peerFailover] from (%s) to (%s)', Nid, channel.getName(), org, pid, peerList[currId]._url, peerList[currPeerId]._url);
}

// set currPeerId
function setCurrPeerId(channel, client, org) {
    var peerUrl = channel.getPeers()[0]._url;
    var i;
    for (i = 0; i < peerList.length; i++) {
        if (peerList[i]._url === peerUrl) {
            currPeerId = i;
        }
    }
    logger.debug('[Nid:chan:org:id=%d:%s:%s:%d setCurrPeerId] currPeerId:  ', Nid, channelName, org, pid, currPeerId);
}

function removeAllPeers() {
    var peers = channel.getPeers();
    for (var i = 0; i < peers.length; i++) {
        logger.debug('[Nid:chan:org:id=%d:%s:%s:%d setCurrPeerId] removeAllPeers: %s', Nid, channelName, org, pid, peers[i]);
        channel.removePeer(peers[i]);
    }
}

// assign peer list from all org for peer failover
function assignPeerList(channel, client, org) {
    logger.info('[Nid:chan:id=%d:%s:%d assignPeerList]', Nid, channel.getName(), pid);
    var peerTmp;
    var eh;
    var data;

    for (let orgtmp in cpOrgs) {
        for (let i = 0; i < cpOrgs[orgtmp]['peers'].length; i++) {
            var key = cpOrgs[orgtmp]['peers'][i];
            if (cpPeers.hasOwnProperty(key)) {
                if (cpPeers[key].url) {
                    if (TLS > testUtil.TLSDISABLED) {
                        data = testUtil.getTLSCert(orgtmp, key, cpf, cpPath);
                        if (data !== null) {
                            peerTmp = client.newPeer(
                                cpPeers[key].url,
                                {
                                    pem: Buffer.from(data).toString(),
                                    'ssl-target-name-override': cpPeers[key]['grpcOptions']['ssl-target-name-override']
                                }
                            );
                            peerList.push(peerTmp);
                        }
                    } else {
                        peerTmp = client.newPeer(cpPeers[key].url);
                        peerList.push(peerTmp);
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:id=%d:%s:%d assignPeerList] peerList', Nid, channel.getName(), pid, peerList);
}

function channelDiscoveryEvent(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelDiscoveryEvent]', Nid, channelName, org, pid);
    var peerTmp = channel.getPeers();
    if (invokeType == 'MOVE') {
        for (var u = 0; u < peerTmp.length; u++) {
            var eh = channel.newChannelEventHub(peerTmp[u]);
            eventHubs.push(eh);
            if (evtType == 'FILTEREDBLOCK') {
                eh.connect();
            } else {
                eh.connect(true);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelDiscoveryEvent] event length: %d', Nid, channelName, org, pid, eventHubs.length);
}

function clearInitDiscTimeout() {
    if (initFreq > 0) {
        logger.debug('[Nid:chan:org:id=%d:%s:%s:%d clearInitDiscTimeout] clear discovery timer.', Nid, channelName, org, pid);
        clearTimeout(initDiscTimer);
    }
}

function initDiscovery() {
    var tmpTime = new Date().getTime();
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] discovery timestamp %d, endorsement_hint: %j', Nid, channelName, org, pid, tmpTime, endorsement_hint);
    channel.initialize({
        discover: serviceDiscovery,
        asLocalhost: localHost
    })
        .then((success) => {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] discovery results %j', Nid, channelName, org, pid, success);
            if (targetPeers === 'DISCOVERY') {
                channelDiscoveryEvent(channel, client, org);
                logger.debug('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] discovery: completed events ports', Nid, channelName, org, pid);
            }
        }).catch((err) => {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] Failed to wait due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err)
            process.exit(1)
        });

    if (initFreq > 0) {
        initDiscTimer = setTimeout(function () {
            initDiscovery();
        }, initFreq);
    }
}

// reconnect orderer
function ordererReconnect(channel, client, org) {
    // SDK handles failover when using discovery
    if (targetPeers === 'DISCOVERY') {
        return;
    }

    channel.removeOrderer(ordererList[currOrdererId]);
    testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS)
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d ordererReconnect] Orderer reconnect (%s)', Nid, channel.getName(), org, pid, ordererList[currOrdererId]._url);
}

// orderer failover
function ordererFailover(channel, client) {
    // return if no orderer failover or using discovery to send transactions
    // SDK handles failover when using discovery
    if ((!ordererFO) || (targetPeers === 'DISCOVERY')) {
        return;
    }

    var currId = currOrdererId;
    channel.removeOrderer(ordererList[currOrdererId]);
    currOrdererId = currOrdererId + 1;
    currOrdererId = currOrdererId % ordererList.length;
    channel.addOrderer(ordererList[currOrdererId]);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d ordererFailover] Orderer failover from (%s) to (%s):', Nid, channel.getName(), org, pid, ordererList[currId]._url, ordererList[currOrdererId]._url);
}

// set currOrdererId
function setCurrOrdererId(channel, client, org) {
    // assign ordererID
    var ordererID = testUtil.getOrdererID(pid, channelOpt.orgName, org, txCfgPtr, cpf, ordererMethod, cpPath);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d setCurrOrdererId] orderer[%s] is assigned to this thread', Nid, channelName, org, pid, ordererID);

    var i;
    for (i = 0; i < ordererList.length; i++) {
        if (ordererList[i]._url === orderersCPFList[ordererID].url) {
            currOrdererId = i;
        }
    }
    logger.debug('[Nid:chan:org:id=%d:%s:%s:%d setCurrOrdererId] currOrdererId:', Nid, channelName, org, pid, currOrdererId);
}

// assign Orderer List for orderer failover
function assignOrdererList(channel, client) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignOrdererList] ', Nid, channelName, org, pid);
    var data;
    var ordererTmp;

    for (let key in orderersCPFList) {
        if (orderersCPFList[key].url) {
            if (TLS > testUtil.TLSDISABLED) {
                data = testUtil.getTLSCert('orderer', key, cpf, cpPath);
                if (data !== null) {
                    let caroots = Buffer.from(data).toString();

                    ordererTmp = client.newOrderer(
                        orderersCPFList[key].url,
                        {
                            pem: caroots,
                            'ssl-target-name-override': orderersCPFList[key]['grpcOptions']['ssl-target-name-override']
                        }
                    )
                    ordererList.push(ordererTmp);
                }
            } else {
                ordererTmp = client.newOrderer(orderersCPFList[key].url);
                ordererList.push(ordererTmp);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignOrdererList] orderer list: %s', Nid, channelName, org, pid, ordererList);
}


// add target peers to channel
function setTargetPeers(tPeers) {
    var tgtPeers = [];
    if (tPeers == 'ORGANCHOR') {
        tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, channelOrgName, 'ANCHORPEER')
        if ( tgtPeers ) {
            testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
        }
    } else if (tPeers == 'ALLANCHORS') {
        tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, orgList, 'ANCHORPEER')
        if ( tgtPeers ) {
            testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
        }
    } else if (tPeers == 'ORGPEERS') {
        tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, channelOrgName, 'ALLPEERS')
        if ( tgtPeers ) {
            testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
        }
    } else if (tPeers == 'ALLPEERS') {
        tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, orgList, 'ALLPEERS')
        if ( tgtPeers ) {
            testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
        }
    } else if (tPeers == 'LIST') {
        tgtPeers = txCfgPtr.listOpt;
        if ( tgtPeers ) {
            testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
        }
    } else if (tPeers == 'ROUNDROBIN') {
        tgtPeers[org] = [];
        tgtPeers[org].push(testUtil.getPeerID(pid, org, txCfgPtr, cpf, tPeers));
        testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
    } else if ((tPeers == 'DISCOVERY') || (transType == 'DISCOVERY')) {
        serviceDiscovery = true;
        if (txCfgPtr.hasOwnProperty('discoveryOpt')) {
            var discoveryOpt = txCfgPtr.discoveryOpt;
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d setTargetPeers] discoveryOpt: %j', Nid, channelName, org, pid, discoveryOpt);
            if (discoveryOpt.hasOwnProperty('localHost')) {
                if (discoveryOpt.localHost == 'TRUE') {
                    localHost = true;
                }
            }
            if (discoveryOpt.hasOwnProperty('collection')) {
                endorsement_hint['chaincodes'] = [
                    {name: chaincode_id, collection_names: txCfgPtr.discoveryOpt.collection}
                ];
            }
            if (discoveryOpt.hasOwnProperty('initFreq')) {
                initFreq = parseInt(discoveryOpt.initFreq);
            }
        }

        // add one peer to channel to init service discovery
        for (var j=0; j<channelOrgName.length; j++) {
            var discOrg1 = [];
            discOrg1 = channelOrgName.slice(j,j+1);
            tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, discOrg1, 'ANCHORPEER')
            if ( tgtPeers ) {
                testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, evtType, invokeType, peerFOList, peerList, eventHubs);
                break;    // break once one peer is found
            }
        }
        if ((tPeers == 'DISCOVERY') || (transType == 'DISCOVERY')) {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d setTargetPeers] serviceDiscovery=%j, localHost: %j', Nid, channelName, org, pid, serviceDiscovery, localHost);
            initDiscovery();
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d setTargetPeers] pte-exec:completed:error targetPeers= %s', Nid, channelName, org, pid, tPeers);
        process.exit(1);
    }
}

function getSubmitterForOrg(username, secret, client, peerOrgAdmin, Nid, org) {
    var cpf1 = testUtil.findOrgConnProfileSubmitter(cpList, org);
    return testUtil.getSubmitter(username, secret, client, peerOrgAdmin, Nid, org, cpf1);
}

async function execTransMode() {
    try {
        // init vars
        inv_m = 0;
        inv_q = 0;

        var username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
        var secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);
        logger.debug('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] user= %s, secret=%s', Nid, channelName, org, pid, username, secret);

        //handle client auth
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, org, cpf);
            logger.debug('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] got user private key: org=%s', Nid, channelName, org, pid, org);
        }

        var cryptoSuite = hfc.newCryptoSuite();
        var useStore = true;
        if (useStore) {
            cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(Nid, cpOrgs[org].name) }));
            client.setCryptoSuite(cryptoSuite);
        }

        //enroll user
        var promise;
        hfc.setConfigSetting('request-timeout', reqTimeout);
        if (useStore) {
            promise = hfc.newDefaultKeyValueStore({
                path: testUtil.storePathForOrg(Nid, cpOrgs[org].name)
            });
        } else {
            promise = Promise.resolve(useStore);
        }

        return promise.then((store) => {
            if (store) {
                client.setStateStore(store);
            }
            client._userContext = null;
            var getSubmitterForOrgPromises = [];
            channelOrgName.forEach((orgName) => {
                getSubmitterForOrgPromises.push(getSubmitterForOrg);
            })
            return getSubmitterForOrgPromises.reduce(
                (promiseChain, currentFunction, currentIndex) =>
                    promiseChain.then((admin) => {
                        if (currentIndex > 0) {
                            orgAdmins[channelOrgName[currentIndex - 1]] = admin;
                        }
                        return currentFunction(username, secret, client, true, Nid, channelOrgName[currentIndex], cpf);
                    }), Promise.resolve()
            );
        }).then(
            function (admin) {
                orgAdmins[channelOrgName[channelOrgName.length - 1]] = admin;

                logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] Successfully loaded user \'admin\'', Nid, channelName, org, pid);

                if (targetPeers != 'DISCOVERY') {
                    assignOrdererList(channel, client);
                    testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS)
                    setCurrOrdererId(channel, client, org);

                    if (peerFOList == 'ALL') {
                        assignPeerList(channel, client, org);
                    }
                }

                // add target peers to channel
                setTargetPeers(targetPeers);

                // add event
                listenToEventHub();

                if (targetPeers != 'DISCOVERY') {
                    setCurrPeerId(channel, client, org);
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] peerList: ', Nid, channelName, org, pid, peerList);
                }

                // execute transactions
                tCurr = new Date().getTime();
                var tSynchUp = tStart - tCurr;
                if (tSynchUp < 10000) {
                    tSynchUp = 10000;
                }
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] execTransMode: tCurr= %d, tStart= %d, time to wait=%d', Nid, channelName, org, pid, tCurr, tStart, tSynchUp);

                setTimeout(function () {
                    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] get peers %j', Nid, channelName, org, pid, channel.getPeers());
                    if (transType == 'DISCOVERY') {
                        execModeDiscovery();
                    } else if (transMode == 'CONSTANT') {
                        distOpt = txCfgPtr.constantOpt;
                        execModeConstant();
                    } else if (transMode == 'POISSON') {
                        distOpt = txCfgPtr.poissonOpt;
                        execModePoisson();
                    } else if (transMode == 'LATENCY') {
                        execModeLatency();
                    } else {
                        // invalid transaction request
                        logger.error(util.format("[Nid:chan:org:id=%d:%s:%s:%d execTransMode] pte-exec:completed:error Transaction %j and/or mode %s invalid", Nid, channelName, org, pid, transType, transMode));
                        process.exit(1);
                    }
                }, tSynchUp);
            }
        ).catch((err) => {
            logger.error(err);
            evtDisconnect();
            process.exit(1);
        });
    } catch (err) {
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

function isExecDone(trType) {
    tCurr = new Date().getTime();
    if (trType.toUpperCase() == 'MOVE') {
        if (nRequest > 0) {
            if ((inv_m % (nRequest / 10)) == 0) {
                logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, evtTimeoutCnt=%d, elapsed time= %d",
                    Nid, channelName, org, pid, trType, inv_m, tx_stats[tx_evtTimeout], tCurr - tLocal));
            }

            if (inv_m >= nRequest) {
                IDone = 1;
            }
        } else {
            if ((inv_m % 1000) == 0) {
                logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, evtTimeoutCnt=%d, elapsed time= %d",
                    Nid, channelName, org, pid, trType, inv_m, tx_stats[tx_evtTimeout], tCurr - tLocal));
            }

            if (runForever == 0) {
                if (tCurr > tEnd) {
                    IDone = 1;
                }
            }
        }

        // set a guard timer that extends past the time when all events for all invoke TXs should have been received or timed out.
        // If this guard timer times out, then that means at least one invoke TX did not make it,
        // and cleanup has not happened so we can finish and clean up now.
        if (IDone == 1) {
            clearInitDiscTimeout();
            lastSentTime = new Date().getTime();
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d isExecDone] setup Timeout: %d ms, curr time: %d', Nid, channelName, org, pid, evtTimeout, lastSentTime);
            setTimeout(function () {
                postEventProc('isExecDone', tx_stats);
                if (!invokeCheck) {
                    process.exit();
                }
            }, evtTimeout);
        }
    } else if (trType.toUpperCase() == 'QUERY') {
        if (nRequest > 0) {
            if ((!invokeCheckExec) && ((inv_q % (nRequest / 10)) == 0)) {
                logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                    Nid, channelName, org, pid, trType, inv_q, tCurr - tLocal));
            }

            if (inv_q >= nRequest) {
                QDone = 1;
                clearInitDiscTimeout();
            }
        } else {
            if ((!invokeCheckExec) && ((inv_q % 1000) == 0)) {
                logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                    Nid, channelName, org, pid, trType, inv_q, tCurr - tLocal));
            }

            if (runForever == 0) {
                if (tCurr > tEnd) {
                    QDone = 1;
                    clearInitDiscTimeout();
                }
            }
        }
    } else if (trType.toUpperCase() == 'DISCOVERY') {
        if (nRequest > 0) {
            if ((n_sd % (nRequest / 10)) == 0) {
                logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                    Nid, channelName, org, pid, trType, n_sd, tCurr - tLocal));
            }

            if (n_sd >= nRequest) {
                IDone = 1;
                clearInitDiscTimeout();
            }
        } else {
            if ((n_sd % 1000) == 0) {
                logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                    Nid, channelName, org, pid, trType, n_sd, tCurr - tLocal));
            }

            if (runForever == 0) {
                if (tCurr > tEnd) {
                    IDone = 1;
                    clearInitDiscTimeout();
                }
            }
        }
    }
}

//IDoneMsg()
function IDoneMsg(caller) {
    tCurr = new Date().getTime();
    var remain = Object.keys(txidList).length;
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d %s IDoneMsg] completed %d, evtTimoutCnt %d, unreceived events %d, %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, caller, inv_m, tx_stats[tx_evtTimeout], remain, transType, invokeType, tCurr - tLocal, tLocal, tCurr);
    return;
}

// invoke validation
function invokeValidation(caller) {
    if (!invokeCheck) {
        logger.info("[Nid:chan:org:id=%d:%s:%s:%d invokeValidation] caller(%s), invokeCheck: %j", Nid, channelName, org, pid, caller, invokeCheck);
        return;
    }
    logger.info("[Nid:chan:org:id=%d:%s:%s:%d invokeValidation] caller(%s) %s, %s, %d", Nid, channelName, org, pid, caller, invokeCheckPeers, invokeCheckTx, invokeCheckTxNum);

    // reset transaction index
    invokeCheckExec = true;
    nRequest = inv_m;
    if (invokeCheckTx == 'LAST') {
        if (invokeCheckTxNum > inv_m) {
            ccFuncInst.arg0 = ccFuncInst.keyStart;
            inv_q = 1;
        } else {
            ccFuncInst.arg0 = ccFuncInst.keyStart + inv_m - invokeCheckTxNum;
            inv_q = inv_m - invokeCheckTxNum;
        }
    } else if (invokeCheckTx == 'ALL') {
        ccFuncInst.arg0 = ccFuncInst.keyStart;
        inv_q = 0;
    } else {
        return;
    }

    // remove target peers from channel
    removeAllPeers();

    // add target peers to channel
    setTargetPeers(invokeCheckPeers);

    invoke_query_dist(backoffCalculatorConstantFreq);
}

var txRequest;
function getTxRequest(results) {
    txRequest = {
        proposalResponses: results[0],
        proposal: results[1]
    };
}

// event var
var evtRcv = 0;
var evtCount = 0;

function postEventProc(caller, stats) {
    var endTime = new Date().getTime();
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] evtLastRcvdTime: %d, lastSentTime: %d, endTime: %d', Nid, channelName, org, pid, caller, evtLastRcvdTime, lastSentTime, endTime);
    if (evtLastRcvdTime == 0) {
        evtLastRcvdTime = endTime;
    }
    stats[tx_evtUnreceived] = Object.keys(txidList).length;
    stats[tx_rcvd] = stats[tx_sent] - stats[tx_pFail] - stats[tx_txFail] - stats[tx_evtUnreceived];
    logger.debug('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] stats ', Nid, channelName, org, pid, caller, stats);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] pte-exec:completed  Rcvd=%d sent= %d proposal failure %d tx orderer failure %d %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d, #event invalid: %d, Throughput=%d TPS', Nid, channelName, org, pid, caller, stats[tx_rcvd], stats[tx_sent], stats[tx_pFail], stats[tx_txFail], transType, invokeType, evtLastRcvdTime - tLocal, tLocal, evtLastRcvdTime, stats[tx_evtTimeout], stats[tx_evtUnreceived], stats[tx_evtInvalid], (stats[tx_rcvd] / (evtLastRcvdTime - tLocal) * 1000).toFixed(2));
    if (stats[tx_evtUnreceived] > 0) {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, caller, stats[tx_evtUnreceived], txidList);
    }

    evtDisconnect();
    latency_output();
    invokeValidation('postEventProc');
}

function eventRegisterFilteredBlock() {
    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            let block_reg = null;
            let handle = setTimeout(() => {
                if (block_reg) {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] Timeout - Failed to receive the block and transaction event', Nid, channelName, org, pid);
                }
                reject(new Error('Timed out waiting for block event'));
            }, evtTimeout);

            block_reg = eh.registerBlockEvent((filtered_block) => {
                clearTimeout(handle);

                // this block listener handles the filtered block
                if ((filtered_block.hasOwnProperty('number')) && (filtered_block.number > 0)) {
                    if (filtered_block.hasOwnProperty('filtered_transactions')) {
                        for (i = 0; i < filtered_block.filtered_transactions.length; i++) {
                            var txid = filtered_block.filtered_transactions[i].txid;
                            if (txidList[txid]) {
                                evtLastRcvdTime = new Date().getTime();
                                if ((evtLastRcvdTime - txidList[txid]) > evtTimeout) {
                                    tx_stats[tx_evtTimeout]++;
                                }
                                evtRcv = evtRcv + 1;
                                if (filtered_block.filtered_transactions[i].tx_validation_code !== 'VALID') {
                                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] The invoke transaction (%s) was invalid, code = ', Nid, channelName, org, pid, txid, filtered_block.filtered_transactions[i].tx_validation_code);
                                    tx_stats[tx_evtInvalid]++;
                                }
                                var tend = new Date().getTime();
                                latency_update(evtRcv, tend - txidList[txid], latency_event);
                                delete txidList[txid];
                                if (transMode == 'LATENCY') {
                                    isExecDone('Move');
                                    if (IDone != 1) {
                                        invoke_move_latency();
                                    }
                                }
                            }
                        }
                    } else {
                        logger.error('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec: Failure - received filtered_block.number:%d but filtered_transactions is undefined', Nid, channelName, org, pid, filtered_block.number);
                        process.exit(1);
                    }

                    var totalTx = evtRcv + tx_stats[tx_pFail] + tx_stats[tx_txFail];
                    if (inv_m == totalTx) {
                        if (IDone == 1) {
                            postEventProc('eventRegisterFilteredBlock', tx_stats);
                            eh.unregisterBlockEvent(block_reg);
                            if (!invokeCheck) {
                                process.exit();
                            }
                        }
                    }
                    resolve();
                } else {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec: Failure - received block with undefined filtered_block.number: %j', Nid, channelName, org, pid, filtered_block);
                }
            },
                (err) => {
                    reject(err);
                    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] inv_m:evtRcv=%d:%d err: %j', Nid, channelName, org, pid, inv_m, eBvtRcv, err);
                });
        }).catch((err) => {
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, tx_stats[tx_evtTimeout], transType, invokeType, tCurr-tLocal, tLocal, tCurr);
            process.exit(1);
        });
    });
}

function eventRegisterBlock() {
    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            eh.registerBlockEvent((block) => {
                for (i = 0; i < block.data.data.length; i++) {
                    var txid = block.data.data[i].payload.header.channel_header.tx_id;
                    if (txidList[txid]) {
                        evtLastRcvdTime = new Date().getTime();
                        if ((evtLastRcvdTime - txidList[txid]) > evtTimeout) {
                            tx_stats[tx_evtTimeout]++;
                        }
                        evtRcv = evtRcv + 1;
                        // BlockMetadataIndex_TRANSACTIONS_FILTER = 2
                        if (block.metadata.metadata[2][i] !== evtCode_VALID) {
                            logger.error('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] The invoke transaction (%s) was invalid, code = ', Nid, channelName, org, pid, txid, block.metadata.metadata[2][i]);
                            tx_stats[tx_evtInvalid]++;
                        }
                        var tend = new Date().getTime();
                        latency_update(evtRcv, tend - txidList[txid], latency_event);
                        delete txidList[txid];
                        if (transMode == 'LATENCY') {
                            isExecDone('Move');
                            if (IDone != 1) {
                                invoke_move_latency();
                            }
                        }
                    }
                }

                var totalTx = evtRcv + tx_stats[tx_pFail] + tx_stats[tx_txFail];
                if (inv_m == totalTx) {
                    if (IDone == 1) {
                        postEventProc('eventRegisterBlock', tx_stats);
                        if (!invokeCheck) {
                            process.exit();
                        }
                    }
                }
                resolve();
            },
                (err) => {
                    reject(err);
                    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] inv_m:evtRcv=%d:%d err: %j', Nid, channelName, org, pid, inv_m, eBvtRcv, err);
                });
        }).catch((err) => {
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, tx_stats[tx_evtTimeout], transType, invokeType, tCurr-tLocal, tLocal, tCurr);
            process.exit(1);
        });
    });
}

// orderer handler:
//    failover if failover is set
//    reconnect if reconn=1
function ordererHdlr() {
    // SDK handles failover when using discovery
    if (targetPeers === 'DISCOVERY') {
        return;
    }

    if (ordererFO) {
        ordererFailover(channel, client);
    } else {
        ordererReconnect(channel, client, org);
    }
    sleep(grpcTimeout);
}

// invoke_move_latency
function invoke_move_latency() {
    inv_m++;
    tx_stats[tx_sent]++;

    getMoveRequest();

    var ts = new Date().getTime();
    channel.sendTransactionProposal(request_invoke)
        .then(
            function (results) {
                for ( var u = 0; u< results.length; u++) {
                   if ((typeof(results[u][0]) !== 'undefined') && (typeof(results[u][0].response) !== 'undefined') &&
                       (typeof(results[u][0].response.status) !== 'undefined') && (results[u][0].response.status !== 200)) {
                       logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] failed proposal result: %j ', Nid, channelName, org, pid, results[u][0]);
                   }
                }

                // setup tx id array and update proposal latency
                var te = new Date().getTime();
                getTxRequest(results);
                txidList[tx_id.getTransactionID().toString()] = te;
                // update proposal latency
                latency_update(inv_m, te - ts, latency_peer);

                var tos = new Date().getTime();
                return channel.sendTransaction(txRequest)
                    .then((results) => {
                        // update transaction latency
                        var toe = new Date().getTime();
                        latency_update(inv_m, toe - tos, latency_orderer);
                        if (results.status != 'SUCCESS') {
                            tx_stats[tx_txFail]++;
                            delete txidList[tx_id.getTransactionID().toString()];
                            logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                            isExecDone('Move');
                            if (IDone != 1) {
                                invoke_move_latency();
                            } else {
                                IDoneMsg("invoke_move_latency");
                            }
                        }
                    }).catch((err) => {
                        tx_stats[tx_txFail]++;
                        delete txidList[tx_id.getTransactionID().toString()];
                        logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                        isExecDone('Move');
                        if (IDone != 1) {
                            ordererHdlr();
                            invoke_move_latency();
                        } else {
                            IDoneMsg("invoke_move_latency");
                        }
                    })
            }).catch((err) => {
                tx_stats[tx_pFail]++;
                var te = new Date().getTime();
                latency_update(inv_m, te - ts, latency_peer);
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                isExecDone('Move');
                if (IDone != 1) {
                    if (peerFO) {
                        peerFailover(channel, client);
                    }
                    invoke_move_latency();
                } else {
                    IDoneMsg("invoke_move_latency");
                }
            });
}

function execModeLatency() {
    if (transType == 'INVOKE') {
        tLocal = new Date().getTime();
        if (runDur > 0) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeLatency] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if (invokeType == 'MOVE') {
            invoke_move_latency();
        } else if (invokeType == 'QUERY') {
            invoke_query_dist(backoffCalculatorConstantFreq);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeLatency] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
        process.exit(1);
    }
}

// cleanup array object
function cleanup(array) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d cleanup] cleanup ...', Nid, channelName, org, pid);
    for (var key in array) {
        delete array[key];
        logger.debug('[Nid:chan:org:id=%d:%s:%s:%d cleanup] array key[%s] deleted ', Nid, channelName, org, pid, key);
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d cleanup] cleanup ... done', Nid, channelName, org, pid);
}

// output latency matrix
function latency_output() {
    // output peers latency
    if (latency_peer[0] != 0) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed peer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= %d ms', Nid, channelName, org, pid, latency_peer[0], latency_peer[1], latency_peer[2], latency_peer[3], (latency_peer[1] / latency_peer[0]).toFixed(2));
    } else {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed peer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= NA ms', Nid, channelName, org, pid, latency_peer[0], latency_peer[1], latency_peer[2], latency_peer[3]);
    }

    // output orderer latency
    if (latency_orderer[0] != 0) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed orderer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= %d ms', Nid, channelName, org, pid, latency_orderer[0], latency_orderer[1], latency_orderer[2], latency_orderer[3], (latency_orderer[1] / latency_orderer[0]).toFixed(2));
    } else {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed orderer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= NA ms', Nid, channelName, org, pid, latency_orderer[0], latency_orderer[1], latency_orderer[2], latency_orderer[3]);
    }

    // output event latency
    if (latency_event[0] != 0) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed event latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= %d ms', Nid, channelName, org, pid, latency_event[0], latency_event[1], latency_event[2], latency_event[3], (latency_event[1] / latency_event[0]).toFixed(2));
    } else {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed event latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= NA ms', Nid, channelName, org, pid, latency_event[0], latency_event[1], latency_event[2], latency_event[3]);
    }

    // delete txidList
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] calling cleanup() to cleanup txidList memory', Nid, channelName, org, pid);
    cleanup(txidList);
}

// calculate latency matrix
function latency_update(inv_m, td, latency) {
    latency[0] = latency[0] + 1;
    latency[1] = latency[1] + td;
    if (td < latency[2]) {
        latency[2] = td;
    }
    if (td > latency[3]) {
        latency[3] = td;
    }
}
var devFreq;
function getRandomNum(min0, max0) {
    return Math.floor(Math.random() * (max0 - min0)) + min0;
}

function invoke_move_dist_go_evtBlock(t1, backoffCalculator) {
    var freq_n = backoffCalculator();
    tCurr = new Date().getTime();
    t1 = tCurr - t1;
    if (t1 < freq_n) {
        freq_n = freq_n - t1;
    } else {
        freq_n = 0;
    }
    setTimeout(function () {
        invoke_move_dist_evtBlock(backoffCalculator);
    }, freq_n);
}

// invoke_move_dist_evtBlock
function invoke_move_dist_evtBlock(backoffCalculator) {
    inv_m++;
    tx_stats[tx_sent]++;

    var t1 = new Date().getTime();
    getMoveRequest();

    var ts = new Date().getTime();
    channel.sendTransactionProposal(request_invoke)
        .then((results) => {

            var te = new Date().getTime();
            latency_update(inv_m, te - ts, latency_peer);

            for ( var u = 0; u< results.length; u++) {
               if ((typeof(results[u][0]) !== 'undefined') && (typeof(results[u][0].response) !== 'undefined') &&
                   (typeof(results[u][0].response.status) !== 'undefined') && (results[u][0].response.status !== 200)) {
                   logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] failed proposal result: %j ', Nid, channelName, org, pid, results[u][0]);
               }
            }

            if (!results[0][0].hasOwnProperty('response')) {
                reConnectEvtHub = 1;
                tx_stats[tx_pFail]++;
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] proposal failed %d, %j', Nid, channelName, org, pid, tx_stats[tx_pFail], tx_id.getTransactionID().toString());
                isExecDone('Move');
                if (IDone != 1) {
                    invoke_move_dist_go_evtBlock(t1, backoffCalculator);
                }
                return;
            }
            getTxRequest(results);
            txidList[tx_id.getTransactionID().toString()] = new Date().getTime();

            var tos = new Date().getTime();
            return channel.sendTransaction(txRequest)
                .then((results) => {
                    var toe = new Date().getTime();
                    latency_update(inv_m, toe - tos, latency_orderer);

                    if (reConnectEvtHub == 1) {
                        reConnectEvtHub = reConnectEventHub(reConnectEvtHub);
                        reConnectEvtHub = 0;
                    }

                    isExecDone('Move');
                    if (results.status != 'SUCCESS') {
                        tx_stats[tx_txFail]++;
                        delete txidList[tx_id.getTransactionID().toString()];
                        logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] failed to sendTransaction status: %j ', Nid, channelName, org, pid, results);
                    }

                    if (IDone != 1) {
                        invoke_move_dist_go_evtBlock(t1, backoffCalculator);
                    } else {
                        IDoneMsg("invoke_move_dist_evtBlock");
                        return;
                    }
                }).catch((err) => {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    var toe = new Date().getTime();
                    latency_update(inv_m, toe - tos, latency_orderer);
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    isExecDone('Move');
                    if (IDone != 1) {
                        ordererHdlr();
                        invoke_move_dist_go_evtBlock(t1, backoffCalculator);
                    } else {
                        IDoneMsg("invoke_move_dist_evtBlock");
                        return;
                    }
                })
        }).catch((err) => {
            tx_stats[tx_pFail]++;
            var te = new Date().getTime();
            latency_update(inv_m, te - ts, latency_peer);
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

            isExecDone('Move');
            if (IDone != 1) {
                if (peerFO) {
                    peerFailover(channel, client);
                }
                invoke_move_dist_go_evtBlock(t1, backoffCalculator);
            } else {
                IDoneMsg("invoke_move_dist_evtBlock");
            }
        });
}

// query validation
function queryValidation(response) {
    var payload = response[0].data;
    var founderr = 0;
    for (let j = 0; j < response.length; j++) {
        var qResp = response[j].toString('utf8').toUpperCase();
        if (qResp.includes('ERROR') || qResp.includes('FAIL')) {
            tx_stats[tx_pFail]++;
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d queryValidation] query return:', Nid, channelName, org, pid, response[j].toString('utf8'));
        } else {
            tx_stats[tx_rcvd]++;
        }
        if ((founderr == 0) && (payload !== response[j].data)) {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d queryValidation] query responses of same tx from different peers contain different data: %j', Nid, channelName, org, pid, response);
            founderr = 1;
        }
    }
}

// invoke_query_dist
function invoke_query_dist(backoffCalculator) {
    inv_q++;
    tx_stats[tx_sent]++;

    getQueryRequest();
    channel.queryByChaincode(request_query)
        .then(
            function (response_payloads) {
                // query validation
                queryValidation(response_payloads);

                // check bookmark
                var qcheck = response_payloads[0].toString('utf8').toUpperCase();
                if (qcheck.includes('BOOKMARK') && qcheck.includes('KEY')) {
                    // get bookmark from query returned
                    var qc = JSON.parse(response_payloads[0].toString('utf8'));
                    bookmark = qc.ResponseMetadata.Bookmark;
                } else {
                    // reset bookmark
                    bookmark = '';
                }
                isExecDone('Query');
                if (QDone != 1) {
                    var freq_n = backoffCalculator();
                    setTimeout(function () {
                        invoke_query_dist(backoffCalculator);
                    }, freq_n);
                } else {
                    // do not log query statistics if invokeCheck
                    if ( !invokeCheckExec ) {
                        tCurr = new Date().getTime();
                        for (let j = 0; j < response_payloads.length; j++) {
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] query result:', Nid, channelName, org, pid, response_payloads[j].toString('utf8'));
                        }
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed %d transaction %s(%s) with %d failures %d received in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, tx_stats[tx_sent], transType, invokeType, tx_stats[tx_pFail], tx_stats[tx_rcvd], tCurr - tLocal, tLocal, tCurr, (tx_stats[tx_rcvd] / (tCurr - tLocal) * 1000).toFixed(2));
                    }
                    process.exit();
                }
            })
        .catch(
            function (err) {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed:error %s failed: ', Nid, channelName, org, pid, transType, err.stack ? err.stack : err);
                tx_stats[tx_pFail]++;
                isExecDone('Query');
                if (QDone != 1) {
                    var freq_n = backoffCalculator();
                    setTimeout(function () {
                        invoke_query_dist(backoffCalculator);
                    }, freq_n);
                } else {
                    tCurr = new Date().getTime();
                    tx_stats[tx_rcvd] = tx_stats[tx_sent] - tx_stats[tx_pFail];
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed %d transaction %s(%s) with %d failures in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, tx_stats[tx_sent], transType, invokeType, tx_stats[tx_pFail], tCurr - tLocal, tLocal, tCurr, (tx_stats[tx_rcvd] / (tCurr - tLocal) * 1000).toFixed(2));
                    process.exit();
                }
            }
        );
}

function execModeDistribution(backoffCalculator, delayCalculator) {
    if (!delayCalculator) {
        delayCalculator = backoffCalculator;
    }
    if (transType == 'INVOKE') {
        tLocal = new Date().getTime();
        if (runDur > 0) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);

        if (invokeType == 'MOVE') {
            invoke_move_dist_evtBlock(backoffCalculator);
        } else if (invokeType == 'QUERY') {
            invoke_query_dist(backoffCalculator);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] pte-exec:completed:error invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
        process.exit(1);
    }
}

function backoffCalculatorConstantFreq() {
    var freq = parseInt(txCfgPtr.constantOpt.constFreq);
    return freq;
}

function backoffCalculatorConstant() {
    var freq_n = backoffCalculatorConstantFreq();
    if (devFreq > 0) {
        freq_n = getRandomNum(freq_n - devFreq, freq_n + devFreq);
    }
    return freq_n;
}

function execModeConstant() {
    var freq = backoffCalculatorConstantFreq();
    if (transType == 'INVOKE') {
        if (!txCfgPtr.constantOpt.hasOwnProperty('devFreq')) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] devFreq undefined, set to 0', Nid, channelName, org, pid);
            devFreq = 0;
        } else {
            devFreq = parseInt(txCfgPtr.constantOpt.devFreq);
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] Constant Freq: %d ms, variance Freq: %d ms', Nid, channelName, org, pid, freq, devFreq);
    }
    execModeDistribution(backoffCalculatorConstant, backoffCalculatorConstantFreq);
}

function backoffCalculatorPoisson() {
    var lambda = parseFloat(txCfgPtr.poissonOpt.lambda);
    return -1000 * Math.log(1 - Math.random()) / lambda;
}

function execModePoisson() {
    execModeDistribution(backoffCalculatorPoisson);
}

// discovery mode: discovery performance
function invoke_discovery() {
    n_sd++;

    channel.initialize({
        discover: serviceDiscovery,
        asLocalhost: localHost
    })
        .then((success) => {
            isExecDone(transType);
            if (IDone != 1) {
                invoke_discovery();
            } else {
                tCurr = new Date().getTime();
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_discovery] pte-exec:completed sent %d transactions (%s) in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, n_sd, transType, tCurr - tLocal, tLocal, tCurr, (n_sd / (tCurr - tLocal) * 1000).toFixed(2));
                evtDisconnect();
            }
        }).catch(err => {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_discovery] Failed to send service discovery due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err)
            process.exit(1)
        });
}

function execModeDiscovery() {
    // send discovery request
    tLocal = new Date().getTime();
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeDiscovery] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
    if (runDur > 0) {
        tEnd = tLocal + runDur;
    }
    invoke_discovery();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// disconnect event hubs
function evtDisconnect() {
    for (i = 0; i < eventHubs.length; i++) {
        if (eventHubs[i] && eventHubs[i].isconnected()) {
            logger.info('Disconnecting the event hub: %d', i);
            eventHubs[i].disconnect();
        }
    }
}

// connect to event hubs
function reConnectEventHub() {
    logger.info('connecting the event hub');
    for (var i = 0; i < eventHubs.length; i++) {
        if (evtType == 'FILTEREDBLOCK') {
            eventHubs[i].connect();
        } else {
            eventHubs[i].connect(true);
        }
    }
    listenToEventHub();

    return;
}

function requestPusher(fn, delayCalculator, factor) {
    if ((inv_m < nRequest) || (nRequest == 0)) {
        if (requestQueue.length < maxRequestQueueLength) {
            var data = fn();
            requestQueue.unshift(data);
        } else {
            logger.debug("no data pushed");
        }
        var delay = delayCalculator() / factor;
        setTimeout(requestPusher, delay, fn, delayCalculator, factor)
    }
}
