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

let loggerMsg = `PTE transaction`;
let logger = new pteUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });

//cc parameters
let keyIdx = [];
let keyPayLoad = [];
let transMapKey = [];
let transMapKeyIdx = [];
let transMapKeyType = [];
let keyStart;
let payLoadMin;
let payLoadMax;

// transaction args
let invokeTxnArgs = [];
let queryTxnArgs = [];
let invokeTxnTransMap = {};
let setTransientMap = false;

// transaction fcn
let fcn = 'invoke';

// local var
let txnIDVar;
let invokeType;

// chaincode related
let chaincodeID;

let invokeCheck = false;
let inovkeCheckParams = {};

/**
 * Set invoke validation
 *
 * @param {string} txnCfgObj The transaction configuration object
 * @returns {Promise<void>}
 */
function setInvokeCheck(txnCfgObj) {
    if (typeof (txnCfgObj.invokeCheck) !== 'undefined') {
        if (txnCfgObj.invokeCheck === 'TRUE') {
            invokeCheck = true;
        } else if (txnCfgObj.invokeCheck === 'FALSE') {
            invokeCheck = false;
        } else {
            invokeCheck = txnCfgObj.invokeCheck;
        }
    }

    if (invokeCheck) {
        // set default invokeCheck parameters
        let invokeCheckPeers = txnCfgObj.targetPeers.toUpperCase();
        let invokeCheckTx = 'LAST';
        let invokeCheckTxNum = 1;

        // get invokeCheck parameters from tx config
        if (txnCfgObj.invokeCheckOpt) {
            if (txnCfgObj.invokeCheckOpt.peers) {
                invokeCheckPeers = txnCfgObj.invokeCheckOpt.peers.toUpperCase();
            }
            if (txnCfgObj.invokeCheckOpt.transactions) {
                invokeCheckTx = txnCfgObj.invokeCheckOpt.transactions.toUpperCase();
            }
            if (txnCfgObj.invokeCheckOpt.txNum) {
                invokeCheckTxNum = parseInt(txnCfgObj.invokeCheckOpt.txNum);
            }
        }

        inovkeCheckParams = {
            invokeCheckPeers: invokeCheckPeers,
            invokeCheckTx: invokeCheckTx,
            invokeCheckTxNum: invokeCheckTxNum
        }
    }

    logger.info('[setInvokeCheck]s invokeCheck: %j, inovkeCheckParams: %j', invokeCheck, inovkeCheckParams);

    return;
}

/**
 * get the invoke validation setting
 *
 * @returns {invokeCheck}
 */
function getInvokeCheck() {
    return invokeCheck;
}

/**
 * get the invoke validation parameters
 *
 * @returns {invokeCheckParams} An invoke check object
 */
function getInvokeCheckParams() {
    return inovkeCheckParams;
}


/**
 * set the chaincode ID
 *
 * @param {string} txnCfgObj The object of transaction configuration
 * @returns {promise<void>}
 */
function setChaincodeID(txnCfgObj) {
    chaincodeID = txnCfgObj.chaincodeID

    return;
}

/**
 * get the chaincode ID
 *
 * @returns {chaincodeID}
 */
function getChaincodeID() {
    return chaincodeID;
}

/**
 * set invoke type: Move or Query
 *
 * @param {string} val The invoke type: Move or Query
 * @returns {promise<void>}
 */
function setInvokeType(val) {
    invokeType = val;
    logger.debug('[setInvokeType] invokeType: %s', invokeType);
    return;
}

/**
 * set transaction key ID
 *
 * @param {string} val The transaction key ID
 * @returns {promise<void>}
 */
function setTxnIDVar(val) {
    txnIDVar = val;
    return;
}

/**
 * set transaction function, args and transient Map
 *
 * @param {string} txObj The transaction object
 * @param {string} txType The transaction invoke type
 * @returns {promise<void>}
 */
function setTxnArgsAndFcn(txObj, txType) {

    // transaction fcn and args
    setTransientMap = false;
    if ( txType === 'MOVE' ) {
        if ( txObj.move.hasOwnProperty('fcn') ) {
            fcn = txObj.move.fcn;
        }

        if ( txObj.move.hasOwnProperty('transientMap') ) {
            setTransientMap = true;
            invokeTxnTransMap = JSON.parse(JSON.stringify(txObj.move.transientMap));
            logger.info('[setTxnArgsAndFcn] fcn: %s, invokeTxnTransMap: %j', fcn, invokeTxnTransMap);
        } else {
            invokeTxnArgs = JSON.parse(JSON.stringify(txObj.move.args));
            logger.info('[setTxnArgsAndFcn] fcn: %s, invokeTxnArgs: %j', fcn, invokeTxnArgs);
        }
    } else {
        invokeTxnArgs = [];
        invokeTxnTransMap = {};
        if ( txObj.query.hasOwnProperty('fcn') ) {
            logger.info('[setTxnArgsAndFcn] txObj.query.fcn: %s', txObj.query.fcn);
            fcn = txObj.query.fcn;
        }

        queryTxnArgs = JSON.parse(JSON.stringify(txObj.query.args));
        logger.info('[setTxnArgsAndFcn] fcn: %s, queryTxnArgs: %j', fcn, queryTxnArgs);
    }
}


/**
 * set transaction key parameters
 *
 * @param {string} txnCfgObj The transaction configuration object
 * @param {string} txType The transaction invoke type
 * @returns {promise<void>}
 */
function setKeyParams(txnCfgObj, txType) {

    let ccObj = txnCfgObj.ccOpt;
    if (typeof ccObj.keyStart !== 'undefined' ) {
        keyStart = parseInt(ccObj.keyStart);
    }
    if (typeof ccObj.payLoadMin !== 'undefined' ) {
        payLoadMin = parseInt(ccObj.payLoadMin);
    } else {
        payLoadMin = 8;
    }
    if (typeof ccObj.payLoadMax !== 'undefined' ) {
        payLoadMax = parseInt(ccObj.payLoadMax);
    } else {
        payLoadMax = 8;
    }
    logger.info('[setKeyParams] keyStart: %d, payLoadMin: %d, payLoadMax: %d', keyStart, payLoadMin, payLoadMax);

    // initialze keyIdx
    keyIdx = [];
    keyIdx = JSON.parse(JSON.stringify(ccObj.keyIdx));

    // initialze keyPayLoad
    keyPayLoad = [];
    if ( ccObj.hasOwnProperty('keyPayLoad') ) {
        keyPayLoad = JSON.parse(JSON.stringify(ccObj.keyPayLoad));
    }
    logger.info('[setKeyParams] keyIdx: %j, keyPayLoad: %j', keyIdx, keyPayLoad);

    // initialze transientMap key
    transMapKey = [];
    if ( ccObj.hasOwnProperty('transMapKey') ) {
        transMapKey = JSON.parse(JSON.stringify(ccObj.transMapKey));
    }

    // initialze transientMap keyIdx
    transMapKeyIdx = [];
    if ( ccObj.hasOwnProperty('transMapKeyIdx') ) {
        transMapKeyIdx = JSON.parse(JSON.stringify(ccObj.transMapKeyIdx));
    }

    // initialze transMapKeyType
    transMapKeyType = [];
    if ( ccObj.hasOwnProperty('transMapKeyType') ) {
        transMapKeyType = JSON.parse(JSON.stringify(ccObj.transMapKeyType));
    }
    logger.info('[setKeyParams] transMapKey: %j, transMapKeyIdx: %j, transMapKeyType: %j', transMapKey, transMapKeyIdx, transMapKeyType);
}

/**
 * get transaction fcn, args, and transient Map
 *
 * @param {number} ntx The number of transactions to send
 * @param {string} txType The transaction invoke type
 * @returns {Object} An object contains fcn, txnArgs, txTransMap, setTransientMap
 */
function getTxnArgs(ntx, txType) {
    let ntxId = keyStart+ntx;
    let txnArgs = [];
    let txTransMap = {};

    let keyVar = `${txnIDVar}_${ntxId}`;
    if ( !pteUtil.isEmpty(invokeTxnTransMap) ) {
        txTransMap = JSON.parse(JSON.stringify(invokeTxnTransMap));
        for ( let j = 0; j< transMapKey.length; j++ ) {
            let key = transMapKey[j];
            for ( let i = 0; i< transMapKeyIdx.length; i++ ) {
                let keyI = transMapKeyIdx[i];
                if ( invokeTxnTransMap[key].hasOwnProperty(keyI) ) {
                    if ( transMapKeyType[i] === 'string' ) {
                        txTransMap[key][keyI] = `${invokeTxnTransMap[key][keyI]}${keyVar}`;
                    } else if ( transMapKeyType[i] === 'integer' ) {
                        txTransMap[key][keyI] = parseInt(ntxId);
                    }
                }
            }
            txTransMap[key] = Buffer.from(JSON.stringify(txTransMap[key])).toString("base64");
        }
    } else {
        if ( txType === 'MOVE' ) {
            txnArgs = JSON.parse(JSON.stringify(invokeTxnArgs));
        } else {
            txnArgs = JSON.parse(JSON.stringify(queryTxnArgs));
        }

        for (let i = 0; i < keyIdx.length; i++) {
            if ( keyIdx[i] < txnArgs.length ) {
                txnArgs[keyIdx[i]] = `${txnArgs[keyIdx[i]]}${keyVar}`;
            }
        }

        // payload
        for (let i = 0; i < keyPayLoad.length; i++) {
            if ( txnArgs[keyPayLoad[i]] < txnArgs.length ) {
                let rlen = Math.floor(Math.random() * (payLoadMax - payLoadMin)) + payLoadMin;
                let buf = crypto.randomBytes(rlen);
                txnArgs[keyPayLoad[i]] = buf.toString('hex');
            }
        }
    }

    return {fcn, txnArgs, txTransMap, setTransientMap};
}



// module exports
module.exports.getInvokeCheck = getInvokeCheck;
module.exports.getInvokeCheckParams = getInvokeCheckParams;
module.exports.setInvokeCheck = setInvokeCheck;
module.exports.setInvokeType = setInvokeType;
module.exports.setTxnArgsAndFcn = setTxnArgsAndFcn;
module.exports.setTxnIDVar = setTxnIDVar;
module.exports.setKeyParams = setKeyParams;
module.exports.getTxnArgs = getTxnArgs;
module.exports.setChaincodeID = setChaincodeID;
module.exports.getChaincodeID = getChaincodeID;
