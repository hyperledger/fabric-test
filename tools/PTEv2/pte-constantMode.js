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

const pteUtil = require('./pte-util.js');
const pteInvokeQuery = require('./pte-invokeQuery.js');

let loggerMsg = `PTE constantMode`;
let logger = new pteUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });


// local var
let devFreq = 0;
let constFreq = 0;
let invokeType;

/**
 * geterate a random number between min0 and max0
 *
 * @param {number} min0 The first (smaller) number
 * @param {number} max0 The second (larger) number
 * @returns {number} The random number
 **/
function genRandomNum(min0, max0) {
    return Math.floor(Math.random() * (max0 - min0)) + min0;
}

/**
 * set the constant frequency and deviation frquency from user input
 *
 * @param {string} txnCfgObj The object of transaction configuration
 * @returns {promise<void>}
 **/
function setTransactionFreq(txnCfgObj) {
    if (typeof (txnCfgObj.constantOpt.devFreq) !== 'undefined') {
        devFreq = parseInt(txnCfgObj.constantOpt.devFreq);
    }
    if (typeof (txnCfgObj.constantOpt.constFreq) !== 'undefined') {
        constFreq = parseInt(txnCfgObj.constantOpt.constFreq);
    }
    logger.info('[setTransactionFreq] devFreq %d, constFreq: %d', devFreq, constFreq);

    return;
}

/**
 * adjust transaction frequency if needed
 *
 * @param {number} freq The frequency of the transaction
 * @param {number} tBase The base timestamp
 * @returns {number} The transaction frequency
 **/
function freqAdjuster(freq, tBase) {
    let tNow = new Date().getTime();
    let tDiff = tNow - tBase;
    if (tDiff < freq) {
        freq = freq - tDiff;
    } else {
        freq = 0;
    }

    return freq;
}

/**
 * transaction frequency
 *
 * @returns {number} The constant mode transaction frequency
 **/
function backoffCalculatorConstantFreq() {
    return constFreq;
}

/**
 * calculate the transaction frequency
 *
 * @param {number} tBase The base timestamp
 * @returns {number} The frequency of transaction
 **/
function backoffCalculatorConstant(tBase) {
    let freq = backoffCalculatorConstantFreq();
    if (devFreq > 0) {
        freq = genRandomNum(freq - devFreq, freq + devFreq);
    }

    return freqAdjuster(freq, tBase);
}

/**
 * execute constant mode transaction
 *
 * @param {string} contract The contract name of the transaction
 * @param {string} txnCfgObj The transaction configuration object
 * @returns {promise<void>}
 **/
async function execModeConstant(contract, txnCfgObj) {
    // set constant mode freq
    setTransactionFreq(txnCfgObj);

    // constant mode freq calculator
    const freqCB = backoffCalculatorConstant;

    // start transactions
    invokeType = txnCfgObj.invokeType.toUpperCase();
    if (invokeType === 'MOVE') {
        pteInvokeQuery.execInvoke(contract, 1, freqCB);
    } else {
        pteInvokeQuery.execQuery(contract, 1, freqCB);
    }
}

exports.backoffCalculatorConstant = backoffCalculatorConstant;
exports.execModeConstant = execModeConstant;
