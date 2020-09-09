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
 *    node pte-snapshot.js <Nid> <uiFile> <PTEid>
 *       - Nid: Network id
 *       - uiFile: user input file
 *       - PTEid: PTE id
 */
'use strict';

const child_process = require('child_process');
let hfc = require('fabric-client');
let fs = require('fs');
let testUtil = require('./pte-util.js');

// inputs
let Nid = parseInt(process.argv[2]);
let uiFile = process.argv[3];
let PTEid = parseInt(process.argv[4]);
PTEid = PTEid ? PTEid : 0
let loggerMsg = 'PTE ' + PTEid + ' snapshot';
let logger = new testUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });
logger.info('input parameters: Nid=%d, uiFile=%s, PTEid=%d', Nid, uiFile, PTEid);

let txCfgPtr;
let txCfgTmp;
let uiContent;
if (fs.existsSync(uiFile)) {
    uiContent = testUtil.readConfigFileSubmitter(uiFile);

    if (!uiContent.hasOwnProperty('txCfgPtr')) {
        txCfgTmp = uiFile;
    } else {
        txCfgTmp = uiContent.txCfgPtr;
    }
    txCfgPtr = testUtil.readConfigFileSubmitter(txCfgTmp);
}
else {
    uiContent = JSON.parse(uiFile)
    txCfgPtr = uiContent;
}

let TLS = testUtil.setTLS(txCfgPtr);

// snapshot input
if (!txCfgPtr.hasOwnProperty('snapshot')) {
    logger.error('snapshot input data is required');
    process.exit(1);
}
let snapshot = txCfgPtr.snapshot;

let isKube = false;
if (snapshot.isKube ) {
    isKube = snapshot.isKube;
}
let queryFreq = 10000;        // default query info frequency = 10 sec
if (snapshot.hasOwnProperty('queryFreq')) {
    queryFreq = parseInt(snapshot.queryFreq);
}
logger.info('snapshot query info frequency: %d', queryFreq);
let heightArray = snapshot.height.sort((a, b) => a - b);
logger.info('snapshot heightArray: ', heightArray);

// find the connection profile
let cpList = [];
let cpPath = uiContent.ConnProfilePath;
cpList = testUtil.getConnProfileListSubmitter(cpPath);
if (cpList.length === 0) {
    logger.error('error: invalid connection profile path or no connection profiles found in the connection profile path: %s', cpPath);
    process.exit(1);
}

// find the org that contains the peer
logger.info('snapshot: ', snapshot);
let org = testUtil.findOrgnameFromPeerSubmitter(cpList, snapshot.peerName);
let cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
if (!cpf) {
    logger.error('no connection profile is found for org(%s)', org);
    process.exit(1);
}
let username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
let secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);

// create client and channel objects
let client = new hfc();
let channel = client.newChannel(snapshot.channelID);

// snapshot generation failure count
let snapshotFailed = 0;

// start queryinfo
queryBlockInfoHandler(channel, client, org, cpf, queryFreq, isKube);

/**
 * poll snapshot generating or generated timestamp
 *
 * @param {string} cmd The generating or generated command
 * @returns {object} The object contains the timestamp and status
 */
async function pollTimestamp(cmd) {

    let t = 0;
    let str;
    let cmdStatus = true;
    try {
        str = (await child_process.execSync(cmd)).toString();
        if (str.includes('[34m')) {
            str = str.substr(str.indexOf('[34m')+4);
        }
        t = str.substr(0, str.indexOf('[kvledger]')-1);
        t = new Date(t).getTime();
    } catch(error) {
        logger.warn('[pollTimestamp] command (%s) failed', cmd);
        cmdStatus = false;
    }

    return {t, cmdStatus};
}

/**
 * commands to fetch snapshot generation timestamps
 *
 * @param {string} peer The peer name
 * @param {insteger} blk The block number
 * @param {boolean} isKube The isKube environment
 * @returns {object} The object of two commands to fetch snapshot generating and generated timestamps
 */
async function genTimeCmd(peer, blk, isKube) {

    let cmd;

    if (isKube) {
        cmd = `kubectl logs ${peer}-0 -c ${peer} | grep snapshot`;
    } else {
        cmd = `docker logs ${peer} 2>&1 | grep snapshot`;
    }

    let subcmd1 = `${cmd} | grep Generating | grep =${blk}`;
    let subcmd2 = `${cmd} | grep Generated | grep =${blk}`;

    return {subcmd1, subcmd2};
}

/**
 * get snapshot generation time
 *
 * @param {int} freq The snapshot generation time poll frequency
 * @param {int} blk The block number of the snapshot generation time to be polled
 * @param {boolean} isKube The isKube environment
 * @returns {int} The integer: 0: failed, 1: succeeded, 2: in progress
 */
async function snapshotGenTime(freq, blk, isKube) {
    let peer = snapshot.peerName;
    let cmd = await genTimeCmd(peer, blk, isKube);

    logger.info('[snapshotGenTime] Poll the snapshot generation time for block (%d) in peer (%s)', blk, peer);
    let rtn = await pollTimestamp(cmd.subcmd1);
    if (!rtn.cmdStatus) {
        snapshotFailed ++;
        if ( snapshotFailed >= 3 ) {
            logger.warn('[snapshotGenTime] Poll snapshot generation time for block (%d) in peer (%s) failed (%d)', blk, peer, snapshotFailed);
            snapshotFailed = 0;
            return 0;
        } else {
            logger.info('[snapshotGenTime] Poll snapshot generating time for block (%d) in peer (%s) failed (%d), try again later', blk, peer, snapshotFailed);
            return 2;
        }
    }
    let t1 = rtn.t;

    rtn = await pollTimestamp(cmd.subcmd2);
    if (!rtn.cmdStatus) {
        logger.info('[snapshotGenTime] The snapshot for block (%d) in peer (%s) is being generated ... ', blk, peer);
        return 2;
    }
    let t2 = rtn.t;

    // generate report
    let snapshotRpt = 'snapshotReport.json';
    let buff = {};
    buff["peer"] = peer;
    buff["height"] = blk;
    buff["start"] = new Date(t1).toISOString();
    buff["end"] = new Date(t2).toISOString();
    buff["total(sec)"] = (t2-t1)/1000;

    fs.appendFileSync(snapshotRpt, JSON.stringify(buff));
    fs.appendFileSync(snapshotRpt, '\n');

    snapshotFailed = 0;
    logger.info('[snapshotGenTime] snapshot generation:', JSON.stringify(buff));

    return 1;
}

/**
 * query block info
 *
 * @param {object} channel The channel object
 * @returns the block height
 */
async function queryBlockInfo(channel) {
    const blockchainInfo = await channel.queryInfo();
    logger.info('[queryBlockInfo] block height= %d', blockchainInfo.height);

    return blockchainInfo.height;
}

/**
 * query block info callback
 *
 * @param {object} channel The channel object
 * @param {int} freq The query info frequency in ms
 * @param {int} heightIdx The snapshot height index
 * @param {boolean} isKube The isKube environment
 * @returns {Promise<void>}
 */
async function queryBlockInfoCB(channel, freq, heightIdx, isKube) {

    let blkheight = await queryBlockInfo(channel);
    if ( parseInt(blkheight) > heightArray[heightIdx] ) {
        logger.info('[queryBlockInfoCB] block height: target= %d, current= %d', heightArray[heightIdx], parseInt(blkheight));
        // get snapshot generation time
        let snapshotStatus = await snapshotGenTime(freq, heightArray[heightIdx], isKube);
        if ( snapshotStatus === 1 || snapshotStatus === 0 ) {
            heightIdx++;
            if (heightIdx >= heightArray.length) {
                logger.info('[queryBlockInfoCB] reach final block height: target= %d, current= %d', heightArray[heightIdx-1], parseInt(blkheight));
                process.exit();
            }
        }
    }

    // schedule next query
    return new Promise(function(resolve) {
        setTimeout(function() {
            queryBlockInfoCB(channel, freq, heightIdx, isKube);
        }, freq);
    });
}

/**
 * query block info Handler
 *
 * @param {object} channel The channel object
 * @param {object} client The client object
 * @param {string} org The target organization name
 * @param {string} cpf The connection profile contains the target org
 * @param {int} freq The query info frequency in ms
 * @param {boolean} isKube The isKube environment
 * @returns {Promise<void>}
 */
async function queryBlockInfoHandler(channel, client, org, cpf, freq, isKube) {

    // get client key if clientauth
    if (TLS == testUtil.TLSCLIENTAUTH) {
        await testUtil.tlsEnroll(client, org, cpf);
        logger.debug('[queryBlockInfoHandler] got user private key: org= %s', org);
    }


    hfc.setConfigSetting('key-value-store', 'fabric-common/lib/impl/FileKeyValueStore.js');
    let cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(Nid, org) }));
    client.setCryptoSuite(cryptoSuite);

    testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS);

    let tgtPeers = [];
    tgtPeers[[org]]=[snapshot.peerName];
    testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, null, null, null, null, null);

    let kvs = await hfc.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(org)
    })
    await client.setStateStore(kvs);
    await testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf);
    await channel.initialize();
    logger.info('[queryBlockInfoHandler] successfully initialize channel');

    try {
        return await queryBlockInfoCB(channel, freq, 0, isKube);
    } catch(err) {
        logger.error('[queryBlockInfoHandler] initialize channel failed');
        logger.error(err.stack ? err.stack : err);
        process.exit(1);
    }

}
