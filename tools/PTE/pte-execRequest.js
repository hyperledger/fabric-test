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

var path = require('path');

var hfc = require('fabric-client');

var fs = require('fs');
var grpc = require('grpc');
var util = require('util');
var testUtil = require('./pte-util.js');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');
var EventHub = require('fabric-client/lib/EventHub.js');
var FabricCAServices = require('fabric-ca-client/lib/FabricCAClientImpl');
var FabricCAClient = FabricCAServices.FabricCAClient;
var User = require('fabric-client/lib/User.js');
var Client = require('fabric-client/lib/Client.js');
//var _commonProto = grpc.load(path.join(__dirname, 'node_modules/fabric-client/lib/protos/common/common.proto')).common;

var LinkedList = require('singly-linked-list');
var txidList = new LinkedList();

var PTEid=process.argv[7];
var loggerMsg='PTE '+PTEid+' exec';
var logger = utils.getLogger(loggerMsg);

const crypto = require('crypto');

utils.setConfigSetting('crypto-keysize', 256);


// local vars
var tmp;
var tCurr;
var tEnd=0;
var tLocal;
var i = 0;
var inv_m = 0;    // counter of invoke move
var inv_q = 0;    // counter of invoke query
var evtTimeoutCnt = 0;    // counter of event timeout
var evtTimeout = 0;    // event timeout
var evtListener = null;
var IDone=0;
var QDone=0;
var recHist;
var buff;
var ofile;
var invokeCheck;
var chaincode_id;
var chaincode_ver;
var tx_id = null;
var nonce = null;
var the_user = null;
var eventHubs=[];
var targets = [];
var eventPromises = [];

// need to override the default key size 384 to match the member service backend
// otherwise the client will not be able to decrypt the enrollment challenge
utils.setConfigSetting('crypto-keysize', 256);

// need to override the default hash algorithm (SHA3) to SHA2 (aka SHA256 when combined
// with the key size 256 above), in order to match what the peer and COP use
utils.setConfigSetting('crypto-hash-algo', 'SHA2');

//input args
var pid = parseInt(process.argv[2]);
var Nid = parseInt(process.argv[3]);
var uiFile = process.argv[4];
var tStart = parseInt(process.argv[5]);
var org=process.argv[6];
var uiContent = JSON.parse(fs.readFileSync(uiFile));
var TLS=uiContent.TLS;
var targetPeers=uiContent.targetPeers;
var channelOpt=uiContent.channelOpt;
var channelOrgName = [];
var channelName = channelOpt.name;
for (i=0; i<channelOpt.orgName.length; i++) {
    channelOrgName.push(channelOpt.orgName[i]);
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: uiFile=%s, tStart=%d', Nid, channelName, org, pid, uiFile, tStart);
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] TLS: %s', Nid, channelName, org, pid, TLS.toUpperCase());
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] targetPeers: %s', Nid, channelName, org, pid, targetPeers.toUpperCase());
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] channelOrgName.length: %d, channelOrgName: %s', Nid, channelName, org, pid, channelOrgName.length, channelOrgName);

var client = new hfc();
var channel = client.newChannel(channelName);

if ( (typeof( uiContent.eventOpt ) !== 'undefined') && (typeof( uiContent.eventOpt.listener ) !== 'undefined') ) {
    evtListener = uiContent.eventOpt.listener;
} else {
    evtListener = 'Transaction';
}
if ( (typeof( uiContent.eventOpt ) !== 'undefined') && (typeof( uiContent.eventOpt.timeout ) !== 'undefined') ) {
    evtTimeout = uiContent.eventOpt.timeout;
} else {
    evtTimeout = 120000;
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] eventhub registration: %s, timeout: %d', Nid, channel.getName(), org, pid, evtListener, evtTimeout);
invokeCheck = uiContent.invokeCheck;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invokeCheck: ', Nid, channel.getName(), org, pid, invokeCheck);

var channelID = uiContent.channelID;
chaincode_id = uiContent.chaincodeID+channelID;
chaincode_ver = uiContent.chaincodeVer;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] chaincode_id: %s', Nid, channel.getName(), org, pid, chaincode_id );

var svcFile = uiContent.SCFile[0].ServiceCredentials;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] svcFile: %s, org: %s', Nid, channel.getName(), org, pid, svcFile, org);
hfc.addConfigFile(path.join(__dirname, svcFile));
var ORGS = hfc.getConfigSetting('test-network');
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
var transMode = uiContent.transMode;
var transType = uiContent.transType;
var invokeType = uiContent.invokeType;
var nRequest = parseInt(uiContent.nRequest);

logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] transMode: %s, transType: %s, invokeType: %s, nRequest: %d', Nid, channel.getName(), org, pid,  transMode, transType, invokeType, nRequest);

//failover parameters
var peerList = [];
var currPeerId = 0;
var ordererList = [];
var currOrdererId = 0;
var peerFO = 'FALSE';
var ordererFO = 'FALSE';
var peerFOList = 'TARGETPEERS';
var peerFOMethod = 'ROUNDROBIN';
if (typeof( uiContent.peerFailover ) !== 'undefined') {
    peerFO = uiContent.peerFailover.toUpperCase();
}
if (typeof( uiContent.ordererFailover ) !== 'undefined') {
    ordererFO = uiContent.ordererFailover.toUpperCase();
}
if ( peerFO == 'TRUE' ) {
    if (typeof( uiContent.failoverOpt ) !== 'undefined') {
        if (typeof( uiContent.failoverOpt.list ) !== 'undefined') {
            peerFOList = uiContent.failoverOpt.list.toUpperCase();
        }
        if (typeof( uiContent.failoverOpt.method ) !== 'undefined') {
            peerFOMethod = uiContent.failoverOpt.method.toUpperCase();
        }
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] input parameters: peerFO=%s, ordererFO=%s, peerFOList=%s, peerFOMethod=%s', Nid, channelName, org, pid, peerFO, ordererFO, peerFOList, peerFOMethod);

var runDur=0;
if ( nRequest == 0 ) {
   runDur = parseInt(uiContent.runDur);
   logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] transMode: %s, transType: %s, invokeType: %s, runDur: %d', Nid, channel.getName(), org, pid, transMode, transType, invokeType, runDur);
   // convert runDur from second to ms
   runDur = 1000*runDur;
}

var runForever = 0;
if ( ( nRequest == 0 ) && ( runDur == 0 ) ) {
    runForever = 1;
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] runForever: %d', Nid, channel.getName(), org, pid,  runForever);

var ccType = uiContent.ccType;
var keyStart=0;
var payLoadMin=0;
var payLoadMax=0;
var arg0=0;
var keyIdx = [];
for (i=0; i<uiContent.ccOpt.keyIdx.length; i++) {
    keyIdx.push(uiContent.ccOpt.keyIdx[i]);
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] keyIdx: ', Nid, channel.getName(), org, pid, keyIdx);
var keyPayLoad = [];
for (i=0; i<uiContent.ccOpt.keyPayLoad.length; i++) {
    keyPayLoad.push(uiContent.ccOpt.keyPayLoad[i]);
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] keyPayLoad: ', Nid, channel.getName(), org, pid, keyPayLoad);

if ( ccType == 'ccchecker' ) {
    keyStart = parseInt(uiContent.ccOpt.keyStart);
    payLoadMin = parseInt(uiContent.ccOpt.payLoadMin)/2;
    payLoadMax = parseInt(uiContent.ccOpt.payLoadMax)/2;
    arg0 = parseInt(keyStart);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d payLoadMin=%d payLoadMax=%d',
                 Nid, channel.getName(), org, pid, ccType, keyStart, parseInt(uiContent.ccOpt.payLoadMin), parseInt(uiContent.ccOpt.payLoadMax));
} else if ( ccType == 'marblescc' ) {
    keyStart = parseInt(uiContent.ccOpt.keyStart);
    payLoadMin = parseInt(uiContent.ccOpt.payLoadMin);
    payLoadMax = parseInt(uiContent.ccOpt.payLoadMax);
    arg0 = parseInt(keyStart);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d payLoadMin=%d payLoadMax=%d',
                 Nid, channel.getName(), org, pid, ccType, keyStart, parseInt(uiContent.ccOpt.payLoadMin), parseInt(uiContent.ccOpt.payLoadMax));
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] ccType: %s, keyStart: %d', Nid, channel.getName(), org, pid, ccType, keyStart);
//construct invoke request
var testInvokeArgs = [];
for (i=0; i<uiContent.invoke.move.args.length; i++) {
    testInvokeArgs.push(uiContent.invoke.move.args[i]);
}

var request_invoke;
function getMoveRequest() {
    if ( ccType == 'ccchecker') {
        arg0 ++;
        for ( i=0; i<keyIdx.length; i++ ) {
            testInvokeArgs[keyIdx[i]] = 'key_'+channelName+'_'+org+'_'+Nid+'_'+pid+'_'+arg0;
        }
        // random payload
        var r = Math.floor(Math.random() * (payLoadMax - payLoadMin)) + payLoadMin;

        var buf = crypto.randomBytes(r);
        for ( i=0; i<keyPayLoad.length; i++ ) {
            testInvokeArgs[keyPayLoad[i]] = buf.toString('hex');
        }
    } else if ( ccType == 'marblescc' ) {
        arg0 ++;
        for ( i=0; i<keyIdx.length; i++ ) {
            testInvokeArgs[keyIdx[i]] = 'marble_'+channelName+'_'+org+'_'+Nid+'_'+pid+'_'+arg0;
        }
        // random marble size
        var r = Math.floor((Math.random() * (payLoadMax - payLoadMin)) + payLoadMin);
        for ( i=0; i<keyPayLoad.length; i++ ) {
            testInvokeArgs[keyPayLoad[i]] = String(r);
        }
    }

    tx_id = client.newTransactionID();
    txidList.insert(tx_id._transaction_id);
    utils.setConfigSetting('E2E_TX_ID', tx_id.getTransactionID());

    request_invoke = {
        chaincodeId : chaincode_id,
        fcn: uiContent.invoke.move.fcn,
        args: testInvokeArgs,
        txId: tx_id
    };

    if ( (transMode.toUpperCase() == 'MIX') && (mixQuery.toUpperCase() == 'TRUE') ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] request_invoke: ', Nid, channel.getName(), org, pid, request_invoke);
    } else if ( inv_m == nRequest ) {
        if (invokeCheck.toUpperCase() == 'TRUE') {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] request_invoke: ', Nid, channel.getName(), org, pid, request_invoke);
        }
    }

}

//construct query request
var testQueryArgs = [];
for (i=0; i<uiContent.invoke.query.args.length; i++) {
    testQueryArgs.push(uiContent.invoke.query.args[i]);
}

var request_query;
function getQueryRequest() {
    if ( ccType == 'ccchecker') {
        arg0 ++;
        for ( i=0; i<keyIdx.length; i++ ) {
            testQueryArgs[keyIdx[i]] = 'key_'+channelName+'_'+org+'_'+Nid+'_'+pid+'_'+arg0;
        }
    } else if ( ccType == 'marblescc' ) {
        arg0 ++;
        var keyA = keyStart;
        if ( arg0 - keyStart > 10 ) {
            keyA = arg0 - 10;
        }
        if ( uiContent.invoke.query.fcn == 'getMarblesByRange' ) {
            testQueryArgs[0] = 'marble_'+channelName+'_'+org+'_'+Nid+'_'+pid+'_'+keyA;
            testQueryArgs[1] = 'marble_'+channelName+'_'+org+'_'+Nid+'_'+pid+'_'+arg0;
        } else {
            for ( i=0; i<keyIdx.length; i++ ) {
                testQueryArgs[keyIdx[i]] = 'marble_'+channelName+'_'+org+'_'+Nid+'_'+pid+'_'+arg0;
            }
        }
    }

    tx_id = client.newTransactionID();
    request_query = {
        chaincodeId : chaincode_id,
        txId: tx_id,
        fcn: uiContent.invoke.query.fcn,
        args: testQueryArgs
    };

    //logger.info('request_query: ', request_query);
}

function peerFailover(channel, client) {
    var currId = currPeerId;
    channel.removePeer(peerList[currPeerId]);
    if ( peerFOMethod == 'RANDOM' ) {
        var r = Math.floor(Math.random() * (peerList.length - 1));
        if ( r >= currPeerId ) {
             currPeerId = r + 1;
        } else {
             currPeerId = r;
        }
    } else if ( method.toUpperCase == 'ROUNDROBIN' ) {
        currPeerId = currPeerId + 1;
    }
    currPeerId = currPeerId%peerList.length;
    channel.addPeer(peerList[currPeerId]);
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

// assign thread the peers from List
function assignPeerListFromList(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignPeerListFromList]', Nid, channel.getName(), org, pid);
    var peerTmp;
    var eh;
    var data;
    var listOpt=uiContent.listOpt;
    var peername;
    var event_connected = false;
    for(var key in listOpt) {
        for (i = 0; i < listOpt[key].length; i++) {
            if (ORGS[key].hasOwnProperty(listOpt[key][i])) {
                peername = listOpt[key][i];
                if (peername.indexOf('peer') === 0) {
                    if (TLS.toUpperCase() == 'ENABLED') {
                        data = fs.readFileSync(path.join(goPath, ORGS[key][peername]['tls_cacerts']));
                        peerTmp = client.newPeer(
                            ORGS[key][peername].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key][peername]['server-hostname']
                            }
                        );
                        peerList.push(peerTmp);
                    } else {
                        peerTmp = client.newPeer(ORGS[key][peername].requests);
                        peerList.push(peerTmp);
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignPeerListFromList] peerList: %j', Nid, channelName, org, pid, peerList);
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
                if (key.indexOf('peer') === 0) {
                    if (TLS.toUpperCase() == 'ENABLED') {

                        data = fs.readFileSync(path.join(goPath, ORGS[key1][key]['tls_cacerts']));
                        peerTmp = client.newPeer(
                            ORGS[key1][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key1][key]['server-hostname']
                            }
                        );
                        peerList.push(peerTmp);
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
            if (key.indexOf('peer') === 0) {
                if (TLS.toUpperCase() == 'ENABLED') {

                    data = fs.readFileSync(path.join(goPath, ORGS[key1][key]['tls_cacerts']));
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
                } else {
                    peerTmp = client.newPeer( ORGS[key1][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                }

                if ( (invokeType.toUpperCase() == 'MOVE') && ( key1 == org ) && !event_connected) {
                    eh = client.newEventHub();
                    if (TLS.toUpperCase() == 'ENABLED') {
                        eh.setPeerAddr(
                            ORGS[key1][key].events,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key1][key]['server-hostname']
                            }
                        );
                    } else {
                        eh.setPeerAddr(ORGS[key1][key].events);
                    }
                    eh.connect();
                    eventHubs.push(eh);
                    event_connected= true;
                }
                }
            }
        }
    }
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllPeers] peers', Nid, channel.getName(), pid, channel.getPeers());
}


// assign thread the anchor peer from all org
function assignThreadAllAnchorPeers(channel, client, org) {
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllAnchorPeers]', Nid, channel.getName(), pid);
    var peerTmp;
    var eh;
    var data;
    for (let key1 in ORGS) {
        if (ORGS.hasOwnProperty(key1)) {
            for (let key in ORGS[key1]) {
            if (key.indexOf('peer1') === 0) {
                if (TLS.toUpperCase() == 'ENABLED') {

                    data = fs.readFileSync(path.join(goPath, ORGS[key1][key]['tls_cacerts']));
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
                } else {
                    peerTmp = client.newPeer( ORGS[key1][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                }

                if ( (invokeType.toUpperCase() == 'MOVE') && ( key1 == org ) ) {
                    eh = client.newEventHub();
                    if (TLS.toUpperCase() == 'ENABLED') {
                        eh.setPeerAddr(
                            ORGS[key1][key].events,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key1][key]['server-hostname']
                            }
                        );
                    } else {
                        eh.setPeerAddr(ORGS[key1][key].events);
                    }
                    eh.connect();
                    eventHubs.push(eh);
                }
                }
            }
        }
    }
    logger.info('[Nid:chan:id=%d:%s:%d assignThreadAllAnchorPeers] peers', Nid, channel.getName(), pid, channel.getPeers());
}

// assign thread all peers from the org
function assignThreadOrgPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgPeer]', Nid, channel.getName(), org, pid);
    var peerTmp;
    var eh;
    var data;
    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (key.indexOf('peer') === 0) {
                if (TLS.toUpperCase() == 'ENABLED') {
                    data = fs.readFileSync(goPath, ORGS[org][key]['tls_cacerts']);
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
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                }

                eh=client.newEventHub();
                if (TLS.toUpperCase() == 'ENABLED') {
                    eh.setPeerAddr(
                        ORGS[org][key].events,
                        {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[org][key]['server-hostname']
                        }
                    );
                } else {
                    eh.setPeerAddr(ORGS[org][key].events);
                }
                eh.connect();
                eventHubs.push(eh);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgPeer] add peer: ', Nid, channelName, org, pid, channel.getPeers());
}


// assign thread the peers from List
function assignThreadPeerList(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerList]', Nid, channel.getName(), org, pid);
    var peerTmp;
    var eh;
    var data;
    var listOpt=uiContent.listOpt;
    var peername;
    var event_connected = false;
    for(var key in listOpt) {
        for (i = 0; i < listOpt[key].length; i++) {
            if (ORGS[key].hasOwnProperty(listOpt[key][i])) {
                peername = listOpt[key][i];
                if (peername.indexOf('peer') === 0) {
                    if (TLS.toUpperCase() == 'ENABLED') {
                        data = fs.readFileSync(path.join(goPath, ORGS[key][peername]['tls_cacerts']));
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
                    } else {
                        peerTmp = client.newPeer(ORGS[key][peername].requests);
                        //targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                        if ( peerFOList == 'TARGETPEERS' ) {
                            peerList.push(peerTmp);
                        }
                    }

                    if ( (invokeType.toUpperCase() == 'MOVE') && ( key == org ) && !event_connected ) {
                        eh = client.newEventHub();
                        if (TLS.toUpperCase() == 'ENABLED') {
                            eh.setPeerAddr(
                                ORGS[key][peername].events,
                                {
                                    pem: Buffer.from(data).toString(),
                                    'ssl-target-name-override': ORGS[key][peername]['server-hostname']
                                }
                            );
                        } else {
                            eh.setPeerAddr(ORGS[key][peername].events);
                        }
                        eh.connect();
                        eventHubs.push(eh);
                        event_connected = true;
                    }
                }
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerList] add peer: ', Nid, channelName, org, pid, channel.getPeers());
}

function channelAddPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeer]', Nid, channelName, org, pid);
    var peerTmp;
    var eh;
    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (key.indexOf('peer') === 0) {
                if (TLS.toUpperCase() == 'ENABLED') {
                    let data = fs.readFileSync(path.join(goPath, ORGS[org][key]['tls_cacerts']));
                    peerTmp = client.newPeer(
                        ORGS[org][key].requests,
                        {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[org][key]['server-hostname']
                        }
                    );
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                }
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeer] ', Nid, channelName, org, pid);
}


function channelAddPeerEvent(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent]', Nid, channelName, org, pid);
    var eh;
    var peerTmp;
    for (let key in ORGS[org]) {
        logger.info('key: ', key);
        if (ORGS[org].hasOwnProperty(key)) {
            if (key.indexOf('peer') === 0) {
                if (TLS.toUpperCase() == 'ENABLED') {
                    let data = fs.readFileSync(path.join(goPath, ORGS[org][key]['tls_cacerts']));
                    peerTmp = client.newPeer(
                        ORGS[org][key].requests,
                        {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[key]['server-hostname']
                        }
                    );
                } else {
                    peerTmp = client.newPeer( ORGS[org][key].requests);
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent] peer: ', Nid, channelName, org, pid, ORGS[org][key].requests);
                }
                targets.push(peerTmp);
                channel.addPeer(peerTmp);

                eh=client.newEventHub();
                if (TLS.toUpperCase() == 'ENABLED') {
                    eh.setPeerAddr(
                        ORGS[org][key].events,
                        {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[org][key]['server-hostname']
                        }
                    );
                } else {
                    eh.setPeerAddr(ORGS[org][key].events);
                }
                eh.connect();
                eventHubs.push(eh);
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent] requests: %s, events: %s ', Nid, channelName, org, pid, ORGS[org][key].requests, ORGS[org][key].events);
            }
        }
    }
}

// update orderer
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
    var ordererID = ORGS[org].ordererID;
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
    logger.info('[Nid:chan:org:id:ordererID=%d:%s:%s:%d:%s assignOrdererList] ', Nid, channelName, org, pid);
    var ordererTmp;
    for (let key in ORGS['orderer']) {
        if (key.indexOf('orderer') === 0) {
            if (TLS.toUpperCase() == 'ENABLED') {
                var caRootsPath = path.join(goPath, ORGS['orderer'][key].tls_cacerts);
                if (fs.existsSync(caRootsPath)) {
                    let data = fs.readFileSync(caRootsPath);
                    let caroots = Buffer.from(data).toString();

                    ordererTmp = client.newOrderer(
                        ORGS['orderer'][key].url,
                        {
                            'pem': caroots,
                            'ssl-target-name-override': ORGS['orderer'][key]['server-hostname']
                        }
                    )
                    ordererList.push(ordererTmp);
                } else {
                    logger.info('[Nid:chan:org:id:ordererID=%d:%s:%s:%d assignOrdererList] file does not exist: %s', Nid, channelName, org, pid, caRootsPath);
                }
            } else {
                ordererTmp = client.newOrderer(ORGS['orderer'][key].url);
                ordererList.push(ordererTmp);
            }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignOrdererList] orderer list: %j', Nid, channelName, org, pid, ordererList);
}

function channelAddOrderer(channel, client, org) {
    var ordererID = ORGS[org].ordererID;
    logger.info('[Nid:chan:org:id:ordererID=%d:%s:%s:%d:%s channelAddOrderer] ', Nid, channelName, org, pid, ordererID );
    if (TLS.toUpperCase() == 'ENABLED') {
        var caRootsPath = path.join(goPath, ORGS['orderer'][ordererID].tls_cacerts);
        let data = fs.readFileSync(caRootsPath);
        let caroots = Buffer.from(data).toString();

        channel.addOrderer(
            new Orderer(
                ORGS['orderer'][ordererID].url,
                {
                    'pem': caroots,
                    'ssl-target-name-override': ORGS['orderer'][ordererID]['server-hostname']
                }
            )
        );
    } else {
        channel.addOrderer(new Orderer(ORGS['orderer'][ordererID].url));
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddOrderer] orderer url: ', Nid, channelName, org, pid, ORGS['orderer'][ordererID].url);
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddOrderer] orderer: %j ', Nid, channelName, org, pid, channel.getOrderers());
}


// assign thread the anchor peer (peer1) from the org
function assignThreadOrgAnchorPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] ', Nid, channelName, org, pid );
    var peerTmp;
    var eh;
    var data;
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
                if ( key == org ) {
                if (TLS.toUpperCase() == 'ENABLED') {
                    data = fs.readFileSync(path.join(goPath, ORGS[key].peer1['tls_cacerts']));
                    peerTmp = client.newPeer(
                        ORGS[key].peer1.requests,
                        {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                        }
                    );
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                } else {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] key: %s, peer1: %s', Nid, channelName, org, pid, key, ORGS[org].peer1.requests);
                    peerTmp = client.newPeer( ORGS[key].peer1.requests);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                    if ( peerFOList == 'TARGETPEERS' ) {
                        peerList.push(peerTmp);
                    }
                }
                }

                if ( (invokeType.toUpperCase() == 'MOVE') && ( key == org ) ) {
                    eh=client.newEventHub();
                    if (TLS.toUpperCase() == 'ENABLED') {
                        eh.setPeerAddr(
                            ORGS[key].peer1.events,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                            }
                        );
                    } else {
                        eh.setPeerAddr(ORGS[key].peer1.events);
                    }
                    eh.connect();
                    eventHubs.push(eh);
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] requests: %s, events: %s', Nid, channelName, org, pid, ORGS[key].peer1.requests, ORGS[key].peer1.events);
                }
        }
    }
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] Peers:  ', Nid, channelName, org, pid, channel.getPeers());
}

/*
 *   transactions begin ....
 */
    execTransMode();

function execTransMode() {

    // init vars
    inv_m = 0;
    inv_q = 0;

    var username = ORGS[org].username;
    var secret = ORGS[org].secret;
    logger.debug('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] user= %s, secret=%s', Nid, channelName, org, pid, username, secret);


    var cryptoSuite = hfc.newCryptoSuite();
//    var useStore = false;
    var useStore = true;
    if (useStore) {
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(Nid,orgName)}));
        client.setCryptoSuite(cryptoSuite);
    }


    //enroll user
    var promise;
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
        return testUtil.getSubmitter(username, secret, client, true, Nid, org, svcFile);
    }).then(
                function(admin) {

                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] Successfully loaded user \'admin\'', Nid, channelName, org, pid);
                    the_user = admin;

                    assignOrdererList(channel, client);
                    channelAddOrderer(channel, client, org);
                    setCurrOrdererId(channel, client, org);

                    if ( peerFOList == 'ALL' ) {
                        assignPeerList(channel, client, org);
                    }
                    //assignPeerListFromList(channel, client, org);

                    if (targetPeers.toUpperCase() == 'ORGANCHOR') {
                        assignThreadOrgAnchorPeer(channel, client, org);
                    } else if (targetPeers.toUpperCase() == 'ALLANCHORS'){
                        assignThreadAllAnchorPeers(channel,client, org);
                    } else if (targetPeers.toUpperCase() == 'ORGPEERS'){
                        assignThreadOrgPeer(channel, client, org);
                    } else if (targetPeers.toUpperCase() == 'ALLPEERS'){
                        assignThreadAllPeers(channel,client, org);
                    } else if (targetPeers.toUpperCase() == 'LIST'){
                        assignThreadPeerList(channel,client,org);
                    } else {
	                logger.error('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] pte-exec:completed:error targetPeers= %s', Nid, channelName, org, pid, targetPeers.toUpperCase());
                        process.exit(1);
                    }

                    setCurrPeerId(channel, client, org);
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] peerList: ' , Nid, channelName, org, pid, peerList);

                    tCurr = new Date().getTime();
                    var tSynchUp=tStart-tCurr;
                    if ( tSynchUp < 10000 ) {
                        tSynchUp=10000;
                    }
	            logger.info('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] execTransMode: tCurr= %d, tStart= %d, time to wait=%d', Nid, channelName, org, pid, tCurr, tStart, tSynchUp);
                    // execute transactions
                    channel.initialize()
                    .then((success) => {
                    setTimeout(function() {
                        if (transMode.toUpperCase() == 'SIMPLE') {
                            execModeSimple();
                        } else if (transMode.toUpperCase() == 'CONSTANT') {
                            execModeConstant();
                        } else if (transMode.toUpperCase() == 'MIX') {
                            execModeMix();
                        } else if (transMode.toUpperCase() == 'BURST') {
                            execModeBurst();
                        } else if (transMode.toUpperCase() == 'LATENCY') {
                            execModeLatency();
                        } else if (transMode.toUpperCase() == 'PROPOSAL') {
                            execModeProposal();
                        } else {
                            // invalid transaction request
                            logger.error(util.format("[Nid:chan:org:id=%d:%s:%s:%d execTransMode] pte-exec:completed:error Transaction %j and/or mode %s invalid", Nid, channelName, org, pid, transType, transMode));
                            process.exit(1);
                        }
                    }, tSynchUp);
                },
                function(err) {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] Failed to wait due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    return;
                }
            );
        });
}

function isExecDone(trType){
    tCurr = new Date().getTime();
    if ( trType.toUpperCase() == 'MOVE' ) {
        if ( nRequest > 0 ) {
           if ( (inv_m % (nRequest/10)) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, evtTimeoutCnt=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_m, evtTimeoutCnt, tCurr-tLocal));
           }

           if ( inv_m >= nRequest ) {
                IDone = 1;
           }
        } else {
           if ( (inv_m % 1000) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, evtTimeoutCnt=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_m, evtTimeoutCnt, tCurr-tLocal));
           }

           if ( runForever == 0 ) {
               if ( tCurr > tEnd ) {
                    IDone = 1;
               }
           }
        }
    } else if ( trType.toUpperCase() == 'QUERY' ) {
        if ( nRequest > 0 ) {
           if ( (inv_q % (nRequest/10)) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_q, tCurr-tLocal));
           }

           if ( inv_q >= nRequest ) {
                QDone = 1;
           }
        } else {
           if ( (inv_q % 1000) == 0 ) {
              logger.info(util.format("[Nid:chan:org:id=%d:%s:%s:%d isExecDone] invokes(%s) sent: number=%d, elapsed time= %d",
                                         Nid, channelName, org, pid, trType, inv_q, tCurr-tLocal));
           }

           if ( runForever == 0 ) {
               if ( tCurr > tEnd ) {
                    QDone = 1;
               }
           }
        }
    }


}


var txRequest;
function getTxRequest(results) {
    txRequest = {
        proposalResponses: results[0],
        proposal: results[1],
        header: results[2]
    };
}

var evtRcvB=0;

function eventRegisterBlock() {

    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            //let handle = setTimeout(reject, evtTimeout);

            eh.registerBlockEvent((block) => {
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] inv_m:evtRcvB=%d:%d block: %j ', Nid, channelName, org, pid, inv_m, evtRcvB, block);
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] inv_m:evtRcvB=%d:%d block length: %d ', Nid, channelName, org, pid, inv_m, evtRcvB, block.data.data.length);
                //clearTimeout(handle);
                for (i=0; i<block.data.data.length; i++) {
                    if ( txidList.find(block.data.data[i].payload.header.channel_header.tx_id) != -1 ) {
                        evtRcvB = evtRcvB + 1;
                        //txidList.printList();
                        //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] evtRcvB:inv_m = %d:%d, found tx_id: %s ', Nid, channelName, org, pid, evtRcvB, inv_m, block.data.data[i].payload.header.channel_header.tx_id);
                        txidList.removeNode(block.data.data[i].payload.header.channel_header.tx_id);
                       // logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] txidList size: %d ', Nid, channelName, org, pid, txidList.getSize());
                    }
                }
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] inv_m:evtRcvB=%d:%d ', Nid, channelName, org, pid, inv_m, evtRcvB);

                if ( inv_m == evtRcvB  ) {
                    if ( IDone == 1 ) {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, txid size: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcvB, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, txidList.getSize(),(evtRcvB/(tCurr-tLocal)*1000).toFixed(2));
                        if (invokeCheck.toUpperCase() == 'TRUE') {
                            arg0 = keyStart + inv_m - 1;
                            inv_q = inv_m - 1;
                            invoke_query_simple(0);
                        }
                        if ( txidList.getSize() > 0 ) {
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, txidList.getSize());
                            txidList.printList();
                        }

                        evtDisconnect();
                    }
                }
                    resolve();
            },
            (err) => {
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] inv_m:evtRcvB=%d:%d err: %j', Nid, channelName, org, pid, inv_m, eBvtRcv, err);
            });
        }).catch((err) => {
            //evtTimeoutCnt++;
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, evtTimeoutCnt, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
        });

    });

}

var evtRcv=0;
var evtCount=0;

function eventRegister(tx, cb) {

    var deployId = tx.getTransactionID();
    var eventPromises = [];
    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(function(){eh.unregisterTxEvent(deployId);
            evtTimeoutCnt++;
            evtCount = evtRcv + evtTimeoutCnt;
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] The invoke transaction (%s) timeout (%d).', Nid, channelName, org, pid, deployId.toString(), evtTimeoutCnt);
            if ( ( IDone == 1 ) && ( inv_m == evtCount )  ) {
                tCurr = new Date().getTime();
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d TIMEOUT eventRegister] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, txid size: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcv, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, txidList.getSize(),(evtRcv/(tCurr-tLocal)*1000).toFixed(2));
                if ( txidList.getSize() > 0 ) {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, txidList.getSize());
                    txidList.printList();
                }

            }
            evtDisconnect();resolve()}, evtTimeout);

            eh.registerTxEvent(deployId.toString(), (tx, code) => {
                clearTimeout(handle);
                eh.unregisterTxEvent(deployId);
                txidList.removeNode(deployId.toString());
                evtRcv++;

                if (code !== 'VALID') {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] The invoke transaction (%s) was invalid, code = ', Nid, channelName, org, pid, deployId.toString(), code);
                    reject();
                } else {
                    if ( ( IDone == 1 ) && ( inv_m == evtRcv ) ) {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, txid size: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcv, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, txidList.getSize(),(evtRcv/(tCurr-tLocal)*1000).toFixed(2));
                        if (invokeCheck.toUpperCase() == 'TRUE') {
                            arg0 = keyStart + inv_m - 1;
                            inv_q = inv_m - 1;
                            invoke_query_simple(0);
                        }
                        if ( txidList.getSize() > 0 ) {
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, txidList.getSize());
                            txidList.printList()
                        }

                        evtDisconnect();
                        resolve();
                    }
                }
            });
        }).catch((err) => {
            //evtTimeoutCnt++;
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, evtTimeoutCnt, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
        });

        eventPromises.push(txPromise);
    });

    cb(eventPromises);
}

function eventRegister_latency(tx, cb) {

    var deployId = tx.getTransactionID();
    var eventPromises = [];
    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(reject, 600000);

            eh.registerTxEvent(deployId.toString(), (tx, code) => {
                clearTimeout(handle);
                eh.unregisterTxEvent(deployId);
                evtRcv++;

                if (code !== 'VALID') {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister_latency] The invoke transaction was invalid, code = ', Nid, channelName, org, pid, code);
                    reject();
                } else {
                    if ( ( IDone == 1 ) && ( inv_m == evtRcv ) ) {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister_latency] completed %d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                        if (invokeCheck.toUpperCase() == 'TRUE') {
                            arg0 = keyStart + inv_m - 1;
                            inv_q = inv_m - 1;
                            invoke_query_simple(0);
                        }
                        evtDisconnect();
                        resolve();
                    } else if ( IDone != 1 ) {
                        invoke_move_latency();
                    }
                }
            });
        }).catch((err) => {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister_latency] eventHub error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
        });

        eventPromises.push(txPromise);
    });

    cb(eventPromises);

}


// invoke_move_latency
function invoke_move_latency() {
    if ( IDone == 1 ) {
       return;
    }

    inv_m++;

    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then(
        function(results) {
            var proposalResponses = results[0];

            getTxRequest(results);
            eventRegister_latency(tx_id, function(sendPromise) {

                var sendPromise = channel.sendTransaction(txRequest);
                return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    isExecDone('Move');
                    return results[0];

                }).catch((err) => {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    evtDisconnect();
                    return;
                })
            },
            function(err) {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                evtDisconnect();
            })

        });

}


function execModeLatency() {

    // send proposal to endorser
    if ( transType.toUpperCase() == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeLatency] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType.toUpperCase() == 'MOVE' ) {
            var freq = 20000;
            if ( ccType == 'ccchecker' ) {
                freq = 0;
            }
            invoke_move_latency();
        } else if ( invokeType.toUpperCase() == 'QUERY' ) {
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
            eventRegister(request_invoke.txId, function(sendPromise) {

                var sendPromise = channel.sendTransaction(txRequest);
                return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    isExecDone('Move');
                    if ( IDone != 1 ) {
                        setTimeout(function(){
                            invoke_move_simple(freq);
                        },freq);
                    } else {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_simple] completed %d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                    }
                    return results[0];

                }).catch((err) => {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_simple] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    evtDisconnect();
                    return;
                })
            },
            function(err) {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_simple] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                evtDisconnect();
            })

        });
}




// invoke_query_simple
function invoke_query_simple(freq) {
    inv_q++;

    getQueryRequest();
    channel.queryByChaincode(request_query)
    .then(
        function(response_payloads) {
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

    // send proposal to endorser
    if ( transType.toUpperCase() == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeSimple] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType.toUpperCase() == 'MOVE' ) {
            var freq = 20000;
            if ( ccType == 'ccchecker' ) {
                freq = 0;
            }
            invoke_move_simple(freq);
        } else if ( invokeType.toUpperCase() == 'QUERY' ) {
            invoke_query_simple(0);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeSimple] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

var devFreq;
function getRandomNum(min0, max0) {
        return Math.floor(Math.random() * (max0-min0)) + min0;
}

function invoke_move_const_go_evtBlock(t1, freq) {

    var freq_n=freq;
    if ( devFreq > 0 ) {
        freq_n=getRandomNum(freq-devFreq, freq+devFreq);
    }
    tCurr = new Date().getTime();
    t1 = tCurr - t1;
    if ( t1 < freq_n ) {
       freq_n = freq_n - t1;
    } else {
       freq_n = 0;
    }
    setTimeout(function(){
        invoke_move_const_evtBlock(freq);
    },freq_n);

}

// invoke_move_const_evtBlock
function invoke_move_const_evtBlock(freq) {
    inv_m++;

    var t1 = new Date().getTime();
    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var proposalResponses = results[0];
            if ( results[0][0].response && results[0][0].response.status != 200 ) {
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] failed to sendTransactionProposal status: %d', Nid, channelName, org, pid, results[0][0].response.status);
                if (peerFO == 'TRUE') {
                    peerFailover(channel, client);
                }
                invoke_move_const_go(t1, freq);
                return;
            }

            getTxRequest(results);

                return channel.sendTransaction(txRequest)
                .then((results) => {

                    if ( results.status != 'SUCCESS' ) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] failed to sendTransaction status: %j ', Nid, channelName, org, pid, results);
                        if (ordererFO == 'TRUE') {
                            ordererFailover(channel, client);
                        }
                        invoke_move_const_go(t1, freq);
                        return;
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

                    isExecDone('Move');
                    if ( IDone != 1 ) {
                        invoke_move_const_go_evtBlock(t1, freq);
                    } else {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] completed %d, evtTimoutCnt %d, %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, evtTimeoutCnt, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                        if ( txidList.getSize() > 0 ) {
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, txidList.getSize());
                            txidList.printList();
                        }
                        return;
                    }
                    //return results[0];

                }).catch((err) => {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    if (ordererFO == 'TRUE') {
                        ordererFailover(channel, client);
                    }
                    invoke_move_const_go_evtBlock(t1, freq);
                    //evtDisconnect();
                    //return;
                })
        }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                if (peerFO == 'TRUE') {
                    peerFailover(channel, client);
                }
                invoke_move_const_go_evtBlock(t1, freq);
        });
}

function invoke_move_const_go(t1, freq) {

    var freq_n=freq;
    if ( devFreq > 0 ) {
        freq_n=getRandomNum(freq-devFreq, freq+devFreq);
    }
    tCurr = new Date().getTime();
    t1 = tCurr - t1;
    if ( t1 < freq_n ) {
       freq_n = freq_n - t1;
    } else {
       freq_n = 0;
    }
    setTimeout(function(){
        invoke_move_const(freq);
    },freq_n);

}
// invoke_move_const
function invoke_move_const(freq) {
    inv_m++;

    var t1 = new Date().getTime();
    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var proposalResponses = results[0];
            if ( results[0][0].response && results[0][0].response.status != 200 ) {
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] failed to sendTransactionProposal status: %d', Nid, channelName, org, pid, results[0][0].response.status);
                if (peerFO == 'TRUE') {
                    peerFailover(channel, client);
                }
                invoke_move_const_go(t1, freq);
                return;
            }

            getTxRequest(results);
            eventRegister(tx_id, function(sendPromise) {

                var sendPromise = channel.sendTransaction(txRequest);
                return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    if ( results[0].status != 'SUCCESS' ) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] failed to sendTransaction status: %j ', Nid, channelName, org, pid, results[0]);
                        if (ordererFO == 'TRUE') {
                            ordererFailover(channel, client);
                        }
                        invoke_move_const_go(t1, freq);
                        return;
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

                    isExecDone('Move');
                    if ( IDone != 1 ) {
                        invoke_move_const_go(t1, freq);
                    } else {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] completed %d, evtTimoutCnt %d, %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, evtTimeoutCnt, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                        if ( txidList.getSize() > 0 ) {
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, txidList.getSize());
                            txidList.printList();
                        }
                        return;
                    }
                    //return results[0];

                }).catch((err) => {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    if (ordererFO == 'TRUE') {
                        ordererFailover(channel, client);
                    }
                    invoke_move_const_go(t1, freq);
                    //evtDisconnect();
                    //return;
                })
            },
            function(err) {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] Failed to send event register due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                invoke_move_const_go(t1, freq);
                //evtDisconnect();
            })

        }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                if (peerFO == 'TRUE') {
                    peerFailover(channel, client);
                }
                invoke_move_const_go(t1, freq);
        });
}


// invoke_query_const
function invoke_query_const(freq) {
    inv_q++;

    getQueryRequest();
    channel.queryByChaincode(request_query)
    .then(
        function(response_payloads) {
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
                var freq_n=getRandomNum(freq-devFreq, freq+devFreq);
                setTimeout(function(){
                    invoke_query_const(freq);
                },freq_n);
            } else {
                tCurr = new Date().getTime();
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_const] query result response_payloads length:', Nid, channelName, org, pid, response_payloads.length);
                for(let j = 0; j < response_payloads.length; j++) {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_const] query result:', Nid, channelName, org, pid, response_payloads[j].toString('utf8'));
                }
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_const] pte-exec:completed %d transaction %s(%s) in %d ms, timestamp: start %d end %d,Throughput=%d TPS', Nid, channelName, org, pid, inv_q, transType, invokeType, tCurr-tLocal, tLocal, tCurr,(inv_q/(tCurr-tLocal)*1000).toFixed(2));
                process.exit();
            }
        },
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_const] pte-exec:completed:error Failed to send query due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            process.exit();
        })
    .catch(
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_const] pte-exec:completed:error %s failed: ', Nid, channelName, org, pid, transType,  err.stack ? err.stack : err);
            process.exit();
        }
    );

}
function execModeConstant() {

    // send proposal to endorser
    if ( transType.toUpperCase() == 'INVOKE' ) {
        if (uiContent.constantOpt.recHist) {
            recHist = uiContent.constantOpt.recHist.toUpperCase();
        }
        logger.info('recHist: ', recHist);

        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        var freq = parseInt(uiContent.constantOpt.constFreq);
        ofile = 'ConstantResults'+PTEid+'.txt';

        if (typeof( uiContent.constantOpt.devFreq ) == 'undefined') {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] devFreq undefined, set to 0', Nid, channelName, org, pid);
            devFreq=0;
        } else {
            devFreq = parseInt(uiContent.constantOpt.devFreq);
        }

        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] Constant Freq: %d ms, variance Freq: %d ms', Nid, channelName, org, pid, freq, devFreq);

        if ( invokeType.toUpperCase() == 'MOVE' ) {
            if ( ccType == 'general' ) {
                if ( freq < 20000 ) {
                    freq = 20000;
                }
            }
            if (evtListener.toUpperCase() == 'BLOCK') {
                eventRegisterBlock();
                invoke_move_const_evtBlock(freq);
            } else if (evtListener.toUpperCase() == 'NONE') {
                evtDisconnect();
                invoke_move_const_evtBlock(freq);
            } else {
                invoke_move_const(freq);
            }
        } else if ( invokeType.toUpperCase() == 'QUERY' ) {
            invoke_query_const(freq);
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] pte-exec:completed:error invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

// mix mode
function invoke_move_mix_go(freq) {
    setTimeout(function(){
        arg0--;
        invoke_query_mix(freq);
    },freq);
}

function invoke_move_mix(freq) {
    inv_m++;

    var t1 = new Date().getTime();
    getMoveRequest();

    if (mixQuery.toUpperCase() == 'TRUE') {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] invoke request:', Nid, channelName, org, pid, request_invoke);
    }

    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var proposalResponses = results[0];
            if ( results[0][0].response && results[0][0].response.status != 200 ) {
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] sendTransactionProposal status: %d', Nid, channelName, org, pid, results[0][0].response.status);
                invoke_move_mix_go(freq);
                return;
            }

            getTxRequest(results);
            eventRegister(request_invoke.txId, function(sendPromise) {

                var sendPromise = channel.sendTransaction(txRequest);
                return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    if ( results[0].status != 'SUCCESS' ) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] sendTransaction status: %d', Nid, channelName, org, pid, results[0]);
                        invoke_move_mix_go(freq);
                        return;
                    }

                    if ( IDone != 1 ) {
                        invoke_move_mix_go(freq);
                    } else {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] completed %d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                    //    return;
                    }
                    return results[0];

                }).catch((err) => {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    invoke_move_mix_go(freq);
                    //evtDisconnect();
                    //return;
                })
            },
            function(err) {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send event register due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                invoke_move_mix_go(freq);
                //evtDisconnect();
            })

        }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                invoke_move_mix_go(freq);
        });
}

// invoke_query_mix
function invoke_query_mix(freq) {
    inv_q++;

    getQueryRequest();
    channel.queryByChaincode(request_query)
    .then(
        function(response_payloads) {
                if (mixQuery.toUpperCase() == 'TRUE') {
                    for(let j = 0; j < response_payloads.length; j++) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_query_mix] query result:', Nid, channelName, org, pid, response_payloads[j].toString('utf8'));
                    }
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

var mixQuery;
function execModeMix() {

    // send proposal to endorser
    mixQuery = uiContent.mixOpt.mixQuery;
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeMix] mixQuery: %s', Nid, channelName, org, pid, mixQuery);
    if ( transType.toUpperCase() == 'INVOKE' ) {
        // no need to check since a query is issued after every invoke
        invokeCheck = 'FALSE';
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeMix] tStart %d, tEnd %d, tLocal %d', Nid, channelName, org, pid, tStart, tEnd, tLocal);
        var freq = parseInt(uiContent.mixOpt.mixFreq);
        if ( ccType == 'general' ) {
            if ( freq < 20000 ) {
                freq = 20000;
            }
        }
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
    if ( transType.toUpperCase() == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType.toUpperCase() == 'MOVE' ) {
            var freq = 20000;
            if ( ccType == 'ccchecker' ) {
                freq = 0;
            }
            invoke_move_latency();
            invoke_move_proposal();
        } else if ( invokeType.toUpperCase() == 'QUERY' ) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] invalid invokeType= %s', Nid, channelName, org, pid, invokeType);
            evtDisconnect();
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

// Burst mode vars
var burstFreq0;
var burstDur0;
var burstFreq1;
var burstDur1;
var tDur=[];
var tFreq=[];
var tUpd0;
var tUpd1;
var bFreq;

function getBurstFreq() {

    tCurr = new Date().getTime();

    // set up burst traffic duration and frequency
    if ( tCurr < tUpd0 ) {
        bFreq = tFreq[0];
    } else if ( tCurr < tUpd1 ) {
        bFreq = tFreq[1];
    } else {
        tUpd0 = tCurr + tDur[0];
        tUpd1 = tUpd0 + tDur[1];
        bFreq = tFreq[0];
    }

}

// invoke_move_burst

function invoke_move_burst_go(){
    setTimeout(function(){
        invoke_move_burst();
    },bFreq);
}

function invoke_move_burst() {
    inv_m++;
    // set up burst traffic duration and frequency
    getBurstFreq();

    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var proposalResponses = results[0];
            if ( results[0][0].response && results[0][0].response.status != 200 ) {
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] sendTransactionProposal status: %d', Nid, channelName, org, pid, results[0][0].response.status);
                invoke_move_burst_go();
                return;
            }

            getTxRequest(results);
            eventRegister(request_invoke.txId, function(sendPromise) {

                var sendPromise = channel.sendTransaction(txRequest);
                return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    if ( results[0].status != 'SUCCESS' ) {
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] sendTransactionProposal status: %d', Nid, channelName, org, pid, results[0]);
                        invoke_move_burst_go();
                        return;
                    }

                    isExecDone('Move');
                    if ( IDone != 1 ) {
                        invoke_move_burst_go();
                    } else {
                        tCurr = new Date().getTime();
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] completed %d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                        return;
                    }
                    //return results[0];

                }).catch((err) => {
                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    invoke_move_burst_go();
                    //evtDisconnect();
                    return;
                })
            },
            function(err) {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send eventRegister due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                invoke_move_burst_go();
                //evtDisconnect();
            })

        }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                invoke_move_burst_go();
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
            isExecDone('Query');
            if ( QDone != 1 ) {
                setTimeout(function(){
                    invoke_query_burst();
                },bFreq);
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

    // init TcertBatchSize
    burstFreq0 = parseInt(uiContent.burstOpt.burstFreq0);
    burstDur0 = parseInt(uiContent.burstOpt.burstDur0);
    burstFreq1 = parseInt(uiContent.burstOpt.burstFreq1);
    burstDur1 = parseInt(uiContent.burstOpt.burstDur1);
    tFreq = [burstFreq0, burstFreq1];
    tDur  = [burstDur0, burstDur1];

    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] Burst setting: tDur =',Nid, channelName, org, pid, tDur);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] Burst setting: tFreq=',Nid, channelName, org, pid, tFreq);

    // get time
    tLocal = new Date().getTime();

    tUpd0 = tLocal+tDur[0];
    tUpd1 = tLocal+tDur[1];
    bFreq = tFreq[0];

    // send proposal to endorser
    if ( transType.toUpperCase() == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType.toUpperCase() == 'MOVE' ) {
            invoke_move_burst();
        } else if ( invokeType.toUpperCase() == 'QUERY' ) {
            invoke_query_burst();
        }
    } else {
        logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] invalid transType= %s', Nid, channelName, org, pid, transType);
        evtDisconnect();
    }
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function evtDisconnect() {
    for ( i=0; i<eventHubs.length; i++) {
        if (eventHubs[i] && eventHubs[i].isconnected()) {
            logger.info('Disconnecting the event hub: %d', i);
            eventHubs[i].disconnect();
        }
    }
}

