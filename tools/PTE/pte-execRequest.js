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

const crypto = require('crypto');

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
var evtTimeoutCnt = 0;                // counter of event timeout
var evtType = 'FILTEREDBLOCK';        // event type: FILTEREDBLOCK|CHANNEL, default: FILTEREDBLOCK
var evtTimeout = 120000;              // event timeout, default: 120000 ms
var evtListener = 'BLOCK';            // event listener: BLOCK|TRANSACTION, default: BLOCK
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
var txidList = [];

var requestQueue = [];
var maxRequestQueueLength = 100;

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
var uiContent = JSON.parse(fs.readFileSync(uiFile));
var channelOpt=uiContent.channelOpt;
var channelOrgName = [];
var channelName = channelOpt.name;
for (i=0; i<channelOpt.orgName.length; i++) {
    channelOrgName.push(channelOpt.orgName[i]);
}

var txCfgPtr;
if ( typeof(uiContent.txCfgPtr) === 'undefined' ) {
    txCfgPtr=uiContent;
} else {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] txCfgPtr: %s', Nid, channelName, org, pid, uiContent.txCfgPtr);
    txCfgPtr = JSON.parse(fs.readFileSync(uiContent.txCfgPtr));
}

var ccDfnPtr;
if ( typeof(uiContent.ccDfnPtr) === 'undefined' ) {
    ccDfnPtr=uiContent;
} else {
    ccDfnPtr = JSON.parse(fs.readFileSync(uiContent.ccDfnPtr));
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] ccDfnPtr: %s', Nid, channelName, org, pid, uiContent.ccDfnPtr);
}

var TLS=txCfgPtr.TLS.toUpperCase();
var targetPeers=txCfgPtr.targetPeers.toUpperCase();
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
invokeCheck = txCfgPtr.invokeCheck.toUpperCase();
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] invokeCheck: ', Nid, channel.getName(), org, pid, invokeCheck);

var channelID = uiContent.channelID;
chaincode_id = uiContent.chaincodeID+channelID;
chaincode_ver = uiContent.chaincodeVer;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] chaincode_id: %s', Nid, channel.getName(), org, pid, chaincode_id );

var svcFile = uiContent.SCFile[0].ServiceCredentials;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] svcFile: %s, org: %s', Nid, channel.getName(), org, pid, svcFile, org);
hfc.addConfigFile(path.resolve(__dirname, svcFile));
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
var transMode = txCfgPtr.transMode.toUpperCase();
var transType = txCfgPtr.transType.toUpperCase();
var invokeType = txCfgPtr.invokeType.toUpperCase();
var nRequest = parseInt(txCfgPtr.nRequest);

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
if (typeof( txCfgPtr.peerFailover ) !== 'undefined') {
    peerFO = txCfgPtr.peerFailover.toUpperCase();
}
if (typeof( txCfgPtr.ordererFailover ) !== 'undefined') {
    ordererFO = txCfgPtr.ordererFailover.toUpperCase();
}
if ( peerFO == 'TRUE' ) {
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
var reqTimeout=45000; // default 45 sec
if ((typeof( txCfgPtr.timeoutOpt ) !== 'undefined')) {
    timeoutOpt = parseInt(txCfgPtr.timeoutOpt);
    logger.info('main - timeoutOpt: %j', timeoutOpt);
    if ((typeof( timeoutOpt.request ) !== 'undefined')) {
        reqTimeout = parseInt(timeoutOpt.request);
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] reqTimeout: ', Nid, channel.getName(), org, pid, reqTimeout);

// init latencies matrix: tx num/avg/min/max
var latency_peer = [0, 0, 99999999, 0];
var latency_orderer = [0, 0, 99999999, 0];
var latency_event = [0, 0, 99999999, 0];

var keyStart=0;
var payLoadMin=0;
var payLoadMax=0;
var payLoadType='RANDOM'
var arg0=0;
var keyIdx = [];
if (typeof( ccDfnPtr.ccOpt.keyIdx ) !== 'undefined') {
    for (i=0; i<ccDfnPtr.ccOpt.keyIdx.length; i++) {
        keyIdx.push(ccDfnPtr.ccOpt.keyIdx[i]);
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] keyIdx: ', Nid, channel.getName(), org, pid, keyIdx);
var keyPayLoad = [];
if (typeof( ccDfnPtr.ccOpt.keyPayLoad ) !== 'undefined') {
    for (i=0; i<ccDfnPtr.ccOpt.keyPayLoad.length; i++) {
        keyPayLoad.push(ccDfnPtr.ccOpt.keyPayLoad[i]);
    }
}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] keyPayLoad: ', Nid, channel.getName(), org, pid, keyPayLoad);

var moveMarbleOwner='tom';
var moveMarbleName='marble';
var queryMarbleOwner='tom';
var queryMarbleName='marble';
var nOwner=100;
var queryMarbleDocType='marble';
//set transaction ID: channelName+'_'+org+'_'+Nid+'_'+pid
var txIDVar=channelName+'_'+org+'_'+Nid+'_'+pid;
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] tx IDVar: ', Nid, channel.getName(), org, pid, txIDVar);


var ccType = ccDfnPtr.ccType;
if ( ccType == 'ccchecker' ) {
    keyStart = parseInt(ccDfnPtr.ccOpt.keyStart);
    payLoadMin = parseInt(ccDfnPtr.ccOpt.payLoadMin)/2;
    payLoadMax = parseInt(ccDfnPtr.ccOpt.payLoadMax)/2;
    if ( ccDfnPtr.ccOpt.payLoadType )
        payLoadType = ccDfnPtr.ccOpt.payLoadType.toUpperCase();
    arg0 = parseInt(keyStart);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d payLoadMin=%d payLoadMax=%d',
                 Nid, channel.getName(), org, pid, ccType, keyStart, parseInt(ccDfnPtr.ccOpt.payLoadMin), parseInt(ccDfnPtr.ccOpt.payLoadMax));
} else if ( ccType == 'marblescc' ) {
    keyStart = parseInt(ccDfnPtr.ccOpt.keyStart);
    payLoadMin = parseInt(ccDfnPtr.ccOpt.payLoadMin);
    payLoadMax = parseInt(ccDfnPtr.ccOpt.payLoadMax);
    arg0 = parseInt(keyStart);
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d payLoadMin=%d payLoadMax=%d',
                 Nid, channel.getName(), org, pid, ccType, keyStart, parseInt(ccDfnPtr.ccOpt.payLoadMin), parseInt(ccDfnPtr.ccOpt.payLoadMax));

    // get number of owners
    if ( typeof( ccDfnPtr.invoke.nOwner ) !== 'undefined'  ) {
        nOwner=parseInt(ccDfnPtr.invoke.nOwner);
    }

    // get prefix owner name
    // moveMarbleOwner
    // "args": ["marble", "blue","35","tom"]
    if ( ccDfnPtr.invoke.move.fcn == 'initMarble' ) {
        moveMarbleOwner = ccDfnPtr.invoke.move.args[3];
    }
    moveMarbleName=ccDfnPtr.invoke.move.args[0];

    // queryMarbleByOwner
    // "args": ["tom"]
    //
    // queryMarble
    // "args": {
    //     "selector": {
    //         "owner":"tom",
    //         "docType":"marble",
    //         "color":"blue",
    //         "size":"35",
    //     }
    // }
    if ( ccDfnPtr.invoke.query.fcn == 'queryMarblesByOwner' ) {
        queryMarbleOwner=ccDfnPtr.invoke.query.args[0];
    } else if ( ccDfnPtr.invoke.query.fcn == 'queryMarbles' ) {
        if ( typeof( ccDfnPtr.invoke.query.args.selector.owner ) !== 'undefined' ) {
            queryMarbleOwner=ccDfnPtr.invoke.query.args.selector.owner;
        }
        if ( typeof( ccDfnPtr.invoke.query.args.selector.docType ) !== 'undefined' ) {
            queryMarbleDocType=ccDfnPtr.invoke.query.args.selector.docType;
        }
    }
    queryMarbleName=ccDfnPtr.invoke.query.args[0];

}
logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] ccType: %s, keyStart: %d', Nid, channel.getName(), org, pid, ccType, keyStart);
//construct invoke request
var testInvokeArgs = [];
for (i=0; i<ccDfnPtr.invoke.move.args.length; i++) {
    testInvokeArgs.push(ccDfnPtr.invoke.move.args[i]);
}

var request_invoke;
function getMoveRequest() {
    if ( ccType == 'ccchecker') {
        arg0 ++;
        for ( i=0; i<keyIdx.length; i++ ) {
            testInvokeArgs[keyIdx[i]] = 'key_'+txIDVar+'_'+arg0;
        }

        // randomise length of payload
        var rlen = Math.floor(Math.random() * (payLoadMax - payLoadMin)) + payLoadMin;

        if ( payLoadType == 'RANDOM' ) {
            var buf = crypto.randomBytes(rlen);
            for ( i = 0; i < keyPayLoad.length; i++ ) {
                testInvokeArgs[keyPayLoad[i]] = buf.toString('hex');
            }
        }
    } else if ( ccType == 'marblescc' ) {
        arg0 ++;
        for ( i=0; i<keyIdx.length; i++ ) {
            testInvokeArgs[keyIdx[i]] = moveMarbleName+'_'+txIDVar+'_'+arg0;
        }
        var index=arg0%nOwner;
        if ( ccDfnPtr.invoke.move.fcn == 'initMarble' ) {
            testInvokeArgs[3]=moveMarbleOwner+'_'+txIDVar+'_'+index;
        }
        // marble size
        for ( i=0; i<keyPayLoad.length; i++ ) {
            testInvokeArgs[keyPayLoad[i]] = String(index);
        }
    }

    tx_id = client.newTransactionID();
    hfc.setConfigSetting('E2E_TX_ID', tx_id.getTransactionID());
    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] tx id= %s', Nid, channelName, org, pid, tx_id.getTransactionID().toString());

    request_invoke = {
        chaincodeId : chaincode_id,
        fcn: ccDfnPtr.invoke.move.fcn,
        args: testInvokeArgs,
        txId: tx_id
    };

    if ( (transMode == 'MIX') && (mixQuery == 'TRUE') ) {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] request_invoke: ', Nid, channel.getName(), org, pid, request_invoke);
    } else if ( (inv_m == nRequest) && (nRequest>0) ) {
        if (invokeCheck == 'TRUE') {
            logger.info('[Nid:chan:org:id=%d:%s:%s:%d getMoveRequest] request_invoke: ', Nid, channel.getName(), org, pid, request_invoke);
        }
    }

    var ri = Object.assign({}, request_invoke);
    return ri;
}

//construct query request
var testQueryArgs = [];
for (i=0; i<ccDfnPtr.invoke.query.args.length; i++) {
    testQueryArgs.push(ccDfnPtr.invoke.query.args[i]);
}

var rqSelector;
if ( ccDfnPtr.invoke.query.fcn == 'queryMarbles' ) {
    if ( typeof( ccDfnPtr.invoke.query.args.selector ) !== 'undefined' ) {
        rqSelector = ccDfnPtr.invoke.query.args.selector;
    }
}

var request_query;
function getQueryRequest() {
    if ( ccType == 'ccchecker') {
        arg0 ++;
        for ( i=0; i<keyIdx.length; i++ ) {
            testQueryArgs[keyIdx[i]] = 'key_'+txIDVar+'_'+arg0;
        }
    } else if ( ccType == 'marblescc' ) {
        arg0 ++;
        var keyA = keyStart;
        if ( arg0 - keyStart > 10 ) {
            keyA = arg0 - 10;
        }
        if ( ccDfnPtr.invoke.query.fcn == 'getMarblesByRange' ) {
            testQueryArgs[0] = queryMarbleName+'_'+txIDVar+'_'+keyA;
            testQueryArgs[1] = queryMarbleName+'_'+txIDVar+'_'+arg0;
        } else if ( ccDfnPtr.invoke.query.fcn == 'queryMarblesByOwner' ) {
            // marbles02 rich query: queryMarblesByOwner
            var index=arg0%nOwner;
            testQueryArgs[0] = queryMarbleOwner+'_'+txIDVar+'_'+index;
        } else if ( ccDfnPtr.invoke.query.fcn == 'queryMarbles' ) {
            // marbles02 rich query: queryMarbles
            var selector=0;
            var index=arg0%nOwner;
            if ( rqSelector ) {
                testQueryArgs[0]='{\"selector\":{';
                for ( let key in rqSelector ) {
                    if ( selector == 1 ) {
                        testQueryArgs[0]=testQueryArgs[0]+',';
                    }

                    if ( key == 'owner' ) {
                        testQueryArgs[0]=testQueryArgs[0]+'\"'+key+'\":\"'+queryMarbleOwner+'_'+txIDVar+'_'+index+'\"';
                    } else if ( key == 'size' ) {
                        var mSize=arg0%nOwner;
                        testQueryArgs[0]=testQueryArgs[0]+'\"'+key+'\":'+mSize;
                    } else {
                        testQueryArgs[0]=testQueryArgs[0]+'\"'+key+'\":\"'+rqSelector[key]+'\"';
                    }

                    if ( selector == 0 ) {
                        selector = 1;
                    }
                }
                testQueryArgs[0]=testQueryArgs[0]+'}';
            }

            testQueryArgs[0]=testQueryArgs[0]+'}';

        } else {
            for ( i=0; i<keyIdx.length; i++ ) {
                testQueryArgs[keyIdx[i]] = queryMarbleName+'_'+txIDVar+'_'+arg0;
            }
        }
    }

    tx_id = client.newTransactionID();
    request_query = {
        chaincodeId : chaincode_id,
        txId: tx_id,
        fcn: ccDfnPtr.invoke.query.fcn,
        args: testQueryArgs
    };

    //logger.info('request_query: ', request_query);
}

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
                if (peername.includes('peer')) {
                    if (TLS == 'ENABLED') {
                        data = testUtil.getTLSCert(key, peername);
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
                if (key.includes('peer')) {
                    if (TLS == 'ENABLED') {
                        data = testUtil.getTLSCert(key1, key);
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
            if (key.includes('peer')) {
                if (TLS == 'ENABLED') {
                    data = testUtil.getTLSCert(key1, key);
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
            if (key.includes('peer')) {
                if (TLS == 'ENABLED') {
                    data = testUtil.getTLSCert(key1, key);
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
            if (key.includes('peer')) {
                if (TLS == 'ENABLED') {
                    data = testUtil.getTLSCert(org, key);
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
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgPeer] add peer: ', Nid, channelName, org, pid, channel.getPeers());
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
                if (peername.includes('peer')) {
                    if (TLS == 'ENABLED') {
                        data = testUtil.getTLSCert(key, peername);
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
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadPeerList] add peer: ', Nid, channelName, org, pid, channel.getPeers());
}

function channelAddPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeer]', Nid, channelName, org, pid);
    var data;
    var peerTmp;
    var eh;
    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (key.includes('peer')) {
                if (TLS == 'ENABLED') {
                    data = testUtil.getTLSCert(org, key);
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
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeer] ', Nid, channelName, org, pid);
}


function channelAddPeerEvent(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddPeerEvent]', Nid, channelName, org, pid);
    var data;
    var eh;
    var peerTmp;
    for (let key in ORGS[org]) {
        logger.info('key: ', key);
        if (ORGS[org].hasOwnProperty(key)) {
            if (key.includes('peer')) {
                if (TLS == 'ENABLED') {
                    data = testUtil.getTLSCert(org, key);
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
    logger.info('[Nid:chan:org:id:ordererID=%d:%s:%s:%d assignOrdererList] ', Nid, channelName, org, pid);
    var data;
    var ordererTmp;
    for (let key in ORGS['orderer']) {
        if (key.includes('orderer')) {
            if (TLS == 'ENABLED') {
                data = testUtil.getTLSCert('orderer', key);
                if ( data !== null ) {
                    let caroots = Buffer.from(data).toString();

                    ordererTmp = client.newOrderer(
                        ORGS['orderer'][key].url,
                        {
                            'pem': caroots,
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
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignOrdererList] orderer list: %j', Nid, channelName, org, pid, ordererList);
}

function channelAddOrderer(channel, client, org) {
    var ordererID = ORGS[org].ordererID;
    var data;
    logger.info('[Nid:chan:org:id:ordererID=%d:%s:%s:%d:%s channelAddOrderer] ', Nid, channelName, org, pid, ordererID );
    if (TLS == 'ENABLED') {
        data = testUtil.getTLSCert('orderer', ordererID);
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
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d channelAddOrderer] orderer: %j ', Nid, channelName, org, pid, channel.getOrderers());
}


// assign thread the anchor peer (peer1) from the org
function assignThreadOrgAnchorPeer(channel, client, org) {
    logger.info('[Nid:chan:org:id=%d:%s:%s:%d assignThreadOrgAnchorPeer] ', Nid, channelName, org, pid );
    var peerTmp;
    var eh;
    var data;
    for (let key in ORGS) {
        if ( key == org ) {
        for ( let subkey in ORGS[key] ) {
            if (subkey.includes('peer')) {
                if (TLS == 'ENABLED') {
                    data = testUtil.getTLSCert(key, subkey);
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
                }
            }
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

                    if (targetPeers == 'ORGANCHOR') {
                        assignThreadOrgAnchorPeer(channel, client, org);
                    } else if (targetPeers == 'ALLANCHORS'){
                        assignThreadAllAnchorPeers(channel,client, org);
                    } else if (targetPeers == 'ORGPEERS'){
                        assignThreadOrgPeer(channel, client, org);
                    } else if (targetPeers == 'ALLPEERS'){
                        assignThreadAllPeers(channel,client, org);
                    } else if (targetPeers == 'LIST'){
                        assignThreadPeerList(channel,client,org);
                    } else {
	                logger.error('[Nid:chan:org:id=%d:%s:%s:%d execTransMode] pte-exec:completed:error targetPeers= %s', Nid, channelName, org, pid, targetPeers);
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
                        if (transMode == 'SIMPLE') {
                            execModeSimple();
                        } else if (transMode == 'CONSTANT') {
                            execModeConstant();
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

        // set a guard timer that extends past the time when all events for all invoke TXs should have been received or timed out.
        // If this guard timer times out, then that means at least one invoke TX did not make it,
        // and cleanup has not happened so we can finish and clean up now.
        if ( IDone == 1 ) {
            tCurr = new Date().getTime();
            console.log('[Nid:chan:org:id=%d:%s:%s:%d isExecDone] setup Timeout: %d ms, curr time: %d', Nid, channelName, org, pid, evtTimeout, tCurr);
            setTimeout(function(){
                tCurr = new Date().getTime();
                console.log('[Nid:chan:org:id=%d:%s:%s:%d isExecDone] Timeout: curr time: %d', Nid, channelName, org, pid, tCurr);
                var remain = Object.keys(txidList).length;
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d isExecDone] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d', Nid, channelName, org, pid, evtRcvB, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, remain);
                if (invokeCheck == 'TRUE') {
                    arg0 = keyStart + inv_m - 1;
                    inv_q = inv_m - 1;
                    invoke_query_simple(0);
                }
                if ( remain > 0 ) {
                    console.log('[Nid:chan:org:id=%d:%s:%s:%d isExecDone] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, remain, txidList);
                }

                evtDisconnect();
                latency_output();
                process.exit();

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
                    //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] Successfully received the filtered block event for block_num: %d, txid number: %d', Nid, channelName, org, pid, filtered_block.number, filtered_block.filtered_transactions.length);
                    if (typeof(filtered_block.filtered_transactions) != 'undefined') {
                      for (i=0; i<filtered_block.filtered_transactions.length; i++) {
                        var txid = filtered_block.filtered_transactions[i].txid;
                        if ( txidList[txid] ) {
                            evtRcvB = evtRcvB + 1;
                            var tend = new Date().getTime();
                            latency_update(evtRcvB, tend-txidList[txid], latency_event);
                            delete txidList[txid];
                            if (transMode == 'LATENCY') {
                                isExecDone('Move');
                                if ( IDone != 1 ) {
                                    invoke_move_latency();
                                }
                            }
                        }
                      }
                    }
                    else {
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec: Failure - received filtered_block.number:%d but filtered_transactions is undefined', Nid, channelName, org, pid, filtered_block.number);
                    }

                    if ( inv_m == evtRcvB  ) {
                        if ( IDone == 1 ) {
                            tCurr = new Date().getTime();
                            var remain = Object.keys(txidList).length;
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcvB, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, remain, (evtRcvB/(tCurr-tLocal)*1000).toFixed(2));
                            if (invokeCheck == 'TRUE') {
                                arg0 = keyStart + inv_m - 1;
                                inv_q = inv_m - 1;
                                invoke_query_simple(0);
                            }
                            if ( remain > 0 ) {
                                console.log('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, remain, txidList);
                            }

                            eh.unregisterBlockEvent(block_reg);
                            evtDisconnect();
                            latency_output();
                        }
                    }
                    resolve();
                } else {
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] pte-exec: Failure - received block with undefined filtered_block.number',Nid, channelName, org, pid);
                }
            },
            (err) => {
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] inv_m:evtRcvB=%d:%d err: %j', Nid, channelName, org, pid, inv_m, eBvtRcv, err);
            });
        }).catch((err) => {
            //evtTimeoutCnt++;
            //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterFilteredBlock] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, evtTimeoutCnt, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
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
                        evtRcvB = evtRcvB + 1;
                        var tend = new Date().getTime();
                        latency_update(evtRcvB, tend-txidList[txid], latency_event);
                        delete txidList[txid];
                    }
                }

                if ( inv_m == evtRcvB  ) {
                    if ( IDone == 1 ) {
                        tCurr = new Date().getTime();
                        var remain = Object.keys(txidList).length;
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcvB, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, remain, (evtRcvB/(tCurr-tLocal)*1000).toFixed(2));
                        if (invokeCheck == 'TRUE') {
                            arg0 = keyStart + inv_m - 1;
                            inv_q = inv_m - 1;
                            invoke_query_simple(0);
                        }
                        if ( remain > 0 ) {
                            console.log('[Nid:chan:org:id=%d:%s:%s:%d eventRegisterBlock] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, remain, txidList);
                        }

                        evtDisconnect();
                        latency_output();
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

function eventRegister(tx) {

    var deployId = tx.getTransactionID();
    eventHubs.forEach((eh) => {
        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(function(){eh.unregisterTxEvent(deployId);
            evtTimeoutCnt++;
            evtCount = evtRcv + evtTimeoutCnt;
            if ( ( IDone == 1 ) && ( inv_m == evtCount )  ) {
                tCurr = new Date().getTime();
                var remain = Object.keys(txidList).length;
                logger.info('[Nid:chan:org:id=%d:%s:%s:%d TIMEOUT eventRegister] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcv, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, remain, (evtRcv/(tCurr-tLocal)*1000).toFixed(2));
                if ( remain > 0 ) {
                    console.log('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] unreceived: %d, tx_id: ', Nid, channelName, org, pid, remain, txidList);
                }
                latency_output();
                evtDisconnect();
            }
            resolve()}, evtTimeout);

            eh.registerTxEvent(deployId.toString(), (tx, code) => {
                clearTimeout(handle);

                if ( txidList[deployId.toString()] ) {
                    eh.unregisterTxEvent(deployId);
                    evtRcv++;
                    var tend = new Date().getTime();
                    latency_update(evtRcv, tend-txidList[deployId.toString()], latency_event);
                    delete txidList[deployId.toString()];

                    if (code !== 'VALID') {
                        logger.error('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] The invoke transaction (%s) was invalid, code = ', Nid, channelName, org, pid, deployId.toString(), code);
                        reject();
                    } else {
                        if ( ( IDone == 1 ) && ( inv_m == evtRcv ) ) {
                            tCurr = new Date().getTime();
                            var remain = Object.keys(txidList).length;
                            logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] pte-exec:completed  Rcvd(sent)=%d(%d) %s(%s) in %d ms, timestamp: start %d end %d, #event timeout: %d, #event unreceived: %d, Throughput=%d TPS', Nid, channelName, org, pid,  evtRcv, inv_m, transType, invokeType, tCurr-tLocal, tLocal, tCurr, evtTimeoutCnt, remain, (evtRcv/(tCurr-tLocal)*1000).toFixed(2));
                            if (invokeCheck == 'TRUE') {
                                arg0 = keyStart + inv_m - 1;
                                inv_q = inv_m - 1;
                                invoke_query_simple(0);
                            }
                            if ( remain > 0 ) {
                                console.log('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] unreceived number: %d, tx_id: ', Nid, channelName, org, pid, txidList);
                            }

                            evtDisconnect();
                            resolve();
                            latency_output();
                        }
                    }
                    }
                }).catch((err) => {
                    clearTimeout(handle);
                });
            }).catch((err) => {
                //evtTimeoutCnt++;
                //logger.info('[Nid:chan:org:id=%d:%s:%s:%d eventRegister] number of events timeout=%d %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, evtTimeoutCnt, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
            });

            eventPromises.push(txPromise);
        });

}


// invoke_move_latency
function invoke_move_latency() {

    inv_m++;

    getMoveRequest();

    channel.sendTransactionProposal(request_invoke)
    .then(
        function(results) {
            var proposalResponses = results[0];

            getTxRequest(results);
            txidList[tx_id.getTransactionID().toString()] = new Date().getTime();
            return channel.sendTransaction(txRequest)
            .then((results) => {
                // do nothing here
            }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            })
        },
        function(err) {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_latency] Failed to send proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
        })
}


function execModeLatency() {

    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeLatency] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            var freq = 20000;
            if ( ccType == 'ccchecker' ) {
                freq = 0;
            }

            eventRegisterFilteredBlock();
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

    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeSimple] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            var freq = 20000;
            if ( ccType == 'ccchecker' ) {
                freq = 0;
            }
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

    latency[0] = inv_m;
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
                        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] completed %d, evtTimoutCnt %d, unceived events %d, %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, evtTimeoutCnt, remain, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                        var remain = Object.keys(txidList).length;
                        if ( remain > 0 ) {
                            console.log('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] unreceived events(%d), txidList', Nid, channelName, org, pid, remain, txidList);
                        }
                        return;
                    }
                    //return results[0];

                }).catch((err) => {
                    var toe = new Date().getTime();
                    latency_update(inv_m, toe-tos, latency_orderer);

                    logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                    if (ordererFO == 'TRUE') {
                        ordererFailover(channel, client);
                    }
                    invoke_move_const_go_evtBlock(t1, freq);
                    //evtDisconnect();
                    //return;
                })
        }).catch((err) => {
                var te = new Date().getTime();
                latency_update(inv_m, te-ts, latency_peer);

                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const_evtBlock] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                if (peerFO == 'TRUE') {
                    peerFailover(channel, client);
                }

                isExecDone('Move');
                if ( IDone != 1 ) {
                    invoke_move_const_go_evtBlock(t1, freq);
                }
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
    // getMoveRequest();
    var txProposal = requestQueue.pop();
    if (!txProposal) {
        logger.debug("empty requestQueue");
        invoke_move_const_go(t1, freq);
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
                    var remain = Object.keys(txidList).length;
                    logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] completed %d, evtTimoutCnt %d, unceived events %d, %s(%s) in %d ms, timestamp: start %d end %d', Nid, channelName, org, pid, inv_m, evtTimeoutCnt, remain, transType, invokeType, tCurr-tLocal, tLocal, tCurr);
                    if ( remain > 0 ) {
                        console.log('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] unreceived events(%d), txidList', Nid, channelName, org, pid, remain, txidList);
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

        }).catch((err) => {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_const] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
            if (peerFO == 'TRUE') {
                peerFailover(channel, client);
            }

            isExecDone('Move');
            if ( IDone != 1 ) {
                invoke_move_const_go(t1, freq);
            }
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

    if ( transType == 'INVOKE' ) {
        if (txCfgPtr.constantOpt.recHist) {
            recHist = txCfgPtr.constantOpt.recHist.toUpperCase();
        }
        logger.info('recHist: ', recHist);

        if ( payLoadType == 'FIXED' ) {
            var rlen = payLoadMin;
            var buf = String(PTEid).repeat(rlen).substring(0, rlen);
            for ( i = 0; i < keyPayLoad.length; i++ ) {
                testInvokeArgs[keyPayLoad[i]] = buf;
            }
        }

        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        var freq = parseInt(txCfgPtr.constantOpt.constFreq);
        ofile = 'ConstantResults'+PTEid+'.txt';

        if (typeof( txCfgPtr.constantOpt.devFreq ) == 'undefined') {
            logger.error('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] devFreq undefined, set to 0', Nid, channelName, org, pid);
            devFreq=0;
        } else {
            devFreq = parseInt(txCfgPtr.constantOpt.devFreq);
        }

        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeConstant] Constant Freq: %d ms, variance Freq: %d ms', Nid, channelName, org, pid, freq, devFreq);

        if ( invokeType == 'MOVE' ) {
            if ( ccType == 'general' ) {
                if ( freq < 20000 ) {
                    freq = 20000;
                }
            }

            if (evtType == 'FILTEREDBLOCK') {
                if ( evtListener == 'BLOCK') {
                    eventRegisterFilteredBlock();
                    invoke_move_const_evtBlock(freq);
                } else {
                   requestPusher(getMoveRequest, (freq / 10));
                   invoke_move_const(freq);
                }
            } else if (evtListener == 'BLOCK') {
                eventRegisterBlock();
                invoke_move_const_evtBlock(freq);
            } else {
                requestPusher(getMoveRequest, (freq / 10));
                invoke_move_const(freq);
            }
        } else if ( invokeType == 'QUERY' ) {
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

    if (mixQuery == 'TRUE') {
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] invoke request:', Nid, channelName, org, pid, request_invoke);
    }

    channel.sendTransactionProposal(request_invoke)
    .then((results) => {
            var proposalResponses = results[0];

            getTxRequest(results);
            eventRegister(request_invoke.txId);

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
                }
                return results[0];

            }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);
                invoke_move_mix_go(freq);
            })

        }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_mix] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    invoke_move_mix_go(freq);
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
                if (mixQuery == 'TRUE') {
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

    mixQuery = txCfgPtr.mixOpt.mixQuery.toUpperCase();
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
    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeProposal] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            var freq = 20000;
            if ( ccType == 'ccchecker' ) {
                freq = 0;
            }
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

            getTxRequest(results);
            eventRegister(request_invoke.txId);

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

        }).catch((err) => {
                logger.error('[Nid:chan:org:id=%d:%s:%s:%d invoke_move_burst] Failed to send transaction proposal due to error: ', Nid, channelName, org, pid, err.stack ? err.stack : err);

                isExecDone('Move');
                if ( IDone != 1 ) {
                    invoke_move_burst_go();
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
    burstFreq0 = parseInt(txCfgPtr.burstOpt.burstFreq0);
    burstDur0 = parseInt(txCfgPtr.burstOpt.burstDur0);
    burstFreq1 = parseInt(txCfgPtr.burstOpt.burstFreq1);
    burstDur1 = parseInt(txCfgPtr.burstOpt.burstDur1);
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
    if ( transType == 'INVOKE' ) {
        tLocal = new Date().getTime();
        if ( runDur > 0 ) {
            tEnd = tLocal + runDur;
        }
        logger.info('[Nid:chan:org:id=%d:%s:%s:%d execModeBurst] tStart %d, tLocal %d', Nid, channelName, org, pid, tStart, tLocal);
        if ( invokeType == 'MOVE' ) {
            invoke_move_burst();
        } else if ( invokeType == 'QUERY' ) {
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

function requestPusher(fn, delay) {
    if ( (inv_m < nRequest) || (nRequest == 0) ) {
        if ( requestQueue.length < maxRequestQueueLength ) {
            var data = fn();
            requestQueue.unshift(data);
        } else {
            logger.debug("no data pushed");
        }
        setTimeout(requestPusher, delay, fn, delay)
    }
}
