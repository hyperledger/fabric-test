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

'use strict';

const crypto = require('crypto');

const pteUtil = require('./pte-util.js');
const pteExecRequest = require('./pte-execRequest.js');
const pteTransaction = require('./pte-transaction.js');

let loggerMsg = `PTE invoekQuery`;
let logger = new pteUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });

// local var
let peerFailover = false;
let invokeType;
let targetPeersList = [];
let queryResult = false;

/**
 * set peer failover var
 *
 * @param {string} txnCfgObj The object of transaction configuration
 * @returns {Promise<void>}
 **/
function setPeerFailover(txnCfgObj) {
    // sdk handles peer failover when running discovery service
    peerFailover = false;
    if (txnCfgObj.targetPeers.toUpperCase() === 'DISCOVERY') {
        return;
    }

    if (typeof (txnCfgObj.peerFailover) !== 'undefined') {
        if (txnCfgObj.peerFailover === 'TRUE') {
            peerFailover = true;
        }
    }

    return;
}

/**
 * log query result setting
 *
 * @param {string} txnCfgObj The transaction configuration object
 * @param {optional string} val The new query result if provided
 * @returns {Promise<void>}
 **/
function setQueryResult(txnCfgObj) {
    if ((arguments.length === 0) && (typeof (txnCfgObj.queryResult) !== 'undefined')) {
        if (txnCfgObj.queryResult === 'TRUE') {
            queryResult = true;
        }
    } else {
        queryResult = arguments[1];
    }

    return;
}

/**
 * set the invokeType: Move or Query
 *
 * @param {string} val The new invokeType
 * @returns {Promise<void>}
 **/
function setInvokeType(val) {
    invokeType = val;
    return;
}


/**
 * set target peers list
 *
 * @param {string} tPeersList The target peer list
 * @returns {Promise<void>}
 **/
function setTargetPeersList(tPeersList) {
    targetPeersList = JSON.parse(JSON.stringify(tPeersList));
    return;
}


/**
 * Sends a predetermined number of invoke transactions at a certain frequency
 *
 * @param {string} contract The smart contract name
 * @param {number} ntx The number of transactions to send
 * @param {number} freqCB The frequency at which to send transactions
 * @returns {Promise<void>}
 */
async function execInvoke(contract, ntx, freqCB) {

    let ts = new Date().getTime();
    pteExecRequest.statsUpdate('txnSent');

    // set tx args
    let txnFcnArgs = pteTransaction.getTxnArgs(ntx, invokeType);

    // submit transaction
    const invokeTxn = contract.createTransaction(txnFcnArgs.fcn);
    try {
        if ( targetPeersList.length === 0 ) {
            if ( txnFcnArgs.setTransientMap ) {
                const submitTxn = await invokeTxn.setTransient(txnFcnArgs.txTransMap).submit();
            } else {
                const submitTxn = await invokeTxn.submit(...txnFcnArgs.txnArgs);
            }
        } else {
            if ( txnFcnArgs.setTransientMap ) {
                const submitTxn = await invokeTxn.setEndorsingPeers(targetPeersList).setTransient(txnFcnArgs.txTransMap).submit();
            } else {
                const submitTxn = await invokeTxn.setEndorsingPeers(targetPeersList).submit(...txnFcnArgs.txnArgs);
            }
        }

        const txnID = await invokeTxn.getTransactionId();
        pteExecRequest.txnIdListUpdate(txnID);

        // update orderer latency including proposal
        let te = new Date().getTime();
        pteExecRequest.latencyUpdate(te - ts, 'orderer');
    } catch( error ) {
        pteExecRequest.statsUpdate('txnFailed');
        const txnID = invokeTxn.getTransactionId();
        logger.error('[execInvoke] bad transaction ID: %j', txnID);
        if ( peerFailover ) {
            pteExecRequest.newTargetPeers();
        }
    }

    // have all transactions been sent?
    pteExecRequest.isExecDone(contract, invokeType, ntx, ts, execInvoke, freqCB);
}


/**
 * Sends a predetermined number of query transactions at a certain frequency
 *
 * @param {string} contract The smart contract name
 * @param {number} ntx The number of transactions to send
 * @param {number} freqCB The frequency at which to send transactions
 * @returns {Promise<void>}
 */
async function execQuery(contract, ntx, freqCB) {

    let ts = new Date().getTime();
    pteExecRequest.statsUpdate('txnSent');

    // set tx args
    let txnFcnArgs = pteTransaction.getTxnArgs(ntx, invokeType);

    const queryTXN = contract.createTransaction(txnFcnArgs.fcn);
    try {
        let result;
        if ( targetPeersList.length === 0 ) {
            result = await queryTXN.evaluate(...txnFcnArgs.txnArgs);
        } else {
            result = await queryTXN.setEndorsingPeers(targetPeersList).evaluate(...txnFcnArgs.txnArgs);
        }
        pteExecRequest.statsUpdate('txnRcvd');
        if ( queryResult ) {
            logger.info('[execQuery] contract.evaluateTransaction succeeded: args: %j, result: ', txnFcnArgs.txnArgs, result.toString());
        }
    } catch (error) {
        pteExecRequest.statsUpdate('txnFailed');
        logger.error('[execQuery] contract.evaluateTransaction failed transaction txnArgs: %j, error: %j', txnFcnArgs.txnArgs, error);
        if ( peerFailover ) {
            pteExecRequest.newTargetPeers();
        }
    }

    // have all transactions been sent?
    pteExecRequest.isExecDone(contract, invokeType, ntx, ts, execQuery, freqCB);
}


// module exports
module.exports.setQueryResult = setQueryResult;
module.exports.setPeerFailover = setPeerFailover;
module.exports.setInvokeType = setInvokeType;
module.exports.setTargetPeersList = setTargetPeersList;
module.exports.execInvoke = execInvoke;
module.exports.execQuery = execQuery;
