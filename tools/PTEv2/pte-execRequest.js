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
 *      node pte-execRequest.js -i <pid> -r <rid> -u <uiFile> -t <tStart> -o <org> -p <pteID>
 *        - pid: thread id
 *        - rid: runcase id
 *        - uiFile: user input file
 *        - tStart: tStart
 *        - org: organization
 *        - pteID: PTE client id
 */

'use strict';

const { argv } = require("yargs")
    .usage("Usage: $0 -i pid -r rid -u uiFile -t tStart -o org -p pteID")
    .help('help')
    .example(
      "$0 -i 0 -r 0 -u test.yaml -t 1595951543161 -o org1 -p 1",
      "Execute transactions specified in the test.yaml starts at 1595951543161."
    )
    .option("i", {
      alias: "pid",
      describe: "The i-th thread of this runcase",
      demandOption: "The pid is required.",
      type: "number",
      nargs: 1,
    })
    .option("r", {
      alias: "rid",
      describe: "The N-th runcase of this PTE",
      demandOption: "The rid is required.",
      type: "number",
      nargs: 1,
    })
    .option("p", {
      alias: "pteID",
      describe: "The P-th PTE client of this testcase",
      demandOption: "The pteID is required.",
      type: "number",
      nargs: 1,
      default: 0,
    })
    .option("u", {
      alias: "uiFile",
      describe: "The user input file of transactions configuration",
      demandOption: "The uiFile is required.",
      type: "string",
      nargs: 1,
    })
    .option("t", {
      alias: "tStart",
      describe: "The starting time of transactions of this thread",
      demandOption: "The tStart is required.",
      type: "string",
      nargs: 1,
    })
    .option("o", {
      alias: "org",
      describe: "The target organization of this thread",
      demandOption: "The org is required.",
      type: "string",
      nargs: 1,
    });

// requires
const fs = require('fs');
const path = require('path');

// fabric-sdk-node requires
const networkGateway = require('fabric-network/lib/gateway.js');
const fabricCAServices = require('fabric-ca-client');
const eventStrategies = require("fabric-network/lib/impl/event/defaulteventhandlerstrategies");
const queryStrategies = require("fabric-network/lib/impl/query/defaultqueryhandlerstrategies");

// PTE requires
const pteUtil = require('./pte-util.js');
const pteConstMode = require('./pte-constantMode.js');
const pteInvokeQuery = require('./pte-invokeQuery.js');
const pteTransaction = require('./pte-transaction.js');

// input arguments
let pid = argv.pid;
let rid = argv.rid;
let uiFile = argv.uiFile;
let tStart = argv.tStart;
let org = argv.org;
let pteID = argv.pteID;

// transactions configuration object
const txnCfgObj = pteUtil.getTxnCfgObj(uiFile);

// channelOpt
let channelOpt = txnCfgObj.channelOpt;
let targetOrgName = [];
let channelName = channelOpt.name;
for (let i = 0; i < channelOpt.orgName.length; i++) {
    targetOrgName.push(channelOpt.orgName[i]);
}

let loggerMsg = `PTE ${pteID} exec rid:pid:channel:org=${rid}:${pid}:${channelName}:${org}`;
let logger = new pteUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });
logger.info('uiFile: %s, tStart: %d, org: %s', uiFile, tStart, org);

// gateway
let gateway;

// local vars
let tCurr;
let tRunDurEnd = 0;
let tLocal;

// transaction related
let txnDone = 0;

// invoke related
let txnIdList = new Map();
let txnLastSentTime = 0;                 // last transaction sent timestamp

// event related
let evtTimeout = 120000;              // event timeout, default: 120 s
let evtLastRcvdTime = 0;              // last event received time
let evtCodeValid = 0;                 // event valid code as defined in TxValidationCode in fabric transaction.pb.go (filtered block only)

// transactions statistics
let txnStats = new Map();
let txnStatSent = 'txnSent';                           // txnStats idx: total transactions sent
let txnStatRcvd = 'txnRcvd';                           // txnStats idx: total transactions received
let txnStatFailed = 'txnFailed';                       // txnStats idx: total transactions failed
let txnStatEvtTimeout = 'txnEvtTimeout';               // txnStats idx: total transactions event timeout
let txnStatEvtInvalid = 'txnEvtInvalid';               // txnStats idx: total transactions invalid event received
let txnStatEvtUnRcvd = 'txnEvtUnRcvd';                 // txnStats idx: total transactions event not received
// init and create keys in txnStats
initTxStats(txnStats);


// connection profiles
let cpList = pteUtil.getConnProfileList(txnCfgObj.ConnProfilePath);
logger.info('cpList: ', cpList);

// find the connection profile that contains org
let cpf = pteUtil.findOrgConnProfile(cpList, org);
if ( !cpf ) {
    logger.error('invalid connection profile');
    process.exit(1);
}

// target peers related
let targetPeers = txnCfgObj.targetPeers.toUpperCase();
let targetPeersList = [];
let cpPeersList = [];
let curTargetPeer = 0;
for (let key in cpf['peers']) {
    cpPeersList.push(key);
}
logger.info('cpPeersList: %j', cpPeersList);

// event timeout
if ((typeof (txnCfgObj.eventOpt) !== 'undefined') && (typeof (txnCfgObj.eventOpt.timeout) !== 'undefined')) {
    evtTimeout = parseInt(txnCfgObj.eventOpt.timeout);
}

//transaction configuration parameters
let transMode = txnCfgObj.transMode.toUpperCase();
let invokeType = txnCfgObj.invokeType.toUpperCase();
let nRequest = parseInt(txnCfgObj.nRequest);
let runDur = 0;
if (nRequest === 0) {
    runDur = parseInt(txnCfgObj.runDur);
    // convert runDur from second to ms
    runDur = 1000 * runDur;
}

let runForever = 0;
if ((nRequest === 0) && (runDur === 0)) {
    runForever = 1;
}
logger.info('transMode: %s, invokeType: %s, nRequest: %d, runDur: %d, runForever: %d', transMode, invokeType, nRequest, runDur, runForever);

// init latencies matrix: txn num/avg/min/max
let latencyOrderer = [0, 0, 0, 0];
let latencyEvent = [0, 0, 0, 0];

/**
 * initiatize and create keys of txn statistics: txnStats
 *
 * @param {object} statMap The txn stats map
 * @returns {promise<void>}
 **/
function initTxStats(statMap) {
    statMap.set(txnStatSent, 0);
    statMap.set(txnStatRcvd, 0);
    statMap.set(txnStatFailed, 0);
    statMap.set(txnStatEvtTimeout, 0);
    statMap.set(txnStatEvtInvalid, 0);
    statMap.set(txnStatEvtUnRcvd, 0);
}


/**
 * find the index of a peer in the cpPeersList
 *
 * @param {string} peer The peer to be located
 * @returns {number} The index of the peer in the cpPeerList, return -1 if not found
 */
function findTargetPeerIndex(peer) {
    logger.info('[findTargetPeerIndex] peer: ', peer);
    for (let i=0; i<cpPeersList.length; i++)
    {
        if (cpPeersList[i] === peer) {
            return i;
        }
    }
    return -1;
}

/**
 * set the new targetPeer in the cpPeersList
 *
 * @returns {promise<void>}
 */
function newTargetPeer() {
    curTargetPeer ++;
    curTargetPeer = curTargetPeer % cpPeersList.length;
    targetPeersList = [];
    targetPeersList.push(cpPeersList[curTargetPeer]);
    logger.info('[newTargetPeerIndex] curTargetPeer: %d, targetPeersList: %j', curTargetPeer, targetPeersList);
}

/**
 * set targetPeers list
 *
 * @param {string} tgtPeerType The target peer type
 * @returns {targetPeerList} The target peer list
 */
function setTargetPeers(tgtPeerType) {
    // set target peers list
    let tPeersList = [];
    if (tgtPeerType === 'DISCOVERY' ) {
        tPeersList = [];
    } else if (tgtPeerType === 'LIST' ) {
        tPeersList = pteUtil.getTargetPeers(tgtPeerType, cpList, txnCfgObj.listOpt);
    } else {
        tPeersList = pteUtil.getTargetPeers(tgtPeerType, cpList, targetOrgName);
    }
    logger.info("[setTargetPeers] targetPeers(%s) targetPeersList: %j", tgtPeerType, tPeersList);

    return tPeersList;
}


/**
 * get discovery service setting
 *
 * @returns {DiscoveryParameters} The object contains serviceDiscovery and localHost
 */
function getDiscoveryParams() {
    let serviceDiscovery = false;
    let localHost = false;

    if (targetPeers === 'DISCOVERY') {
        serviceDiscovery = true;
        if ((typeof (txnCfgObj.discoveryOpt) !== 'undefined')) {
            let discoveryOpt = txnCfgObj.discoveryOpt;
            logger.info('[getDiscoveryParams] discoveryOpt: %j', discoveryOpt);
            if ((typeof (discoveryOpt.localHost) !== 'undefined')) {
                if (discoveryOpt.localHost === 'TRUE') {
                    localHost = true;
                }
            }

        }
    }

    return {serviceDiscovery, localHost};
}

/**
 * are all transactions executed?
 * if not, schedule the next trransaction
 *
 * @param {string} contract The smart contract name
 * @param {string} txnType The transaction type: Move or Query
 * @param {number} ntx The number of transactions to send
 * @param {number} tsLastTxn The timestamp of last transaction
 * @param {string} txnExecCB The callback transaction execution
 * @param {string} txnFreqCB The callback transaction frequency
 * @returns {promise<void>}
 */
function isExecDone(contract, txnType, ntx, tsLastTxn, txnExecCB, txnFreqCB) {
    tCurr = new Date().getTime();
    if (nRequest > 0) {
        if (ntx >= nRequest) {
            txnDone = 1;
        }
    } else {
        if (runForever === 0) {
            if (tCurr > tRunDurEnd) {
                txnDone = 1;
            }
        }
    }

    // set a guard timer that extends past the time when all events for all invoke TXs should have been received or timed out.
    // If this guard timer times out, then that means at least one invoke TX did not make it,
    // and cleanup has not happened so we can finish and clean up now.
    if (txnDone === 1) {
        if (txnType === 'MOVE') {
            txnLastSentTime = new Date().getTime();
            logger.info('[isExecDone] setup Timeout: %d ms, curr time: %d', evtTimeout, txnLastSentTime);
            logger.info('[isExecDone] txnSent: %d txnEvtRcvd: %d', txnStats.get(txnStatSent), txnStats.get(txnStatRcvd));
            setTimeout(function () {
                postEventProc('isExecDone', contract, txnStats);
            }, evtTimeout);
        } else {
            let chaincodeID = pteTransaction.getChaincodeID();
            // ***** query execution report *****
            // ***** DO NOT CHANGE this log message: PTE main parses this message for report *****
            logger.info('[isExecDone] pte-exec:completed transaction %s chaincodeID= %s  sent= %d Rcvd= %d failures= %d duration= %d ms, timestamp: start= %d end= %d, Throughput= %d TPS', invokeType, chaincodeID, txnStats.get(txnStatSent), txnStats.get(txnStatRcvd), txnStats.get(txnStatFailed), tCurr - tLocal, tLocal, tCurr, (txnStats.get(txnStatRcvd) / (tCurr - tLocal) * 1000).toFixed(2));
            gatewayDisconnect(0);
        }
    } else {
        // schedule next transaction
        let freq = txnFreqCB(tsLastTxn);

        ntx++;
        setTimeout(function() {
            txnExecCB(contract, ntx, txnFreqCB);
        }, freq)
    }
}

/**
 * invoke validation
 *
 * @param {string} caller The caller of this function
 * @param {string} contract The smart contract name
 * @returns {promise<void>}
 */
function invokeValidation(caller, contract) {
    // return if not invokeCheck
    if (!pteTransaction.getInvokeCheck(txnCfgObj)) {
        // disconnect from gateway
        gatewayDisconnect(0);
        return;
    }

    // set query transactions for validation
    let invChk = pteTransaction.getInvokeCheckParams();
    nRequest = txnStats.get(txnStatSent);
    let ntx;
    if (invChk.invokeCheckTx === 'LAST') {
        if (invChk.invokeCheckTxNum > txnStats.get(txnStatSent)) {
            ntx = 1;
        } else {
            ntx = nRequest - invChk.invokeCheckTxNum + 1;
        }
    } else if (invChk.invokeCheckTx === 'ALL') {
        ntx = 1;
    } else {
        return;
    }

    initTxStats(txnStats);

    // change invokeType to query
    invokeType = 'QUERY';
    initTransaction();
    initInvokeQuery();

    // set target peers list
    if ( targetPeers !== invChk.invokeCheckPeers ) {
        targetPeersList = setTargetPeers(invokeCheckPeers);
        pteInvokeQuery.setTargetPeersList(targetPeersList);
    }

    // turn on query result
    pteInvokeQuery.setQueryResult(txnCfgObj, true);

    pteInvokeQuery.execQuery(contract, ntx, pteConstMode.backoffCalculatorConstant);
}

/**
 * post process after all invoke events are received
 *
 * @param {string} caller The caller of this function
 * @param {string} contract The smart contract name
 * @param {Map} stats The transaction statistics Map
 * @returns {promise<void>}
 */
function postEventProc(caller, contract, stats) {
    let endTime = new Date().getTime();
    logger.info('[postEventProc:%s] evtLastRcvdTime: %d, txnLastSentTime: %d, endTime: %d', caller, evtLastRcvdTime, txnLastSentTime, endTime);
    if (evtLastRcvdTime === 0) {
        evtLastRcvdTime = endTime;
    }
    stats.set(txnStatEvtUnRcvd, txnIdList.size);
    stats.set(txnStatRcvd, stats.get(txnStatSent) - stats.get(txnStatFailed) - stats.get(txnStatEvtUnRcvd));
    logger.debug('[postEventProc:%s] stats ', caller, stats);

    let chaincodeID = pteTransaction.getChaincodeID();
    // ***** DO NOT CHANGE this log message: PTE main parses this message for report *****
    logger.info('[postEventProc:%s] pte-exec:completed transaction %s  chaincodeID= %s  Rcvd= %d sent= %d failure= %d in %d ms, timestamp: start= %d end= %d, #event timeout= %d, #event unreceived= %d, #event invalid= %d, Throughput=%d TPS', caller, invokeType, chaincodeID, stats.get(txnStatRcvd), stats.get(txnStatSent), stats.get(txnStatFailed), evtLastRcvdTime - tLocal, tLocal, evtLastRcvdTime, stats.get(txnStatEvtTimeout), stats.get(txnStatEvtUnRcvd), stats.get(txnStatEvtInvalid), (stats.get(txnStatRcvd) / (evtLastRcvdTime - tLocal) * 1000).toFixed(2));

    if (stats.get(txnStatEvtUnRcvd) > 0) {
        logger.error('[postEventProc:%s] unreceived number: %d, txnID: ', caller, stats.get(txnStatEvtUnRcvd), txnIdList.entries());
    }

    latencyOutput();
    invokeValidation('postEventProc', contract);
}

/**
 * output latency results
 *
 * @returns {promise<void>}
 */
function latencyOutput() {

    // output orderer latency
    if (latencyOrderer[0] != 0) {
        logger.info('[latencyOutput] pte-exec:completed orderer latency stats: txn num= %d, total time= %d ms, min= %d ms, max= %d ms, avg= %d ms', latencyOrderer[0], latencyOrderer[1], latencyOrderer[2], latencyOrderer[3], (latencyOrderer[1] / latencyOrderer[0]).toFixed(2));
    } else {
        logger.info('[latencyOutput] pte-exec:completed orderer latency stats: txn num= %d, total time= %d ms, min= %d ms, max= %d ms, avg= NA ms', latencyOrderer[0], latencyOrderer[1], latencyOrderer[2], latencyOrderer[3]);
    }

    // output event latency
    if (latencyEvent[0] != 0) {
        logger.info('[latencyOutput] pte-exec:completed event latency stats: txn num= %d, total time= %d ms, min= %d ms, max= %d ms, avg= %d ms', latencyEvent[0], latencyEvent[1], latencyEvent[2], latencyEvent[3], (latencyEvent[1] / latencyEvent[0]).toFixed(2));
    } else {
        logger.info('[latencyOutput] pte-exec:completed event latency stats: txn num= %d, total time= %d ms, min= %d ms, max= %d ms, avg= NA ms', latencyEvent[0], latencyEvent[1], latencyEvent[2], latencyEvent[3]);
    }

    // delete txnIdList
    txnIdList.clear();
}

/**
 * update latency arrays
 *
 * @param {number} ts The timestamp
 * @param {string} latType The type (ORDERER or EVENT) to be updated
 * @returns {promise<void>}
 */
function latencyUpdate(ts, latType) {
    latType = latType.toUpperCase();
    let latency;
    if (latType === 'ORDERER') {
        latency = latencyOrderer;
    } else if (latType === 'EVENT') {
        latency = latencyEvent;
    }

    latency[0] = latency[0] + 1;
    latency[1] = latency[1] + ts;
    if (latency[2] === 0) {
        latency[2] = ts;
    } else if (ts < latency[2]) {
        latency[2] = ts;
    }
    if (ts > latency[3]) {
        latency[3] = ts;
    }
}

/**
 * update transaction statistics
 *
 * @param {string} key The category of transaction
 * @returns {promise<void>}
 */
function statsUpdate(key) {
    let val = txnStats.get(key) + 1;
    txnStats.set(key, val);
    return;
}

/**
 * update transaction id array
 *
 * @param {string} key The transaction id
 * @returns {promise<void>}
 */
function txnIdListUpdate(key) {
    txnIdList.set(key, new Date().getTime());
    return;
}

/**
 * create filtered block event listner and option
 *
 * @param {string} network The network of the gateway
 * @returns {array} The array constains [EventListener, ListenerOptions]
 */
async function createEventListner(network) {

    const EventListener = async (event) => {

        // Handle block event received
        const nTX = event.blockData.filtered_transactions.length;
        evtLastRcvdTime = new Date().getTime();
        for (let i=0; i<nTX; i++) {
            let txnID = event.blockData.filtered_transactions[i].txid;
            if (txnIdList.has(txnID)) {
                statsUpdate(txnStatRcvd);
                latencyUpdate(evtLastRcvdTime - txnIdList.get(txnID), 'event');
                if ( (evtLastRcvdTime - txnIdList.get(txnID)) > evtTimeout) {
                    statsUpdate(txnStatEvtTimeout);
                }
                txnIdList.delete(txnID);
                let code = event.blockData.filtered_transactions[i].tx_validation_code;
                if ( code !== evtCodeValid ) {
                    statsUpdate(txnStatEvtInvalid);
                }
            }
        }

        if ((txnStats.get(txnStatSent)-txnStats.get(txnStatFailed)) === txnStats.get(txnStatRcvd)) {
            if (txnDone === 1) {
                // remove event listner
                remEventListner(network, EventListener);
    
                let chaincodeID = pteTransaction.getChaincodeID();
                postEventProc('createEventListner', network.getContract(chaincodeID), txnStats);
            }
        }
    }

    // listener option
    //          default: full block event
    //         override: filtered block event
    const ListenerOptions = {
        type: "filtered"
    };

    return [EventListener, ListenerOptions];
}

/**
 * add event listner
 *
 * @param {string} network The network of the gateway
 * @param {string} listener The listener of the block event
 * @param {string} options The options of the block event
 * @returns {promise<void>}
 */
async function addEventListner(network, listener, options) {

    await network.addBlockListener(listener, options);
    logger.info('[addEventListner] Event Listner added.' );

    return;
}

/**
 * remove event listner
 *
 * @param {string} network The network of the gateway
 * @param {string} listener The listener of the block event
 * @returns {promise<void>}
 */
async function remEventListner(network, listener) {

    network.removeBlockListener(listener);
    logger.info('[remEventListner] Event Listner removed' );

    return
}

/**
 * disconnect from gateway
 *
 * @param {number} code The exit code
 * @returns {promise<void>}
 */
async function gatewayDisconnect(code) {
    logger.info('[gatewayDisconnect] disconnect from gateway and exit process with code: %d', code);
    await gateway.disconnect();
    process.exit(code);
}

/**
 * execute transactions
 *
 * @returns {promise<void>}
 */
async function execTransMode() {
    try {

        // set gateway
        let orgCA = cpf.organizations[org].certificateAuthorities[0];
        const caInfo = cpf.certificateAuthorities[orgCA];
        const caTLSCACerts = caInfo.tlsCACerts['pem'];
        const ca = new fabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // create identity
        let username = pteUtil.getOrgEnrollId(cpf, org);
        let secret = pteUtil.getOrgEnrollSecret(cpf, org);

        const enrollment = await ca.enroll({
                                     enrollmentID: username,
                                     enrollmentSecret: secret
                                 });

        const x509Identity = {
                  credentials: {
                      certificate: enrollment.certificate,
                      privateKey: enrollment.key.toBytes(),
                  },
                  mspId: cpf.organizations[org].mspid,
                  type: 'X.509',
              };

        gateway = new networkGateway.Gateway();

        // check discovery option and timeout option
        let discParams = getDiscoveryParams();
        let timeoutOpt = pteUtil.getTimeoutOpt(txnCfgObj);

        // connect gateway to connection profile with overridden discovery, queryHandler, and eventHandler options
        await gateway.connect(cpf, {
                  identity: x509Identity,
                  discovery: {
                      enabled: discParams.serviceDiscovery,
                      asLocalhost: discParams.localHost
                  },
                  queryHandlerOptions: {
                      timeout: timeoutOpt.reqTimeout,
                      strategy: queryStrategies.MSPID_SCOPE_SINGLE
                  },
                  eventHandlerOptions: {
                      endorseTimeout: timeoutOpt.reqTimeout,
                      commitTimeout: evtTimeout,
                      strategy: eventStrategies.NONE
                  },
                  'connection-options': {
                      'grpc-wait-for-ready-timeout': timeoutOpt.grpcTimeout
                  }
              });

        const network = await gateway.getNetwork(channelName);

        let chaincodeID = pteTransaction.getChaincodeID();
        const contract = network.getContract(chaincodeID);

        // add discovery collection to contract if execute discovery service
        if (targetPeers === 'DISCOVERY') {
            let endorsementHint = {chaincodes: [{name: chaincodeID}]}
            if (typeof(txnCfgObj.discoveryOpt.collection) !== 'undefined') {
                endorsementHint['chaincodes'] = [{
                     name: chaincodeID,
                     collectionNames: txnCfgObj.discoveryOpt.collection
                }];

                await contract.addDiscoveryInterest(endorsementHint);
                logger.info('[execTransMode] discovery interest: %j', contract.getDiscoveryInterests());
            }
        }

        // add event listner
        if (invokeType === 'MOVE') {
            let blockEvent = await createEventListner(network);
            addEventListner(network, blockEvent[0], blockEvent[1]);
        }

        // set target peers list
        targetPeersList = setTargetPeers(targetPeers);
        curTargetPeer = findTargetPeerIndex(targetPeersList[0]);
        if ( (targetPeers !== 'DISCOVERY') && (curTargetPeer === -1) ) {
            logger.info('[execTransMode] no peer in the cpPeerList');
            gatewayDisconnect(1);
        }
        logger.info('[execTransMode] curTargetPeer: %d', curTargetPeer);

        // now execute transactions
        tCurr = new Date().getTime();
        let tSynchUp = tStart - tCurr;
        if (tSynchUp < 10000) {
            tSynchUp = 10000;
        }
        logger.info('[execTransMode] execTransMode: tCurr= %d, tStart= %d, time to wait=%d', tCurr, tStart, tSynchUp);

        // set transaction params on module invokeQuery
        // init invokequery module
        initInvokeQuery();
        pteInvokeQuery.setTargetPeersList(targetPeersList);

        setTimeout(function () {
            if (transMode === 'CONSTANT') {
                tLocal = new Date().getTime();
                if (txnCfgObj.runDur > 0) {
                    tRunDurEnd = tLocal + runDur;
                }
                pteConstMode.execModeConstant(contract, txnCfgObj);
            } else {
                // invalid transaction mode
                logger.error("[execTransMode] pte-exec:completed:error invalid transaction mode %j", transMode);
                gatewayDisconnect(1);
            }
        }, tSynchUp);
    } catch (err) {
        logger.error(err);
        gatewayDisconnect(1);
    }
}

/**
 * initialize module pteInvokeQuery
 *
 * @returns {promise<void>}
 */
function initInvokeQuery(){
    // set peer failover
    pteInvokeQuery.setPeerFailover(txnCfgObj);
    // set query result log
    pteInvokeQuery.setQueryResult(txnCfgObj);
    // set invokeType
    pteInvokeQuery.setInvokeType(invokeType);
}

/**
 * initialize module pteTransaction
 *
 * @returns {promise<void>}
 */
function initTransaction(){
    // set chaincode id
    pteTransaction.setChaincodeID(txnCfgObj);
    // set invokeType
    pteTransaction.setInvokeType(invokeType);
    // set txnIDVar
    let txnIDVar = `${channelName}_${org}_${rid}_${pid}`;
    pteTransaction.setTxnIDVar(txnIDVar);
    // set txn args and fcn
    pteTransaction.setTxnArgsAndFcn(txnCfgObj.invoke, invokeType);
    // set txn key
    pteTransaction.setKeyParams(txnCfgObj, invokeType);

}

/*
 *   transactions begin ....
 */
pteTransaction.setInvokeCheck(txnCfgObj);
initTransaction();
execTransMode();

// module exports
module.exports.isExecDone = isExecDone;
module.exports.newTargetPeer = newTargetPeer;
module.exports.statsUpdate = statsUpdate;
module.exports.txnIdListUpdate = txnIdListUpdate;
module.exports.latencyUpdate = latencyUpdate;

