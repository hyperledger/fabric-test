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
var grpc = require('grpc');
var hfc = require('fabric-client');
var path = require('path');
var testUtil = require('./pte-util.js');
var util = require('util');

var PTEid = process.argv[7];
var loggerMsg = 'PTE ' + PTEid + ' exec';
var logger = new testUtil.PTELogger({"prefix":loggerMsg, "level":"info"});


// local vars
var tmp;
var tCurr;
var tEnd=0;
var tLocal;
var i = 0;
var inv_m = 0;    // counter of invoke move
var inv_q = 0;    // counter of invoke query
var n_sd = 0;     // counter of service discovery
var evtType = 'FILTEREDBLOCK';        // event type: FILTEREDBLOCK|CHANNEL, default: FILTEREDBLOCK
var evtTimeout = 120000;              // event timeout, default: 120000 ms
var evtListener = 'BLOCK';            // event listener: BLOCK|TRANSACTION, default: BLOCK
var evtLastRcvdTime = 0;              // last event received time
var lastSentTime = 0;                 // last transaction sent time
var IDone=0;
var QDone=0;
var recHist;
var buff;
var ofile;
var invokeCheck=new Boolean(0);
var invokeCheckPeers='NONE';
var invokeCheckTx='NONE';
var invokeCheckTxNum=0;
var chaincode_id;
var chaincode_ver;
var tx_id = null;
var nonce = null;
var the_user = null;
var eventHubs=[];
var targets = [];
var eventPromises = [];
var txidList = [];
var initFreq=0;     // init discovery freq default = 0
var initDiscTimer;
var serviceDiscovery=false;
var localHost=false;
var ARGS_DIR = './ccArgumentsGenerators';

var requestQueue = [];
var maxRequestQueueLength = 100;

// transactions status counts
var tx_stats = [];
var tx_sent = 0;                                 // tx_stats idx: total transactions sent
var tx_rcvd = tx_sent+1;                         // tx_stats idx: total transactions succeeded (event or query results received)
var tx_pFail = tx_rcvd+1;                        // tx_stats idx: total proposal (peer) failure
var tx_txFail = tx_pFail+1;                      // tx_stats idx: total transaction (orderer ack) failure
var tx_evtTimeout = tx_txFail+1;                 // tx_stats idx: total event timeout
var tx_evtUnreceived = tx_evtTimeout+1;          // tx_stats idx: total event unreceived
for ( var i = 0; i <= tx_evtUnreceived; i++ ) {
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
var org=process.argv[6];
var uiContent = testUtil.readConfigFileSubmitter(uiFile);
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input uiContent[%s]: %j', Nid, channelName, org, pid, uiFile, uiContent);

var channelOpt=uiContent.channelOpt;
var channelOrgName = [];
var channelName = channelOpt.name;
for (i=0; i<channelOpt.orgName.length; i++) {
    channelOrgName.push(channelOpt.orgName[i]);
}

var txCfgPtr;
var txCfgTmp;
if ( typeof(uiContent.txCfgPtr) === 'undefined' ) {
    txCfgTmp = uiFile;
} else {
    txCfgTmp = uiContent.txCfgPtr;
}
txCfgPtr = testUtil.readConfigFileSubmitter(txCfgTmp);
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input txCfgPtr[%s]: %j', Nid, channelName, org, pid, txCfgTmp, txCfgPtr);

var distOpt = txCfgPtr.constantOpt;		// Assume the default distribution is 'Constant'

var ccDfnPtr;
var ccDfntmp;
if ( typeof(uiContent.ccDfnPtr) === 'undefined' ) {
    ccDfntmp = uiFile;
} else {
    ccDfntmp = uiContent.ccDfnPtr;
}
ccDfnPtr = testUtil.readConfigFileSubmitter(ccDfntmp);
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input ccDfnPtr[%s]: %j', Nid, channelName, org, pid, ccDfntmp, ccDfnPtr);

var ccType = ccDfnPtr.ccType;
if ( !fs.existsSync(ARGS_DIR + '/' + ccType + '/ccFunctions.js') ) {
    console.log('No chaincode payload generation files found: ', ARGS_DIR + '/' + ccType + '/ccFunctions.js');
    process.exit(1);
}
var ccFunctions = require(ARGS_DIR + '/' + ccType + '/ccFunctions.js');
var TLS = testUtil.setTLS(txCfgPtr);

var targetPeers=txCfgPtr.targetPeers.toUpperCase();
if ( targetPeers == 'DISCOVERY' && TLS != testUtil.TLSCLIENTAUTH ) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invalid configuration: targetPeers (%s) requires TLS (clientauth)', Nid, channelName, org, pid, txCfgPtr.targetPeers);
    process.exit();
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: uiFile=%s, tStart=%d', Nid, channelName, org, pid, uiFile, tStart);
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] TLS: %s', Nid, channelName, org, pid, TLS);
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] targetPeers: %s', Nid, channelName, org, pid, targetPeers.toUpperCase());
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] channelOrgName.length: %d, channelOrgName: %s', Nid, channelName, org, pid, channelOrgName.length, channelOrgName);

var client = new hfc();
var channel = client.newChannel(channelName);

if ( (typeof( txCfgPtr.eventOpt ) !== 'undefined') && (typeof( txCfgPtr.eventOpt.type ) !== 'undefined') ) {
    evtType = txCfgPtr.eventOpt.type.toUpperCase();
    if ( (evtType != 'FILTEREDBLOCK') && (evtType != 'CHANNEL') ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] unsupported event type: %s', Nid, channelName, org, pid, evtType);
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] supported event types: FilteredBlock and Channel', Nid, channelName, org, pid);
        process.exit();
    }
}
if ( (typeof( txCfgPtr.eventOpt ) !== 'undefined') && (typeof( txCfgPtr.eventOpt.listener ) !== 'undefined') ) {
    evtListener = txCfgPtr.eventOpt.listener.toUpperCase();
}
if ( (typeof( txCfgPtr.eventOpt ) !== 'undefined') && (typeof( txCfgPtr.eventOpt.timeout ) !== 'undefined') ) {
    evtTimeout = txCfgPtr.eventOpt.timeout;
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] event type: %s, listener: %s, timeout: %d', Nid, channel.getName(), org, pid, evtType, evtListener, evtTimeout);

if ( typeof( txCfgPtr.invokeCheck ) !== 'undefined' ) {
    if ( txCfgPtr.invokeCheck == 'TRUE' ) {
        invokeCheck = true;
    } else if ( txCfgPtr.invokeCheck == 'FALSE' ) {
        invokeCheck = false;
    } else {
        invokeCheck = txCfgPtr.invokeCheck;
    }
    if ( invokeCheck ) {
        if ( txCfgPtr.invokeCheckOpt ) {
            if ( txCfgPtr.invokeCheckOpt.peers ) {
                invokeCheckPeers=txCfgPtr.invokeCheckOpt.peers.toUpperCase();
            } else {
                invokeCheckPeers=txCfgPtr.targetPeers.toUpperCase();
            }
            if ( txCfgPtr.invokeCheckOpt.transactions ) {
                invokeCheckTx=txCfgPtr.invokeCheckOpt.transactions.toUpperCase();
            } else {
                invokeCheckTx='LAST';
            }
            if ( txCfgPtr.invokeCheckOpt.txNum ) {
                invokeCheckTxNum=parseInt(txCfgPtr.invokeCheckOpt.txNum);
            } else {
                invokeCheckTxNum=1;
            }
        } else {
            invokeCheckPeers=txCfgPtr.targetPeers.toUpperCase();
            invokeCheckTx='LAST';
            invokeCheckTxNum=1;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invokeCheck: peers=%s, tx=%s, num=%d', Nid, channel.getName(), org, pid, invokeCheckPeers, invokeCheckTx, invokeCheckTxNum);
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invokeCheck: %j', Nid, channel.getName(), org, pid, invokeCheck);

var channelID = uiContent.channelID;
chaincode_id = uiContent.chaincodeID+channelID;
chaincode_ver = uiContent.chaincodeVer;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] chaincode_id: %s', Nid, channel.getName(), org, pid, chaincode_id );

var svcFile = uiContent.SCFile[0].ServiceCredentials;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] svcFile: %s, org: %s', Nid, channel.getName(), org, pid, svcFile, org);
var ORGS = testUtil.readConfigFileSubmitter(svcFile, 'test-network');
var goPath;
if ( typeof(ORGS.gopath) === 'undefined' ) {
    goPath = '';
} else if ( ORGS.gopath == 'GOPATH' ) {
    goPath = process.env['GOPATH'];
} else {
    goPath = ORGS.gopath;
}
logger.info('goPath: ', goPath);

var orgName = ORGS[org].name;
var users =  hfc.getConfigSetting('users');

//user parameters
var transMode = txCfgPtr.transMode.toUpperCase();
var transType = txCfgPtr.transType.toUpperCase();
var invokeType = txCfgPtr.invokeType.toUpperCase();
var nRequest = parseInt(txCfgPtr.nRequest);

if ( transType == 'DISCOVERY' && TLS != testUtil.TLSCLIENTAUTH ) {
    logger.error('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invalid configuration: transType (%s) requires mutual TLS (clientauth)', Nid, channelName, org, pid, transType);
    process.exit();
}

logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] transMode: %s, transType: %s, invokeType: %s, nRequest: %d', Nid, channel.getName(), org, pid,  transMode, transType, invokeType, nRequest);


// orderer parameters
var ordererMethod='USERDEFINED';    // default method
if (typeof( txCfgPtr.ordererOpt ) !== 'undefined') {
    if (typeof(txCfgPtr.ordererOpt.method) !== 'undefined') {
        ordererMethod=txCfgPtr.ordererOpt.method.toUpperCase();
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: ordererMethod=%s', Nid, channelName, org, pid, ordererMethod);

//failover parameters
var peerList = [];
var currPeerId = 0;
var ordererList = [];
var currOrdererId = 0;
var peerFO=new Boolean(0);
var ordererFO=new Boolean(0);
var peerFOList = 'TARGETPEERS';
var peerFOMethod = 'ROUNDROBIN';

// failover is handled by SDK in discovery mode
if ( targetPeers != 'DISCOVERY' ) {
    if (typeof( txCfgPtr.peerFailover ) !== 'undefined') {
        if ( txCfgPtr.peerFailover == 'TRUE' ) {
            peerFO = true;
        } else if ( txCfgPtr.peerFailover == 'FALSE' ) {
            peerFO = false;
        } else {
            peerFO = txCfgPtr.peerFailover;
        }
    }
    if (typeof( txCfgPtr.ordererFailover ) !== 'undefined') {
        if ( txCfgPtr.ordererFailover == 'TRUE' ) {
            ordererFO = true;
        } else if ( txCfgPtr.ordererFailover == 'FALSE' ) {
            ordererFO = false;
        } else {
            ordererFO = txCfgPtr.ordererFailover;
        }
    }
}
if ( peerFO ) {
    if (typeof( txCfgPtr.failoverOpt ) !== 'undefined') {
        if (typeof( txCfgPtr.failoverOpt.list ) !== 'undefined') {
            peerFOList = txCfgPtr.failoverOpt.list.toUpperCase();
        }
        if (typeof( txCfgPtr.failoverOpt.method ) !== 'undefined') {
            peerFOMethod = txCfgPtr.failoverOpt.method.toUpperCase();
        }
    }
}

logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: peerFO=%s, ordererFO=%s, peerFOList=%s, peerFOMethod=%s', Nid, channelName, org, pid, peerFO, ordererFO, peerFOList, peerFOMethod);

var runDur=0;
if ( nRequest == 0 ) {
   runDur = parseInt(txCfgPtr.runDur);
   logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] transMode: %s, transType: %s, invokeType: %s, runDur: %d', Nid, channel.getName(), org, pid, transMode, transType, invokeType, runDur);
   // convert runDur from second to ms
   runDur = 1000*runDur;
}

var runForever = 0;
if ( ( nRequest == 0 ) && ( runDur == 0 ) ) {
    runForever = 1;
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] runForever: %d', Nid, channel.getName(), org, pid,  runForever);

// timeout option
var timeoutOpt;
var reqTimeout=45000;     // default 45 sec
var grpcTimeout=3000;     // default 3 sec
if ((typeof( txCfgPtr.timeoutOpt ) !== 'undefined')) {
    timeoutOpt = txCfgPtr.timeoutOpt;
    logger.info('main - timeoutOpt: %j', timeoutOpt);
    if ((typeof( timeoutOpt.request ) !== 'undefined')) {
        reqTimeout = parseInt(timeoutOpt.request);
    }
    if ((typeof( timeoutOpt.grpcTimeout ) !== 'undefined')) {
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
var txIDVar=channelName+'_'+org+'_'+Nid+'_'+pid;
var bookmark='';
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] tx IDVar: ', Nid, channel.getName(), org, pid, txIDVar);
var ccFunctionAccessPolicy = {};
if (ccFuncInst.getAccessControlPolicyMap) {		// Load access control policy for chaincode is specified
    ccFunctionAccessPolicy = ccFuncInst.getAccessControlPolicyMap();
}
var orgAdmins = {};		// Map org names to client handles

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
        chaincodeId : chaincode_id,
        fcn: ccDfnPtr.invoke.move.fcn,
        args: ccFuncInst.testInvokeArgs,
        txId: tx_id
    };

    if ( (transMode == 'MIX') && (mixQuery) ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] request_invoke: %j', Nid, channel.getName(), org, pid, request_invoke);
    } else if ( (inv_m == nRequest) && (nRequest>0) ) {
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
        chaincodeId : chaincode_id,
        txId: tx_id,
        fcn: ccDfnPtr.invoke.query.fcn,
        args: ccFuncInst.testQueryArgs
    };

    //logger.info('request_query: %j', request_query);
}

function listenToEventHub() {
    // add event if Block listener
    if ( evtListener == 'BLOCK') {
        if (evtType == 'FILTEREDBLOCK') {
            // filteredBlock event
            eventRegisterFilteredBlock();
        } else {
            // channel event
            eventRegisterBlock();
        }
    }
}


var reConnectEvtHub=0;
function peerFailover(channel, client) {
    var currId = currPeerId;
    var eh;
    channel.removePeer(peerList[currPeerId]);
    if ( peerFOMethod == 'RANDOM' ) {
        var r = Math.floor(Math.random() * (peerList.length - 1));
        if ( r >= currPeerId ) {
             currPeerId = r + 1;
        } else {
             currPeerId = r;
        }
    } else if ( peerFOMethod == 'ROUNDROBIN' ) {
        currPeerId = currPeerId + 1;
    }
    currPeerId = currPeerId%peerList.length;
    channel.addPeer(peerList[currPeerId]);

    //handle channel eventHubs if evtType == CHANNEL
    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
        //delete channel eventHubs
        for ( var i = 0; i < eventHubs.length; i++ ) {
            var str = peerList[currId]._url.split('//');
            if ( (eventHubs[i].getPeerAddr()) && (str[1] == eventHubs[i].getPeerAddr()) ) {
                  eventHubs[i].disconnect()
                  delete eventHubs[i];
            }
        }
        //add channel eventHubs
        var str = peerList[currPeerId]._url.split('//');
        var found = 0;
        for ( var i = 0; i < eventHubs.length; i++ ) {
            if ( (eventHubs[i].getPeerAddr()) && (str[1] == eventHubs[i].getPeerAddr()) ) {
                found = 1;
                break;
            }
        }
        if ( found == 0 ) {
            eh = channel.newChannelEventHub(peerList[currPeerId]);
            eventHubs.push(eh);
            if ( evtType == 'FILTEREDBLOCK' ) {
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
    for (i=0; i<peerList.length; i++) {
        if (peerList[i]._url === peerUrl) {
            currPeerId = i;
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d setCurrPeerId] currPeerId:  ', Nid, channelName, org, pid, currPeerId);
}

function removeAllPeers() {
    var peers=channel.getPeers();
    for ( var i=0; i< peers.length; i++ ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d setCurrPeerId] removeAllPeers: %s', Nid, channelName, org, pid, peers[i]);
        channel.removePeer(peers[i]);
    }

}

// assign thread the peers from List
function assignPeerListFromList(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignPeerListFromList]', Nid, channel.getName(), org, pid);
    var peerTmp;
    var eh;
    var data;
    var listOpt=txCfgPtr.listOpt;
    var peername;
    var event_connected = false;
    for(var key in listOpt) {
        for (i = 0; i < listOpt[key].length; i++) {
            if (ORGS[key].hasOwnProperty(listOpt[key][i])) {
                peername = listOpt[key][i];
                if (ORGS[key][peername].requests) {
                    if (TLS > testUtil.TLSDISABLED) {
                        data = testUtil.getTLSCert(key, peername, svcFile, svcFile);
                        if ( data !== null ) {
                            peerTmp = client.newPeer(
                                ORGS[key][peername].requests,
                                {
                                    pem: Buffer.from(data).toString(),
                                    'ssl-target-name-override': ORGS[key][peername]['server-hostname']
                                }
                            );
                            peerList.push(peerTmp);
                        }
                    } else {
                        peerTmp = client.newPeer(ORGS[key][peername].requests);
                        peerList.push(peerTmp);
                    }
                }
            }
        }
    }
    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignPeerListFromList] peerList: %j', Nid, channelName, org, pid, peerList);
}

// assign thread peers from all org
function assignPeerList(channel, client, org) {
    logger.info('[Nid:chan:id=%d:%s:%d assignPeerList]', Nid, channel.getName(), pid);
    var peerTmp;
    var eh;
    var data;
    for (let key1 in ORGS) {
        if (ORGS.hasOwnProperty(key1)) {
            for (let key in ORGS[key1]) {
                if (ORGS[key1][key].requests) {
                    if (TLS > testUtil.TLSDISABLED) {
                        data = testUtil.getTLSCert(key1, key, svcFile);
                        if ( data !== null ) {
                            peerTmp = client.newPeer(
                                ORGS[key1][key].requests,
                                {
                                    pem: Buffer.from(data).toString(),
                                    'ssl-target-name-override': ORGS[key1][key]['server-hostname']
                                }
                            );
                            peerList.push(peerTmp);
                        }
                    } else {
                        peerTmp = client.newPeer( ORGS[key1][key].requests);
                        peerList.push(peerTmp);
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:id=%d:%s:%d assignPeerList] peerList', Nid, channel.getName(), pid, peerList);
}

// assign thread peers from all org
function assignThreadAllPeers(channel, client, org) {
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllPeers]', Nid, channel.getName(), pid);
    var peerTmp;
    var eh;
    var data;
    var event_connected = false;
    for (let key1 in ORGS) {
        if (ORGS.hasOwnProperty(key1)) {
            for (let key in ORGS[key1]) {
            if (ORGS[key1][key].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(key1, key, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[key1][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key1][key]['server-hostname']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                        if ( peerFOList == 'TARGETPEERS' ) {
                            peerList.push(peerTmp);
                        }

                        if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                            eh = channel.newChannelEventHub(peerTmp);
                            eventHubs.push(eh);
                            if ( evtType == 'FILTEREDBLOCK' ) {
                                eh.connect();
                            } else {
                                eh.connect(true);
                            }
                        }
                    }
                } else {
                    peerTmp = client.newPeer( ORGS[key1][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                        eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                        if ( evtType == 'FILTEREDBLOCK' ) {
                            eh.connect();
                        } else {
                            eh.connect(true);
                        }
                    }
                }

                }
            }
        }
    }
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllPeers] peers: %s', Nid, channel.getName(), pid, channel.getPeers());
}


// assign thread the anchor peer from all org
function assignThreadAllAnchorPeers(channel, client, org) {
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllAnchorPeers]', Nid, channel.getName(), pid);
    var peerTmp;
    var eh;
    var data;
    var found = 0; // Indicates if we found first peer in the org, as identified in the SCFile.
    for (let key1 in ORGS) {
        if (ORGS.hasOwnProperty(key1)) {
            for (let key in ORGS[key1]) {
            if (ORGS[key1][key].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(key1, key, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[key1][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key1][key]['server-hostname']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                        if ( peerFOList == 'TARGETPEERS' ) {
                            peerList.push(peerTmp);
                        }

                        if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                            eh = channel.newChannelEventHub(peerTmp);
                            eventHubs.push(eh);
                            if ( evtType == 'FILTEREDBLOCK' ) {
                                eh.connect();
                            } else {
                                eh.connect(true);
                            }
                        }
                        found = 1;
                    }
                } else {
                    peerTmp = client.newPeer( ORGS[key1][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                        eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                        if ( evtType == 'FILTEREDBLOCK' ) {
                            eh.connect();
                        } else {
                            eh.connect(true);
                        }
                    }
                    found = 1;
                }
                if ( found == 1 ) {
                    // Found the first peer in this org. Break out of searching for more peers in this org.
                    // And Now reset it, so we can find the first peer in another org.
                    found = 0;
                    break;
                }
            }
            }
        }
    }
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllAnchorPeers] peers: %s', Nid, channel.getName(), pid, channel.getPeers());
}

// assign thread all peers from the org
function assignThreadOrgPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgPeer]', Nid, channel.getName(), org, pid);
    var peerTmp;
    var eh;
    var data;
    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (ORGS[org][key].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(org, key, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[org][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[org][key]['server-hostname']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                        if ( peerFOList == 'TARGETPEERS' ) {
                            peerList.push(peerTmp);
                        }

                        if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                            eh = channel.newChannelEventHub(peerTmp);
                            eventHubs.push(eh);
                            if ( evtType == 'FILTEREDBLOCK' ) {
                                eh.connect();
                            } else {
                                eh.connect(true);
                            }
                        }
                    }
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                        eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                        if ( evtType == 'FILTEREDBLOCK' ) {
                            eh.connect();
                        } else {
                            eh.connect(true);
                        }
                    }
                }

            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgPeer] peers: : %s', Nid, channelName, org, pid, channel.getPeers());
}


// assign thread the peers from List
function assignThreadPeerList(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerList]', Nid, channel.getName(), org, pid);
    var peerTmp;
    var eh;
    var data;
    var listOpt=txCfgPtr.listOpt;
    var peername;
    var event_connected = false;
    for(var key in listOpt) {
        for (i = 0; i < listOpt[key].length; i++) {
            if (ORGS[key].hasOwnProperty(listOpt[key][i])) {
                peername = listOpt[key][i];
                if (ORGS[key][peername].requests) {
                    if (TLS > testUtil.TLSDISABLED) {
                        data = testUtil.getTLSCert(key, peername, svcFile);
                        if ( data !== null ) {
                            peerTmp = client.newPeer(
                                ORGS[key][peername].requests,
                                {
                                    pem: Buffer.from(data).toString(),
                                    'ssl-target-name-override': ORGS[key][peername]['server-hostname']
                                }
                            );
                            targets.push(peerTmp);
                            channel.addPeer(peerTmp);
                            if ( peerFOList == 'TARGETPEERS' ) {
                                peerList.push(peerTmp);
                            }

                            if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                                eh = channel.newChannelEventHub(peerTmp);
                                eventHubs.push(eh);
                                if ( evtType == 'FILTEREDBLOCK' ) {
                                    eh.connect();
                                } else {
                                    eh.connect(true);
                                }
                            }
                        }
                    } else {
                        peerTmp = client.newPeer(ORGS[key][peername].requests);
                        channel.addPeer(peerTmp);
                        if ( peerFOList == 'TARGETPEERS' ) {
                            peerList.push(peerTmp);
                        }
                        if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                            eh = channel.newChannelEventHub(peerTmp);
                            eventHubs.push(eh);
                            if ( evtType == 'FILTEREDBLOCK' ) {
                                eh.connect();
                            } else {
                                eh.connect(true);
                            }
                        }
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerList] peers: : %s', Nid, channelName, org, pid, channel.getPeers());
}
// assign thread the peers from getPeerID
function assignThreadPeerID(channel, client, org, method) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerID: method %s]', Nid, channel.getName(), org, pid, method);
    var peerTmp;
    var eh;
    var data;
    //var listOpt=txCfgPtr.listOpt;
    var peername=testUtil.getPeerID(pid, org, txCfgPtr, svcFile, method);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerID: %s]', Nid, channel.getName(), org, pid, peername);
    //var peername;
    var event_connected = false;
    if (ORGS[org].hasOwnProperty(peername)) {
        if (ORGS[org][peername].requests) {
            if (TLS > testUtil.TLSDISABLED) {
                data = testUtil.getTLSCert(org, peername, svcFile);
                if ( data !== null ) {
                    peerTmp = client.newPeer(
                        ORGS[org][peername].requests,
                        {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[org][peername]['server-hostname']
                        }
                    );
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }

                    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                        eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                        if ( evtType == 'FILTEREDBLOCK' ) {
                            eh.connect();
                        } else {
                            eh.connect(true);
                        }
                    }
                }
            } else {
                peerTmp = client.newPeer(ORGS[org][peername].requests);
                channel.addPeer(peerTmp);
                if ( peerFOList == 'TARGETPEERS' ) {
                    peerList.push(peerTmp);
                }
                if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                    eh = channel.newChannelEventHub(peerTmp);
                    eventHubs.push(eh);
                    if ( evtType == 'FILTEREDBLOCK' ) {
                        eh.connect();
                    } else {
                        eh.connect(true);
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerID] peers: : %s', Nid, channelName, org, pid, channel.getPeers());
}

function channelAddPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeer]', Nid, channelName, org, pid);
    var data;
    var peerTmp;
    var eh;
    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (ORGS[org][key].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(org, key, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[org][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[org][key]['server-hostname']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);

                        if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                            eh = channel.newChannelEventHub(peerTmp);
                            eventHubs.push(eh);
                            if ( evtType == 'FILTEREDBLOCK' ) {
                                eh.connect();
                            } else {
                                eh.connect(true);
                            }
                        }
                    }
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                        eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                        if ( evtType == 'FILTEREDBLOCK' ) {
                            eh.connect();
                        } else {
                            eh.connect(true);
                        }
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeer] peers: %s', Nid, channelName, org, pid, channel.getPeers());
}


function channelAddPeerEvent(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent]', Nid, channelName, org, pid);
    var data;
    var eh;
    var peerTmp;
    for (let key in ORGS[org]) {
        logger.info('key: ', key);
        if (ORGS[org].hasOwnProperty(key)) {
            if (ORGS[org][key].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(org, key, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[org][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key]['server-hostname']
                            }
                        );
                    }
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent] peer: ', Nid, channelName, org, pid, ORGS[org][key].requests);
                }
                targets.push(peerTmp);
                channel.addPeer(peerTmp);
                if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                    eh = channel.newChannelEventHub(peerTmp);
                    eventHubs.push(eh);
                    if ( evtType == 'FILTEREDBLOCK' ) {
                        eh.connect();
                    } else {
                        eh.connect(true);
                    }
                }
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent] requests: %s, events: %s ', Nid, channelName, org, pid, ORGS[org][key].requests, ORGS[org][key].events);
            }
        }
    }
}

function channelDiscoveryEvent(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelDiscoveryEvent]', Nid, channelName, org, pid);
    var peerTmp = channel.getPeers();
    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
        for ( var u = 0; u < peerTmp.length; u++) {
            var eh = channel.newChannelEventHub(peerTmp[u]);
            eventHubs.push(eh);
            if ( evtType == 'FILTEREDBLOCK' ) {
                eh.connect();
            } else {
                eh.connect(true);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelDiscoveryEvent] event length: %d', Nid, channelName, org, pid, eventHubs.length);
}

// add one peer to channel to perform service discovery
function channelAdd1Peer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAdd1Peer]', Nid, channelName, org, pid);
    var data;
    var peerTmp;
    var eh;
    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (ORGS[org][key].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(org, key, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[org][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[org][key]['server-hostname']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);

                    }
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                }
                if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                    eh = channel.newChannelEventHub(peerTmp);
                    eventHubs.push(eh);
                    if ( evtType == 'FILTEREDBLOCK' ) {
                        eh.connect();
                    } else {
                        eh.connect(true);
                    }
                }
                break;
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAdd1Peer] peers: %s ', Nid, channelName, org, pid, channel.getPeers());
}



function clearInitDiscTimeout() {
    if ( initFreq > 0 ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d clearInitDiscTimeout] clear discovery timer.', Nid, channelName, org, pid);
        clearTimeout(initDiscTimer);
    }
}


function initDiscovery() {
    var tmpTime = new Date().getTime();
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] discovery timestamp %d', Nid, channelName, org, pid, tmpTime);
    channel.initialize({
        discover: serviceDiscovery,
        asLocalhost: localHost
    })
    .then((success) => {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] discovery results %j', Nid, channelName, org, pid, success);
        if (targetPeers === 'DISCOVERY'){
            channelDiscoveryEvent(channel, client, org);
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] discovery: completed events ports' , Nid, channelName, org, pid);
        }
    },
    function(err) {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d initDiscovery] Failed to wait due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
        return;
    });

    if ( initFreq > 0 ) {
        initDiscTimer=setTimeout(function() {
            initDiscovery();
        }, initFreq);
    }

}

// reconnect orderer
function ordererReconnect(channel, client, org) {
    channel.removeOrderer(ordererList[currOrdererId]);
    channelAddOrderer(channel, client, org);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d ordererReconnect] Orderer reconnect (%s)', Nid, channel.getName(), org, pid, ordererList[currOrdererId]._url);
}

// orderer failover
function ordererFailover(channel, client) {
    var currId = currOrdererId;
    channel.removeOrderer(ordererList[currOrdererId]);
    currOrdererId = currOrdererId + 1;
    currOrdererId = currOrdererId%ordererList.length;
    channel.addOrderer(ordererList[currOrdererId]);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d ordererFailover] Orderer failover from (%s) to (%s):', Nid, channel.getName(), org, pid, ordererList[currId]._url, ordererList[currOrdererId]._url);
}

// set currOrdererId
function setCurrOrdererId(channel, client, org) {
    // assign ordererID
    var ordererID=testUtil.getOrdererID(pid, channelOpt.orgName, org, txCfgPtr, svcFile, ordererMethod);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d setCurrOrdererId] orderer[%s] is assigned to this thread', Nid, channelName, org, pid, ordererID);

    var i;
    for (i=0; i<ordererList.length; i++) {
        if (ordererList[i]._url === ORGS['orderer'][ordererID].url) {
            currOrdererId = i;
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d setCurrOrdererId] currOrdererId:', Nid, channelName, org, pid, currOrdererId);
}

// assign Orderer List
function assignOrdererList(channel, client) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignOrdererList] ', Nid, channelName, org, pid);
    var data;
    var ordererTmp;
    for (let key in ORGS['orderer']) {
        if (ORGS['orderer'][key].url) {
            if (TLS > testUtil.TLSDISABLED) {
                data = testUtil.getTLSCert('orderer', key, svcFile);
                if ( data !== null ) {
                    let caroots = Buffer.from(data).toString();

                    ordererTmp = client.newOrderer(
                        ORGS['orderer'][key].url,
                        {
                            pem: caroots,
                            'ssl-target-name-override': ORGS['orderer'][key]['server-hostname']
                        }
                    )
                    ordererList.push(ordererTmp);
                }
            } else {
                ordererTmp = client.newOrderer(ORGS['orderer'][key].url);
                ordererList.push(ordererTmp);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignOrdererList] orderer list: %s', Nid, channelName, org, pid, ordererList);
}

function channelAddOrderer(channel, client, org) {
    // assign ordererID
    var ordererID=testUtil.getOrdererID(pid, channelOpt.orgName, org, txCfgPtr, svcFile, ordererMethod);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddOrderer] orderer[%s] is assigned to this thread', Nid, channelName, org, pid, ordererID);

    var data;
    logger.info('[Nid:chan:org:id:ordererID=%d:%s:%s:%d:%s channelAddOrderer] ', Nid, channelName, org, pid, ordererID );
    if (TLS > testUtil.TLSDISABLED) {
        data = testUtil.getTLSCert('orderer', ordererID, svcFile);
        if ( data !== null ) {
            let caroots = Buffer.from(data).toString();

            channel.addOrderer(
                client.newOrderer(
                    ORGS['orderer'][ordererID].url,
                    {
                        'pem': caroots,
                        'ssl-target-name-override': ORGS['orderer'][ordererID]['server-hostname']
                    }
                )
            );
        }
    } else {
        channel.addOrderer(client.newOrderer(ORGS['orderer'][ordererID].url));
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddOrderer] orderer url: ', Nid, channelName, org, pid, ORGS['orderer'][ordererID].url);
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddOrderer] orderer: %s', Nid, channelName, org, pid, channel.getOrderers());
}


// assign thread the anchor peer (peer1) from the org
function assignThreadOrgAnchorPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] ', Nid, channelName, org, pid );
    var peerTmp;
    var eh;
    var data;
    var found = 0; // found first peer, as identified in the SCFile.
    for (let key in ORGS) {
        if ( key == org ) {
        for ( let subkey in ORGS[key] ) {
            if (ORGS[key][subkey].requests) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(key, subkey, svcFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            ORGS[key][subkey].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key][subkey]['server-hostname']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                        if ( peerFOList == 'TARGETPEERS' ) {
                            peerList.push(peerTmp);
                        }

                        if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                            eh = channel.newChannelEventHub(peerTmp);
                            eventHubs.push(eh);
                            if ( evtType == 'FILTEREDBLOCK' ) {
                                eh.connect();
                            } else {
                                eh.connect(true);
                            }
                        }
                        found = 1;
                    }
                } else {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] key: %s, subkey: %s', Nid, channelName, org, pid, key, ORGS[org][subkey].requests);
                    peerTmp = client.newPeer( ORGS[key][subkey].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                    if ( ((evtType == 'CHANNEL') || (evtType == 'FILTEREDBLOCK')) && (invokeType == 'MOVE') ) {
                        eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                        if ( evtType == 'FILTEREDBLOCK' ) {
                            eh.connect();
                        } else {
                            eh.connect(true);
                        }
                    }
                    found = 1;
                }
                if ( found == 1 ) {
                    break;
                }
            }
        }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] peers: %s', Nid, channelName, org, pid, channel.getPeers());
}

// add target peers to channel
function setTargetPeers(tPeers) {
    if (tPeers == 'ORGANCHOR') {
        assignThreadOrgAnchorPeer(channel, client, org);
    } else if (tPeers == 'ALLANCHORS'){
        assignThreadAllAnchorPeers(channel,client, org);
    } else if (tPeers == 'ORGPEERS'){
        assignThreadOrgPeer(channel, client, org);
    } else if (tPeers == 'ALLPEERS'){
        assignThreadAllPeers(channel,client, org);
    } else if (tPeers == 'LIST'){
        assignThreadPeerList(channel,client,org);
    } else if (tPeers == 'ROUNDROBIN'){
        assignThreadPeerID(channel,client,org,tPeers);
    } else if ( (tPeers == 'DISCOVERY') || (transType == 'DISCOVERY') ) {
        serviceDiscovery=true;
        if ((typeof(txCfgPtr.discoveryOpt) !== 'undefined')) {
            var discoveryOpt = txCfgPtr.discoveryOpt;
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d setTargetPeers] discoveryOpt: %j', Nid, channelName, org, pid, discoveryOpt);
            if ((typeof( discoveryOpt.localHost ) !== 'undefined')) {
                if (  discoveryOpt.localHost ) {
                    localHost = true;
                }
            }
            if ((typeof( discoveryOpt.initFreq ) !== 'undefined')) {
                initFreq = parseInt(discoveryOpt.initFreq);
            }
        }

        channelAdd1Peer(channel, client, org);       // add one peer to channel to perform service discovery
        if ( (tPeers == 'DISCOVERY') || (transType == 'DISCOVERY') ) {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] execTransMode: serviceDiscovery=%j, localHost: %j', Nid, channelName, org, pid, serviceDiscovery, localHost);
            initDiscovery();
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] pte-exec:completed:error targetPeers= %s', Nid, channelName, org, pid, tPeers);
        process.exit(1);
    }

}
/*
 *   transactions begin ....
 */
    execTransMode();

function getSubmitterForOrg(username, secret, client, peerOrgAdmin, Nid, org, svcFile) {
    return testUtil.getSubmitter(username, secret, client, peerOrgAdmin, Nid, org, svcFile);
}

async function execTransMode() {

    // init vars
    inv_m = 0;
    inv_q = 0;

    var username = ORGS[org].username;
    var secret = ORGS[org].secret;
    logger.debug('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] user= %s, secret=%s', Nid, channelName, org, pid, username, secret);

    //var tlsInfo = null;
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, org, svcFile);
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] got user private key: org=%s', Nid, channelName, org, pid, org);
    }

    var cryptoSuite = hfc.newCryptoSuite();
//    var useStore = false;
    var useStore = true;
    if (useStore) {
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(Nid,orgName)}));
        client.setCryptoSuite(cryptoSuite);
    }


    //enroll user
    var promise;
    hfc.setConfigSetting('request-timeout', reqTimeout);
    if (useStore) {
        promise = hfc.newDefaultKeyValueStore({
                  path: testUtil.storePathForOrg(Nid, orgName)});
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
                    return currentFunction(username, secret, client, true, Nid, channelOrgName[currentIndex], svcFile);
                }), Promise.resolve()
        );
    }).then(
                function(admin) {
                    orgAdmins[channelOrgName[channelOrgName.length - 1]] = admin;

                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] Successfully loaded user \'admin\'', Nid, channelName, org, pid);
                    the_user = admin;

                    if (targetPeers != 'DISCOVERY'){
                        assignOrdererList(channel, client);
                        channelAddOrderer(channel, client, org);
                        setCurrOrdererId(channel, client, org);

                        if ( peerFOList == 'ALL' ) {
                            assignPeerList(channel, client, org);
                        }
                    }

                    // add target peers to channel
                    setTargetPeers(targetPeers);

                    // add event if Block listener
                    listenToEventHub();

                    if (targetPeers != 'DISCOVERY'){
                        setCurrPeerId(channel, client, org);
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] peerList: ' , Nid, channelName, org, pid, peerList);
                    }

                    // execute transactions
                    tCurr = new Date().getTime();
                    var tSynchUp=tStart-tCurr;
                    if ( tSynchUp < 10000 ) {
                        tSynchUp=10000;
                    }
	            logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] execTransMode: tCurr= %d, tStart= %d, time to wait=%d', Nid, channelName, org, pid, tCurr, tStart, tSynchUp);

                    setTimeout(function() {
                        //logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] get peers %j', Nid, channelName, org, pid, channel.getPeers());
                        if (transType == 'DISCOVERY') {
                            execModeDiscovery();
                        } else if (transMode == 'SIMPLE') {
                            execModeSimple();
                        } else if (transMode == 'CONSTANT') {
                            distOpt = txCfgPtr.constantOpt;
                            execModeConstant();
                        } else if (transMode == 'POISSON') {
                            distOpt = txCfgPtr.poissonOpt;
                            execModePoisson();
                        } else if (transMode == 'MIX') {
                            execModeMix();
                        } else if (transMode == 'BURST') {
                            execModeBurst();
                        } else if (transMode == 'LATENCY') {
                            execModeLatency();
                        } else if (transMode == 'PROPOSAL') {
                            execModeProposal();
                        } else {
                            // invalid transaction request
                            logger.error(util.format("[Nid:chan:org:id=%d:%s:%s:%d execTransMode] pte-exec:completed:error Transaction %j and/or mode %s invalid", Nid, channelName, org, pid, transType, transMode));
                            process.exit(1);
                        }
                    }, tSynchUp);
                }
    );
}

function isExecDone(trType){
    tCurr = new Date().getTime();
    if ( trType.toUpperCase() == 'MOVE' ) {
        if ( nRequest > 0 ) {
           if ( (inv_m % (nRequest/10)) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, evtTimeoutCnt=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_m, tx_stats[tx_evtTimeout], tCurr-tLocal));
           }

           if ( inv_m >= nRequest ) {
                IDone = 1;
           }
        } else {
           if ( (inv_m % 1000) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, evtTimeoutCnt=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_m, tx_stats[tx_evtTimeout], tCurr-tLocal));
           }

           if ( runForever == 0 ) {
               if ( tCurr > tEnd ) {
                    IDone = 1;
               }
           }
        }

        // set a guard timer that extends past the time when all events for all invoke TXs should have been received or timed out.
        // If this guard timer times out, then that means at least one invoke TX did not make it,
        // and cleanup has not happened so we can finish and clean up now.
        if ( IDone == 1 ) {
            clearInitDiscTimeout();
            lastSentTime = new Date().getTime();
            console.log('[Nid:chan:org:id=%d:%s:%s:%d isExecDone] setup Timeout: %d ms, curr time: %d', Nid, channelName, org, pid, evtTimeout, lastSentTime);
            setTimeout(function(){
                postEventProc('isExecDone', tx_stats);
                if ( !invokeCheck ) {
                    process.exit();
                }

            }, evtTimeout);
        }

    } else if ( trType.toUpperCase() == 'QUERY' ) {
        if ( nRequest > 0 ) {
           if ( (inv_q % (nRequest/10)) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_q, tCurr-tLocal));
           }

           if ( inv_q >= nRequest ) {
                QDone = 1;
                clearInitDiscTimeout();
           }
        } else {
           if ( (inv_q % 1000) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_q, tCurr-tLocal));
           }

           if ( runForever == 0 ) {
               if ( tCurr > tEnd ) {
                    QDone = 1;
                    clearInitDiscTimeout();
               }
           }
        }
    } else if ( trType.toUpperCase() == 'DISCOVERY' ) {
        if ( nRequest > 0 ) {
           if ( (n_sd % (nRequest/10)) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, n_sd, tCurr-tLocal));
           }

           if ( n_sd >= nRequest ) {
                IDone = 1;
                clearInitDiscTimeout();
           }
        } else {
           if ( (n_sd % 1000) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, n_sd, tCurr-tLocal));
           }

           if ( runForever == 0 ) {
               if ( tCurr > tEnd ) {
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
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d %s] completed %d, evtTimoutCnt %d, unreceived events %d, %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, caller, inv_m, tx_stats[tx_evtTimeout], remain, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
    if ( remain > 0 ) {
        console.log('[Nid:chan:org:id=%d:%s:%s:%d %s] unreceived events(%d), txidList', Nid, channelName, org, pid, caller, remain, txidList);
    }

}

// invoke validation
function invokeValidation(caller) {

    if ( !invokeCheck ) {
        logger.info("[Nid:chan:org:id=%d:%s:%s:%d invokeValidation] caller(%s), invokeCheck: %j", Nid, channelName, org, pid, caller, invokeCheck);
        return;
    }
    logger.info("[Nid:chan:org:id=%d:%s:%s:%d invokeValidation] caller(%s) %s, %s, %d", Nid, channelName, org, pid, caller, invokeCheckPeers, invokeCheckTx, invokeCheckTxNum);

    // reset transaction index
    nRequest = inv_m;
    if (invokeCheckTx == 'LAST') {
        if ( invokeCheckTxNum > inv_m ) {
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

    invoke_query_simple(0);

}


var txRequest;
function getTxRequest(results) {
    txRequest = {
        proposalResponses: results[0],
        proposal: results[1]
    };
}

// event var
var evtRcv=0;
var evtCount=0;


function postEventProc(caller, stats) {

    var endTime = new Date().getTime();
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] evtLastRcvdTime: %d, lastSentTime: %d, endTime: %d', Nid, channelName, org, pid, caller, evtLastRcvdTime, lastSentTime, endTime);
    if ( evtLastRcvdTime == 0 ) {
        evtLastRcvdTime = endTime;
    }
    stats[tx_evtUnreceived] = Object.keys(txidList).length;
    stats[tx_rcvd]=stats[tx_sent]-stats[tx_pFail]-stats[tx_txFail]-stats[tx_evtUnreceived];
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] stats ', Nid, channelName, org, pid, caller, stats);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] pte-exec:completed  Rcvd=%d sent= %d proposal failure %d tx orderer failure %d %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d, Throughput=%d TPS', Nid, channelName, org, pid, caller, stats[tx_rcvd], stats[tx_sent], stats[tx_pFail], stats[tx_txFail], transType, invokeType, evtLastRcvdTime-tLocal, tLocal, evtLastRcvdTime, stats[tx_evtTimeout], stats[tx_evtUnreceived], (stats[tx_rcvd]/(evtLastRcvdTime-tLocal)*1000).toFixed(2));
    if ( stats[tx_evtUnreceived] > 0 ) {
        console.log('[Nid:chan:org:id=%d:%s:%s:%d postEventProc:%s] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, caller, stats[tx_evtUnreceived], txidList);
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
                if ( (typeof(filtered_block.number) != 'undefined') && (filtered_block.number > 0) ) {
                    if (typeof(filtered_block.filtered_transactions) != 'undefined') {
                      for (i=0; i<filtered_block.filtered_transactions.length; i++) {
                        var txid = filtered_block.filtered_transactions[i].txid;
                        if ( txidList[txid] ) {
                            evtLastRcvdTime = new Date().getTime();
                            if ( (evtLastRcvdTime - txidList[txid]) > evtTimeout ) {
                                tx_stats[tx_evtTimeout]++;
                            }
                            evtRcv = evtRcv + 1;
                            var tend = new Date().getTime();
                            latency_update(evtRcv, tend-txidList[txid], latency_event);
                            delete txidList[txid];
                            if (transMode == 'LATENCY') {
                                isExecDone('Move');
                                if ( IDone != 1 ) {
                                    invoke_move_latency();
                                }
                            }
                        }
                      }
                    } else {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec: Failure - received filtered_block.number:%d but filtered_transactions is undefined: %j', Nid, channelName, org, pid, filtered_block);
                    }

                    var totalTx = evtRcv + tx_stats[tx_pFail] + tx_stats[tx_txFail];
                    if ( inv_m == totalTx ) {
                        if ( IDone == 1 ) {
                            postEventProc('eventRegisterFilteredBlock', tx_stats);
                            eh.unregisterBlockEvent(block_reg);
                            if ( !invokeCheck ) {
                                process.exit();
                            }
                        }
                    }
                    resolve();
                } else {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec: Failure - received block with undefined filtered_block.number: %j',Nid, channelName, org, pid, filtered_block);
                }
            },
            (err) => {
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] inv_m:evtRcv=%d:%d err: %j', Nid, channelName, org, pid, inv_m, eBvtRcv, err);
            });
        }).catch((err) => {
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, tx_stats[tx_evtTimeout], transType, invokeType, tCurr-tLocal, tLocal, tCurr);
        });

    });

}

function eventRegisterBlock() {

    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {

            eh.registerBlockEvent((block) => {
                for (i=0; i<block.data.data.length; i++) {
                    var txid = block.data.data[i].payload.header.channel_header.tx_id;
                    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] tx id= %s', Nid, channelName, org, pid, txid);
                    if ( txidList[txid] ) {
                        evtLastRcvdTime = new Date().getTime();
                        if ( (evtLastRcvdTime - txidList[txid]) > evtTimeout ) {
                            tx_stats[tx_evtTimeout]++;
                        }
                        evtRcv = evtRcv + 1;
                        var tend = new Date().getTime();
                        latency_update(evtRcv, tend-txidList[txid], latency_event);
                        delete txidList[txid];
                        if (transMode == 'LATENCY') {
                            isExecDone('Move');
                            if ( IDone != 1 ) {
                                invoke_move_latency();
                            }
                        }
                    }
                }

                var totalTx = evtRcv + tx_stats[tx_pFail] + tx_stats[tx_txFail];
                if ( inv_m == totalTx ) {
                    if ( IDone == 1 ) {
                        postEventProc('eventRegisterBlock', tx_stats);
                        if ( !invokeCheck ) {
                            process.exit();
                        }
                    }
                }
                    resolve();
            },
            (err) => {
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] inv_m:evtRcv=%d:%d err: %j', Nid, channelName, org, pid, inv_m, eBvtRcv, err);
            });
        }).catch((err) => {
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, tx_stats[tx_evtTimeout], transType, invokeType, tCurr-tLocal, tLocal, tCurr);
        });

    });

}

function eventRegister(tx) {

    var deployId = tx.getTransactionID();
    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(function(){eh.unregisterTxEvent(deployId);
            resolve()}, evtTimeout);

            eh.registerTxEvent(deployId.toString(), (tx, code, bk_num) => {
                clearTimeout(handle);

                if ( txidList[deployId.toString()] ) {
                    evtLastRcvdTime = new Date().getTime();
                    if ( (evtLastRcvdTime - txidList[deployId.toString()]) > evtTimeout ) {
                        tx_stats[tx_evtTimeout]++;
                    }
                    eh.unregisterTxEvent(deployId);
                    evtRcv++;
                    var tend = new Date().getTime();
                    latency_update(evtRcv, tend-txidList[deployId.toString()], latency_event);
                    delete txidList[deployId.toString()];

                    if (code !== 'VALID') {
                        logger.error('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] The invoke transaction (%s) was invalid, code = ', Nid, channelName, org, pid, deployId.toString(), code);
                        reject();
                    } else {
                        var totalTx = evtRcv + tx_stats[tx_pFail] + tx_stats[tx_txFail];
                        if ( ( IDone == 1 ) && ( inv_m == totalTx ) ) {
                            postEventProc('eventRegister', tx_stats);
                            if ( !invokeCheck ) {
                                process.exit();
                            }
                        }
                    }
                    }
                }).catch((err) => {
                    clearTimeout(handle);
                });
            }).catch((err) => {
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, tx_stats[evtTimeout], transType, invokeType, tCurr-tLocal, tLocal, tCurr);
            });

            eventPromises.push(txPromise);
        });

}

// orderer handler:
//    failover if failover is set
//    reconnect if reconn=1
function ordererHdlr() {

    if (ordererFO) {
        ordererFailover(channel, client);
    } else {
        ordererReconnect(channel, client, org);
    }
    sleep (grpcTimeout);
}

// invoke_move_latency
function invoke_move_latency() {

    inv_m++;
    tx_stats[tx_sent]++;

    getMoveRequest();

    var ts = new Date().getTime();
    channel.sendTransactionProposal(request_invoke)
    .then(
        function(results) {
            var proposalResponses = results[0];

            // setup tx id array and update proposal latency
            var te = new Date().getTime();
            getTxRequest(results);
            txidList[tx_id.getTransactionID().toString()] = te;
            // update proposal latency
            latency_update(inv_m, te-ts, latency_peer);

            var tos = new Date().getTime();
            return channel.sendTransaction(txRequest)
            .then((results) => {
                // update transaction latency
                var toe = new Date().getTime();
                latency_update(inv_m, toe-tos, latency_orderer);
                if ( results.status != 'SUCCESS' ) {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                    isExecDone('Move');
                    if ( IDone != 1 ) {
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
                if ( IDone != 1 ) {
                    ordererHdlr();
                    invoke_move_latency();
                } else {
                    IDoneMsg("invoke_move_latency");
                }
            })
        },
        function(err) {
            tx_stats[tx_pFail]++;
            var te = new Date().getTime();
            latency_update(inv_m, te-ts, latency_peer);
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            isExecDone('Move');
            if ( IDone != 1 ) {
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

    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeLatency] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            var freq = ccFuncInst.getExecModeLatencyFreq();

            invoke_move_latency();
        } else if ( invokeType == 'QUERY' ) {
            invoke_query_simple(0);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeLatency] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

// invoke_move_simple
function invoke_move_simple(freq) {
    inv_m++;

    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then(
        function(results) {
            var proposalResponses = results[0];

            getTxRequest(results);
            eventRegister(request_invoke.txId);
            txidList[tx_id.getTransactionID().toString()] = new Date().getTime();

            var sendPromise = channel.sendTransaction(txRequest);
            return Promise.all([sendPromise].concat(eventPromises))
            .then((results) => {

                isExecDone('Move');
                if ( results.status != 'SUCCESS' ) {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_simple] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                }

                if ( IDone != 1 ) {
                    setTimeout(function(){
                        invoke_move_simple(freq);
                    },freq);
                } else {
                    IDoneMsg("invoke_move_simple");
                }
                return results[0];

            }).catch((err) => {
                tx_stats[tx_txFail]++;
                delete txidList[tx_id.getTransactionID().toString()];
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_simple] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                isExecDone('Move');
                if ( IDone != 1 ) {
                    ordererHdlr();
                    setTimeout(function(){
                        invoke_move_simple(freq);
                    },freq);
                } else {
                    IDoneMsg("invoke_move_simple");
                }
            })

        },
        function(err) {
            tx_stats[tx_pFail]++;
            var te = new Date().getTime();
            latency_update(inv_m, te-ts, latency_peer);
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_simple] Failed to send proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            isExecDone('Move');
            if ( IDone != 1 ) {
                if (peerFO) {
                    peerFailover(channel, client);
                }
                setTimeout(function(){
                    invoke_move_simple(freq);
                },freq);
            } else {
                IDoneMsg("invoke_move_simple");
            }
        });
}




// invoke_query_simple
function invoke_query_simple(freq) {
    inv_q++;

    getQueryRequest();
    channel.queryByChaincode(request_query)
    .then(
        function(response_payloads) {
            if (response_payloads) {
                for(let j = 0; j < response_payloads.length; j++) {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_simple] query[%d] result[%d]:', Nid, channelName, org, pid, inv_q, j,response_payloads[j].toString('utf8'));
                }
            }
            isExecDone('Query');
            if ( QDone != 1 ) {
                setTimeout(function(){
                    invoke_query_simple(freq);
                },freq);
            } else {
                tCurr = new Date().getTime();
                if (response_payloads) {
                    for(let j = 0; j < response_payloads.length; j++) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_simple] query result[%d]:', Nid, channelName, org, pid, j,response_payloads[j].toString('utf8'));
                    }
                } else {
                    logger.debug('response_payloads is null');
                }
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_simple] pte-exec:completed %d transaction: %s(%s) in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, inv_q, transType, invokeType, tCurr-tLocal, tLocal, tCurr,(inv_q/(tCurr-tLocal)*1000).toFixed(2));
                process.exit();
            }
        },
        function(err) {
            logger.error('[[Nid:chan:org:id=%d:%s:%s:%d invoke_query_simple] pte-exec:completed:error Failed to send query due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            process.exit();
            return;
        })
    .catch(
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_simple] pte-exec:completed:error %s failed: ', Nid, channelName, org, pid, transType,  err.stack ? err.stack : err);
            process.exit();
        }
    );

}

function execModeSimple() {

    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeSimple] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            var freq = ccFuncInst.getExecModeSimpleFreq();
            invoke_move_simple(freq);
        } else if ( invokeType == 'QUERY' ) {
            invoke_query_simple(0);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeSimple] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}


// cleanup array object
function cleanup(array) {

    logger.info('[Nid:chan:org:id=%d:%s:%s:%d cleanup] cleanup ...', Nid, channelName, org, pid);
    for (var key in array) {
      delete array[key];
      console.log('[Nid:chan:org:id=%d:%s:%s:%d cleanup] array key[%s] deleted ', Nid, channelName, org, pid, key);
    }

    logger.info('[Nid:chan:org:id=%d:%s:%s:%d cleanup] cleanup ... done', Nid, channelName, org, pid);
}

// output latency matrix
function latency_output() {

    // output peers latency
    if ( latency_peer[0] != 0 ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed peer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= %d ms', Nid, channelName, org, pid, latency_peer[0], latency_peer[1], latency_peer[2], latency_peer[3], (latency_peer[1]/latency_peer[0]).toFixed(2));
    } else {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed peer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= NA ms', Nid, channelName, org, pid, latency_peer[0], latency_peer[1], latency_peer[2], latency_peer[3]);
    }

    // output orderer latency
    if ( latency_orderer[0] != 0 ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed orderer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= %d ms', Nid, channelName, org, pid, latency_orderer[0], latency_orderer[1], latency_orderer[2], latency_orderer[3], (latency_orderer[1]/latency_orderer[0]).toFixed(2));
    } else {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed orderer latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= NA ms', Nid, channelName, org, pid, latency_orderer[0], latency_orderer[1], latency_orderer[2], latency_orderer[3]);
    }

    // output event latency
    if ( latency_event[0] != 0 ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d latency_output] pte-exec:completed event latency stats: tx num= %d, total time: %d ms, min= %d ms, max= %d ms, avg= %d ms', Nid, channelName, org, pid, latency_event[0], latency_event[1], latency_event[2], latency_event[3], (latency_event[1]/latency_event[0]).toFixed(2));
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
    if ( td < latency[2] ) {
        latency[2] = td;
    }
    if ( td > latency[3] ) {
        latency[3] = td;
    }

}
var devFreq;
function getRandomNum(min0, max0) {
    return Math.floor(Math.random() * (max0-min0)) + min0;
}

function invoke_move_dist_go_evtBlock(t1, backoffCalculator) {

    var freq_n = backoffCalculator();
    tCurr = new Date().getTime();
    t1 = tCurr - t1;
    if ( t1 < freq_n ) {
       freq_n = freq_n - t1;
    } else {
       freq_n = 0;
    }
    setTimeout(function(){
        //logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] Triggering invoke after %d msec', Nid, channelName, org, pid, freq_n);
        invoke_move_dist_evtBlock(backoffCalculator);
    },freq_n);

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
            latency_update(inv_m, te-ts, latency_peer);

            var proposalResponses = results[0];
            //for ( var u = 0; u< results.length; u++) {
            //   logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] u %d proposal: %j ', Nid, channelName, org, pid, u, results[u]);
            //}

            if ( typeof(results[0][0].response) === 'undefined' ) {
                reConnectEvtHub=1;
                tx_stats[tx_pFail]++;
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] proposal failed %d, %j', Nid, channelName, org, pid, tx_stats[tx_pFail], tx_id.getTransactionID().toString());
                isExecDone('Move');
                if ( IDone != 1 ) {
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
                    latency_update(inv_m, toe-tos, latency_orderer);

                    if ( reConnectEvtHub == 1 ) {
                        reConnectEvtHub=reConnectEventHub(reConnectEvtHub);
                        reConnectEvtHub=0;
                    }

                    isExecDone('Move');
                    if ( results.status != 'SUCCESS' ) {
                        tx_stats[tx_txFail]++;
                        delete txidList[tx_id.getTransactionID().toString()];
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] failed to sendTransaction status: %j ', Nid, channelName, org, pid, results);
                    }

                    // hist output
                    if ( recHist == 'HIST' ) {
                        tCurr = new Date().getTime();
                        buff = PTEid +':'+ Nid +':'+ pid + ':' + channelName +':' + org + ' ' + transType[0]+':'+invokeType[0] + ':' + inv_m + ' time:'+ tCurr + '\n';
                        fs.appendFile(ofile, buff, function(err) {
                            if (err) {
                               return logger.error(err);
                            }
                        })
                    }

                    if ( IDone != 1 ) {
                        invoke_move_dist_go_evtBlock(t1, backoffCalculator);
                    } else {
                        IDoneMsg("invoke_move_dist_evtBlock");
                        return;
                    }

                },(err) => {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    var toe = new Date().getTime();
                    latency_update(inv_m, toe-tos, latency_orderer);

                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    isExecDone('Move');
                    if ( IDone != 1 ) {
                        ordererHdlr();
                        invoke_move_dist_go_evtBlock(t1, backoffCalculator);
                    } else {
                        IDoneMsg("invoke_move_dist_evtBlock");
                        return;
                    }
                })
        },(err) => {
                tx_stats[tx_pFail]++;
                var te = new Date().getTime();
                latency_update(inv_m, te-ts, latency_peer);
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist_evtBlock] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    if (peerFO) {
                        peerFailover(channel, client);
                    }
                    invoke_move_dist_go_evtBlock(t1, backoffCalculator);
                } else {
                    IDoneMsg("invoke_move_dist_evtBlock");
                }
        });
}

function invoke_move_dist_go(t1, backoffCalculator) {

    var freq_n = backoffCalculator();
    tCurr = new Date().getTime();
    t1 = tCurr - t1;
    if ( t1 < freq_n ) {
       freq_n = freq_n - t1;
    } else {
       freq_n = 0;
    }
    setTimeout(function(){
        invoke_move_dist(backoffCalculator);
    },freq_n);

}
// invoke_move_dist
function invoke_move_dist(backoffCalculator) {
    inv_m++;
    tx_stats[tx_sent]++;

    var t1 = new Date().getTime();
    // getMoveRequest();
    var txProposal = requestQueue.pop();
    if (!txProposal) {
        logger.debug("empty requestQueue");
        invoke_move_dist_go(t1, backoffCalculator);
        return;
    }
    txProposal.targets = targets;

    var ts = new Date().getTime();
    channel.sendTransactionProposal(txProposal)
    .then((results) => {

            var te = new Date().getTime();
            latency_update(inv_m, te-ts, latency_peer);

            var proposalResponses = results[0];

            txidList[txProposal.txId.getTransactionID().toString()] = new Date().getTime();

            eventRegister(txProposal.txId);

            getTxRequest(results);

            var tos = new Date().getTime();
            var sendPromise = channel.sendTransaction(txRequest);
            return Promise.all([sendPromise].concat(eventPromises))
            .then((results) => {

                var toe = new Date().getTime();
                latency_update(inv_m, toe-tos, latency_orderer);

                isExecDone('Move');
                if ( results[0].status != 'SUCCESS' ) {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                }

                // hist output
                if ( recHist == 'HIST' ) {
                    tCurr = new Date().getTime();
                    buff = PTEid +':'+ Nid +':'+ pid + ':' + channelName +':' + org + ' ' + transType[0]+':'+invokeType[0] + ':' + inv_m + ' time:'+ tCurr + '\n';
                    fs.appendFile(ofile, buff, function(err) {
                        if (err) {
                           return logger.error(err);
                        }
                    })
                }

                if ( IDone != 1 ) {
                    invoke_move_dist_go(t1, backoffCalculator);
                } else {
                    IDoneMsg("invoke_move_dist");
                    return;
                }

            }).catch((err) => {
                tx_stats[tx_pFail]++;
                delete txidList[tx_id.getTransactionID().toString()];
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    ordererHdlr();
                    invoke_move_dist_go(t1, backoffCalculator);
                } else {
                    IDoneMsg("invoke_move_dist");
                    return;
                }
            })

        }).catch((err) => {
            tx_stats[tx_pFail]++;
            delete txidList[tx_id.getTransactionID().toString()];
            var te = new Date().getTime();
            latency_update(inv_m, te-ts, latency_peer);

            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_dist] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

            isExecDone('Move');
            if ( IDone != 1 ) {
                if (peerFO) {
                    peerFailover(channel, client);
                }
                invoke_move_dist_go(t1, backoffCalculator);
            } else {
                IDoneMsg("invoke_move_dist");
                return;
            }
        });
}

// query validation
function queryValidation(response) {
    var payload=response[0].data;
    var founderr = 0;
    tx_stats[tx_rcvd]=tx_stats[tx_rcvd]+response.length;
    for(let j = 0; j < response.length; j++) {
        var qResp = response[j].toString('utf8').toUpperCase();
        if ( qResp.includes('ERROR') || qResp.includes('FAIL') ) {
            tx_stats[tx_pFail]++;
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d queryValidation] query return:', Nid, channelName, org, pid, response[j].toString('utf8'));
        }
        if ( (founderr == 0) && (payload !== response[j].data) ) {
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
        function(response_payloads) {
            // query validation
            queryValidation(response_payloads);

            // check bookmark
            var qcheck = response_payloads[0].toString('utf8').toUpperCase();
            if ( qcheck.includes('BOOKMARK') && qcheck.includes('KEY') ) {
                // get bookmark from query returned
                var qc=JSON.parse(response_payloads[0].toString('utf8'));
                bookmark=qc.ResponseMetadata.Bookmark;
            } else {
                // reset bookmark
                bookmark='';
            }
            // output
            if ( recHist == 'HIST' ) {
                tCurr = new Date().getTime();
                buff = PTEid +':'+ Nid +':'+ pid + ':' + channelName +':' + org + ' ' + transType[0] +':'+invokeType[0]+ ':' + inv_q + ' time:'+ tCurr + '\n';
                fs.appendFile(ofile, buff, function(err) {
                    if (err) {
                       return logger.error(err);
                    }
                })
            }
            isExecDone('Query');
            if ( QDone != 1 ) {
                var freq_n = backoffCalculator();
                setTimeout(function(){
                    invoke_query_dist(backoffCalculator);
                },freq_n);
            } else {
                tCurr = new Date().getTime();
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] query result response_payloads length:', Nid, channelName, org, pid, response_payloads.length);
                for(let j = 0; j < response_payloads.length; j++) {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] query result:', Nid, channelName, org, pid, response_payloads[j].toString('utf8'));
                }
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed %d transaction %s(%s) with %d failures %d received in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, tx_stats[tx_sent], transType, invokeType, tx_stats[tx_pFail], tx_stats[tx_rcvd], tCurr-tLocal, tLocal, tCurr,(tx_stats[tx_rcvd]/(tCurr-tLocal)*1000).toFixed(2));
                process.exit();
            }
        },
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed:error Failed to send query due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            tx_stats[tx_pFail]++;
            isExecDone('Query');
            if ( QDone != 1 ) {
                var freq_n = backoffCalculator();
                setTimeout(function(){
                    invoke_query_dist(backoffCalculator);
                },freq_n);
            } else {
                tCurr = new Date().getTime();
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed %d transaction %s(%s) with %d failures %d received in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, tx_stats[tx_sent], transType, invokeType, tx_stats[tx_pFail], tx_stats[tx_rcvd], tCurr-tLocal, tLocal, tCurr,(tx_stats[tx_rcvd]/(tCurr-tLocal)*1000).toFixed(2));
                process.exit();
            }
        })
    .catch(
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed:error %s failed: ', Nid, channelName, org, pid, transType,  err.stack ? err.stack : err);
            tx_stats[tx_pFail]++;
            isExecDone('Query');
            if ( QDone != 1 ) {
                var freq_n = backoffCalculator();
                setTimeout(function(){
                    invoke_query_dist(backoffCalculator);
                },freq_n);
            } else {
                tCurr = new Date().getTime();
                tx_stats[tx_rcvd]=tx_stats[tx_sent]-tx_stats[tx_pFail];
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_dist] pte-exec:completed %d transaction %s(%s) with %d failures in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, tx_stats[tx_sent], transType, invokeType, tx_stats[tx_pFail], tCurr-tLocal, tLocal, tCurr,(tx_stats[tx_rcvd]/(tCurr-tLocal)*1000).toFixed(2));
                process.exit();
            }
        }
    );

}
function execModeDistribution(backoffCalculator, delayCalculator) {

    if ( !delayCalculator) {
        delayCalculator = backoffCalculator;
    }
    if ( transType == 'INVOKE' ) {
        if (distOpt.recHist) {
            recHist = distOpt.recHist.toUpperCase();
        }
        logger.info('recHist: ', recHist);

        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        ofile = txCfgPtr.transMode + 'Results'+PTEid+'.txt';

        if ( invokeType == 'MOVE' ) {

            if (evtListener == 'BLOCK') {
                invoke_move_dist_evtBlock(backoffCalculator);
            } else {
                requestPusher(getMoveRequest, delayCalculator, 10);
                invoke_move_dist(backoffCalculator);
            }
        } else if ( invokeType == 'QUERY' ) {
            invoke_query_dist(backoffCalculator);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] pte-exec:completed:error invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

function backoffCalculatorConstantFreq() {
    var freq = parseInt(txCfgPtr.constantOpt.constFreq);
    return freq;
}

function backoffCalculatorConstant() {
    var freq_n = backoffCalculatorConstantFreq();
    if ( devFreq > 0 ) {
        freq_n=getRandomNum(freq_n-devFreq, freq_n+devFreq);
    }
    return freq_n;
}

function execModeConstant() {
    var freq = backoffCalculatorConstantFreq();
    if ( transType == 'INVOKE' ) {
        if (typeof( txCfgPtr.constantOpt.devFreq ) == 'undefined') {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeDistribution] devFreq undefined, set to 0', Nid, channelName, org, pid);
            devFreq=0;
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

// mix mode
function invoke_move_mix_go(freq) {
    setTimeout(function(){
        ccFuncInst.arg0--;
        invoke_query_mix(freq);
    },freq);
}

function invoke_move_mix(freq) {
    inv_m++;

    var t1 = new Date().getTime();
    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var proposalResponses = results[0];

            getTxRequest(results);
            eventRegister(request_invoke.txId);
            txidList[tx_id.getTransactionID().toString()] = new Date().getTime();

            var sendPromise = channel.sendTransaction(txRequest);
            return Promise.all([sendPromise].concat(eventPromises))
            .then((results) => {

                isExecDone('Move');
                if ( results[0].status != 'SUCCESS' ) {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                }

                if ( IDone != 1 ) {
                    invoke_move_mix_go(freq);
                } else {
                    IDoneMsg("invoke_move_mix");
                    return results[0];
                }

            }).catch((err) => {
                tx_stats[tx_txFail]++;
                delete txidList[tx_id.getTransactionID().toString()];
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                isExecDone('Move');
                if ( IDone != 1 ) {
                    ordererHdlr();
                    invoke_move_mix_go(freq);
                } else {
                    IDoneMsg("invoke_move_mix");
                    return results[0];
                }
            })

        }).catch((err) => {
                tx_stats[tx_pFail]++;
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    if (peerFO) {
                        peerFailover(channel, client);
                    }
                    invoke_move_mix_go(freq);
                } else {
                    IDoneMsg("invoke_move_mix");
                    return results[0];
                }
        });
}

// invoke_query_mix
function invoke_query_mix(freq) {
    inv_q++;

    getQueryRequest();
    channel.queryByChaincode(request_query)
    .then(
        function(response_payloads) {
                if (mixQuery) {
                    for(let j = 0; j < response_payloads.length; j++) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_mix] query result: %j, %j', Nid, channelName, org, pid, request_query.args, response_payloads[j].toString('utf8'));
                    }
                }

                // query validation
                queryValidation(response_payloads);

                // check bookmark
                var qcheck = response_payloads[0].toString('utf8').toUpperCase();
                if ( qcheck.includes('BOOKMARK') && qcheck.includes('KEY') ) {
                    // get bookmark from query returned
                    var qc=JSON.parse(response_payloads[0].toString('utf8'));
                    bookmark=qc[1][0].ResponseMetadata.Bookmark;
                } else {
                    // reset bookmark
                    bookmark='';
                }

                isExecDone('Move');
                if ( IDone != 1 ) {
                    invoke_move_mix(freq);
                } else {
                    for(let j = 0; j < response_payloads.length; j++) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_mix] query result:', Nid, channelName, org, pid, response_payloads[j].toString('utf8'));
                    }
                    tCurr = new Date().getTime();
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_mix] pte-exec:completed %d Invoke(move) and %d Invoke(query) in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, inv_m,inv_q,tCurr-tLocal, tLocal, tCurr,((inv_q+inv_m)/(tCurr-tLocal)*1000).toFixed(2));
                    process.exit(0);
                }
        },
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_mix] Failed to send query due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            invoke_move_mix(freq);
            //evtDisconnect();
            //return;
        })
    .catch(
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_mix] %s failed: ', Nid, channelName, org, pid, transType,  err.stack ? err.stack : err);
            invoke_move_mix(freq);
            //evtDisconnect();
        }
    );

}

var mixQuery = new Boolean(0);
function execModeMix() {

    if (typeof( txCfgPtr.mixOpt.mixQuery ) !== 'undefined') {
        if ( txCfgPtr.mixOpt.mixQuery == 'TRUE' ) {
            mixQuery = true;
        } else if ( txCfgPtr.mixOpt.mixQuery == 'FALSE' ) {
            mixQuery = false;
        } else {
            mixQuery = txCfgPtr.mixOpt.mixQuery;
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeMix] mixQuery: %s', Nid, channelName, org, pid, mixQuery);
    if ( transType == 'INVOKE' ) {
        // no need to check since a query is issued after every invoke
        invokeCheck = 'FALSE';
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeMix] tStart %d, tEnd %d, tLocal %d', Nid, channelName, org, pid, tStart, tEnd, tLocal);
        var freq = parseInt(txCfgPtr.mixOpt.mixFreq);
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeMix] Mix Freq: %d ms', Nid, channelName, org, pid, freq);
        invoke_move_mix(freq);
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeMix] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}


// invoke_move_latency
function invoke_move_proposal() {

    inv_m++;

    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then(
        function(results) {
            var proposalResponses = results[0];

            isExecDone('Move');
            if ( IDone == 1 ) {
               tCurr = new Date().getTime();
               logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_proposal] completed %d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
               evtDisconnect();
               return;
            } else {
                    invoke_move_proposal();
                    return results[0];
            }


        },
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_proposal] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            evtDisconnect();
        });


}


function execModeProposal() {

    // send proposal to endorser
    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            var freq = ccFuncInst.getExecModeProposalFreq();
            invoke_move_proposal();
        } else if ( invokeType == 'QUERY' ) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] invalid invokeType= %s', Nid, channelName, org, pid, invokeType);
            evtDisconnect();
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

// Burst mode vars
var bDur=[];
var bFreq=[];
var bNext;
var bCurrFreq;
var bTotalModes;
var bCurrMode=0;

function getBurstFreq() {

    tCurr = new Date().getTime();

    // set up burst traffic duration and frequency
    if ( tCurr >= bNext ) {
        bCurrMode=(bCurrMode+1)%bTotalModes;
        bNext = tCurr + bDur[bCurrMode];
        bCurrFreq = bFreq[bCurrMode];
        //logger.info('[invoke_move_burst] bCurrFreq: %d, bNext: %d, tCurr: %d', bCurrFreq, bNext, tCurr);
    }

}

// invoke_move_burst
function invoke_move_burst_go(t1, freq){
    var freq_n=freq;
    tCurr = new Date().getTime();
    t1 = tCurr - t1;
    if ( t1 < freq_n ) {
       freq_n = freq_n - t1;
    } else {
       freq_n = 0;
    }
    setTimeout(function(){
        if ( evtListener == 'BLOCK' ) {
            invoke_move_burst_evtBlock();
        } else {
            invoke_move_burst();
        }
    },freq_n);
}

// invoke_move_burst_evtBlock
function invoke_move_burst_evtBlock() {
    inv_m++;

    var t1 = new Date().getTime();
    getBurstFreq();
    getMoveRequest();

    var ts = new Date().getTime();
    channel.sendTransactionProposal(request_invoke)
    .then((results) => {

            var te = new Date().getTime();
            latency_update(inv_m, te-ts, latency_peer);

            var proposalResponses = results[0];

            getTxRequest(results);
            txidList[tx_id.getTransactionID().toString()] = new Date().getTime();

                var tos = new Date().getTime();
                return channel.sendTransaction(txRequest)
                .then((results) => {

                    var toe = new Date().getTime();
                    latency_update(inv_m, toe-tos, latency_orderer);

                    isExecDone('Move');
                    if ( results.status != 'SUCCESS' ) {
                        tx_stats[tx_txFail]++;
                        delete txidList[tx_id.getTransactionID().toString()];
                        logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst_evtBlock] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                    }

                    if ( IDone != 1 ) {
                        invoke_move_burst_go(t1, bCurrFreq);
                    } else {
                        IDoneMsg("invoke_move_burst_evtBlock");
                        return;
                    }

                }).catch((err) => {
                    var toe = new Date().getTime();
                    latency_update(inv_m, toe-tos, latency_orderer);

                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst_evtBlock] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    isExecDone('Move');
                    if ( IDone != 1 ) {
                        ordererHdlr();
                        invoke_move_burst_go(t1, bCurrFreq);
                    } else {
                        IDoneMsg("invoke_move_burst_evtBlock");
                        return;
                    }
                })
        }).catch((err) => {
                var te = new Date().getTime();
                latency_update(inv_m, te-ts, latency_peer);

                tx_stats[tx_pFail]++;
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst_evtBlock] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    if (peerFO) {
                        peerFailover(channel, client);
                    }
                    invoke_move_burst_go(t1, bCurrFreq);
                } else {
                    IDoneMsg("invoke_move_burst_evtBlock");
                    return;
                }
        });
}

function invoke_move_burst() {
    inv_m++;
    var t1 = new Date().getTime();

    // get burst traffic duration and frequency
    getBurstFreq();

    var txProposal = requestQueue.pop();
    if (!txProposal) {
        logger.debug("empty requestQueue");
        invoke_move_burst_go(t1, bCurrFreq);
        return;
    }
    txProposal.targets = targets;

    var ts = new Date().getTime();
    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var te = new Date().getTime();
            latency_update(inv_m, te-ts, latency_peer);

            var proposalResponses = results[0];

            txidList[txProposal.txId.getTransactionID().toString()] = new Date().getTime();
            getTxRequest(results);
            eventRegister(request_invoke.txId);

            var tos = new Date().getTime();
            var sendPromise = channel.sendTransaction(txRequest);
            return Promise.all([sendPromise].concat(eventPromises))
            .then((results) => {

                var toe = new Date().getTime();
                latency_update(inv_m, toe-tos, latency_orderer);

                isExecDone('Move');
                if ( results[0].status != 'SUCCESS' ) {
                    tx_stats[tx_txFail]++;
                    delete txidList[tx_id.getTransactionID().toString()];
                    logger.warn('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send transaction due to invalid status: ', Nid, channelName, org, pid, results.status);
                }

                if ( IDone != 1 ) {
                    invoke_move_burst_go(t1, bCurrFreq);
                } else {
                    IDoneMsg("invoke_move_burst");
                    return;
                }

            }).catch((err) => {
                tx_stats[tx_txFail]++;
                delete txidList[tx_id.getTransactionID().toString()];
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                isExecDone('Move');
                if ( IDone != 1 ) {
                    ordererHdlr();
                    invoke_move_burst_go(t1, bCurrFreq);
                } else {
                    IDoneMsg("invoke_move_burst");
                }
                return;
            })

        }).catch((err) => {
                tx_stats[tx_pFail]++;
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    if (peerFO) {
                        peerFailover(channel, client);
                    }
                    invoke_move_burst_go(t1, bCurrFreq);
                } else {
                    IDoneMsg("invoke_move_burst");
                }
        });
}


// invoke_query_burst
function invoke_query_burst() {
    inv_q++;

    // set up burst traffic duration and frequency
    getBurstFreq();

    getQueryRequest();
    channel.queryByChaincode(request_query)
    .then(
        function(response_payloads) {
            // query validation
            queryValidation(response_payloads);

            // check bookmark
            var qcheck = response_payloads[0].toString('utf8').toUpperCase();
            if ( qcheck.includes('BOOKMARK') && qcheck.includes('KEY') ) {
                // get bookmark from query returned
                var qc=JSON.parse(response_payloads[0].toString('utf8'));
                bookmark=qc[1][0].ResponseMetadata.Bookmark;
            } else {
                // reset bookmark
                bookmark='';
            }

            isExecDone('Query');
            if ( QDone != 1 ) {
                setTimeout(function(){
                    invoke_query_burst();
                },bCurrFreq);
            } else {
                tCurr = new Date().getTime();
                for(let j = 0; j < response_payloads.length; j++) {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_burst] query result:', Nid, channelName, org, pid, response_payloads[j].toString('utf8'));
                }

                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_burst] pte-exec:completed %d transaction %s(%s) in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, inv_q, transType, invokeType, tCurr-tLocal, tLocal, tCurr,(inv_q/(tCurr-tLocal)*1000).toFixed(2));
                //return;
            }
        },
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_burst] Failed to send query due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            evtDisconnect();
            return;
        })
    .catch(
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_burst] %s failed: ', Nid, channelName, org, pid, transType,  err.stack ? err.stack : err);
            evtDisconnect();
        }
    );

}

function execModeBurst() {

    // input burstOpt
    if ( (typeof(txCfgPtr.burstOpt) === 'undefined') || (typeof(txCfgPtr.burstOpt.burstFreq) === 'undefined') || (typeof(txCfgPtr.burstOpt.burstDur) === 'undefined') ) {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] invalid burstOpt',Nid, channelName, org, pid);
        process.exit();
    }
    bTotalModes=txCfgPtr.burstOpt.burstFreq.length;
    if ( txCfgPtr.burstOpt.burstFreq.length != txCfgPtr.burstOpt.burstDur.length ) {
        bTotalModes=Math.min(txCfgPtr.burstOpt.burstFreq.length, txCfgPtr.burstOpt.burstDur.length);
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] burst freq (%d) and burst Dur (%d) have different number of modes. PTE will use %d modes',Nid, channelName, org, pid, txCfgPtr.burstOpt.burstFreq.length, txCfgPtr.burstOpt.burstDur.length, bTotalModes);
    }
    if ( bTotalModes == 0 ) {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] invalid burstFreq and/or burstDur',Nid, channelName, org, pid);
        process.exit();
    }
    for (i=0; i< bTotalModes; i++) {
        bFreq.push(parseInt(txCfgPtr.burstOpt.burstFreq[i]));
        bDur.push(parseInt(txCfgPtr.burstOpt.burstDur[i]));
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] Burst setting: total modes= %d, burstFreq= %j, burstDur= %j',Nid, channelName, org, pid, bTotalModes, bFreq, bDur);

    bCurrMode=0;
    bCurrFreq=bFreq[0];

    // get time
    tLocal = new Date().getTime();

    bNext = tLocal+bDur[0];
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] Burst init setting: bNext: %d, tLocal: %d ',Nid, channelName, org, pid, bNext, tLocal);

    // send proposal to endorser
    if ( transType == 'INVOKE' ) {
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            if (evtListener == 'BLOCK') {
                invoke_move_burst_evtBlock();
            } else {
                requestPusher(getMoveRequest, function() { return bCurrFreq; }, 10);
                invoke_move_burst();
            }
        } else if ( invokeType == 'QUERY' ) {
            invoke_query_burst();
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
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
        if ( IDone != 1 ) {
            invoke_discovery();
        } else {
            tCurr = new Date().getTime();
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_discovery] pte-exec:completed sent %d transactions (%s) in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, n_sd, transType, tCurr-tLocal, tLocal, tCurr,(n_sd/(tCurr-tLocal)*1000).toFixed(2));
            evtDisconnect();
        }
    },
    function(err) {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_discovery] Failed to send service discovery due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
        return;
    });

}
function execModeDiscovery() {

    // send discovery request
    tLocal = new Date().getTime();
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeDiscovery] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
    if ( runDur > 0 ) {
        tEnd = tLocal + runDur;
    }
    invoke_discovery();

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// disconnect event hubs
function evtDisconnect() {
    for ( i=0; i<eventHubs.length; i++) {
        if (eventHubs[i] && eventHubs[i].isconnected()) {
            logger.info('Disconnecting the event hub: %d', i);
            eventHubs[i].disconnect();
        }
    }
}

// connect to event hubs
function reConnectEventHub() {

    logger.info('connecting the event hub');
    for ( var i=0; i<eventHubs.length; i++) {
        if ( evtType == 'FILTEREDBLOCK' ) {
            eventHubs[i].connect();
        } else {
            eventHubs[i].connect(true);
        }
    }
    listenToEventHub();

    return;
}

function requestPusher(fn, delayCalculator, factor) {
    if ( (inv_m < nRequest) || (nRequest == 0) ) {
        if ( requestQueue.length < maxRequestQueueLength ) {
            var data = fn();
            requestQueue.unshift(data);
        } else {
            logger.debug("no data pushed");
        }
        var delay = delayCalculator() / factor;
        setTimeout(requestPusher, delay, fn, delayCalculator, factor)
    }
}
