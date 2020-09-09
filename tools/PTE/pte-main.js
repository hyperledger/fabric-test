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
 *     i. If using json, yml or yaml files
 *       node pte-main.js <Nid> <uiFile> <tStart> <PTEid>
 *         - Nid: Network id
 *         - uiFile: user input file
 *         - tStart: tStart
 *         - PTEid: PTE id
 *    ii. If using jsonObject
 *      node pte-main.js <Nid> <jsonObject> <tStart> <PTEid>
 *        - Nid: Network id
 *        - jsonObject: user input jsonObject
 *        - tStart: tStart
 *        - PTEid: PTE id
 */
// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

const child_process = require('child_process');

var hfc = require('fabric-client');
var fs = require('fs');
var path = require('path');
var util = require('util');

var testUtil = require('./pte-util.js');
var utils = require('fabric-common/lib/Utils.js');

hfc.setConfigSetting('crypto-keysize', 256);

var i = 0;
var procDone = 0;

// input: userinput json file
var PTEid = parseInt(process.argv[5]);
PTEid = PTEid ? PTEid : 0
var loggerMsg = 'PTE ' + PTEid + ' main';
var logger = new testUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });

// output local time
var localTime = new Date();
logger.info('The local time is: %j', localTime.toLocaleString());

var Nid = parseInt(process.argv[2]);
var uiFile = process.argv[3];
var tStart = parseInt(process.argv[4]);
var txCfgPtr;
var txCfgTmp;
var ccDfnPtr;
var ccDfnTmp;
var uiContent;
if (uiFile.endsWith(".json") || uiFile.endsWith(".yaml") || uiFile.endsWith(".yml")) {
    uiContent = testUtil.readConfigFileSubmitter(uiFile);
    logger.debug('[Nid=%d pte-main] input uiContent[%s]: %j', Nid, uiFile, uiContent);

    if (!uiContent.hasOwnProperty('txCfgPtr')) {
        txCfgTmp = uiFile;
    } else {
        txCfgTmp = uiContent.txCfgPtr;
    }
    txCfgPtr = testUtil.readConfigFileSubmitter(txCfgTmp);

    if (!uiContent.hasOwnProperty('ccDfnPtr')) {
        ccDfnTmp = uiFile;
    } else {
        ccDfnTmp = uiContent.ccDfnPtr;
    }
    ccDfnPtr = testUtil.readConfigFileSubmitter(ccDfnTmp);
}
else {
    uiContent = JSON.parse(uiFile)
    logger.debug('[Nid=%d pte-main] input uiContent[%s]: %j', Nid, uiFile, uiContent.deploy);
    txCfgPtr = uiContent;
    ccDfnPtr = uiContent;
}
logger.debug('input parameters: Nid=%d, uiFile=%s, tStart=%d PTEid=%d', Nid, uiFile, tStart, PTEid);
logger.debug('[Nid=%d pte-main] input ccDfnPtr[%s]: %j input txCfgPtr: %j', Nid, ccDfnTmp, ccDfnPtr, txCfgPtr);

var TLS = testUtil.setTLS(txCfgPtr);
logger.info('[Nid=%d pte-main] TLS= %d', Nid, TLS);

var channelOpt = uiContent.channelOpt;
var channelName = channelOpt.name;
var channelOrgName = [];
for (i = 0; i < channelOpt.orgName.length; i++) {
    channelOrgName.push(channelOpt.orgName[i]);
}
logger.info('[Nid=%d pte-main] channelName: %s', Nid, channelName);
logger.info('[Nid=%d pte-main] channelOrgName.length: %d, channelOrgName: %s', Nid, channelOrgName.length, channelOrgName);

// snapshot
let workerPid = [];
let snapshotPid = [];
let snapshotProcess;
let snapshot = null;
if (uiContent.hasOwnProperty('snapshot')) {
    snapshot = uiContent.snapshot;
    logger.info('snapshot: %j', snapshot);
}

// find all connection profiles
var cpList = [];
var cpPath = verifyIfPathExists(uiContent.ConnProfilePath);
logger.info('[Nid=%d pte-main] connection profile path: ', Nid, cpPath);
cpList = testUtil.getConnProfileListSubmitter(cpPath);
if (cpList.length === 0) {
    logger.error('[Nid=%d pte-main] error: invalid connection profile path or no connection profiles found in the connection profile path: %s', Nid, cpPath);
    process.exit(1);
}
logger.info('[Nid=%d pte-main] cpList; ', Nid, cpList);

var orderersCPFList = {};
orderersCPFList = testUtil.getNodetypeFromConnProfilesSubmitter(cpList, 'orderers');

var transType = txCfgPtr.transType.toUpperCase();

// timeout option
var timeoutOpt;
var cfgTimeout = 300000;   // default 300 sec
var grpcTimeout = 3000;    // default 3 sec
if (txCfgPtr.hasOwnProperty('timeoutOpt')) {
    timeoutOpt = txCfgPtr.timeoutOpt;
    logger.info('main - timeoutOpt: %j', timeoutOpt);
    if (timeoutOpt.hasOwnProperty('preConfig')) {
        cfgTimeout = parseInt(timeoutOpt.preConfig);
    }
    if (timeoutOpt.hasOwnProperty('grpcTimeout')) {
        grpcTimeout = parseInt(timeoutOpt.grpcTimeout);
        hfc.setConfigSetting('grpc-wait-for-ready-timeout', grpcTimeout);
    }
}
logger.info('main - cfgTimeout: %d', cfgTimeout);

// default chaincode language: golang
var language = 'golang';
var testDeployArgs = [];
var chaincodePath;
var metadataPath;
var collectionsConfigPath;
function initDeploy(org, transType) {
    if (ccDfnPtr.deploy.hasOwnProperty('language')) {
        language = ccDfnPtr.deploy.language.toLowerCase();
    }

    if (transType) {
        for (i = 0; i < ccDfnPtr.deploy.args.length; i++) {
            testDeployArgs.push(ccDfnPtr.deploy.args[i]);
        }
    }
    var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
    if (cpf === null) {
        logger.error('[initDeploy] no connection profile is found for org (%s)', org);
        process.exit(1);
    }

    if (ccDfnPtr.deploy.hasOwnProperty('chaincodePath')) {
        if (language == "golang") {
            chaincodePath = getRelativePath(ccDfnPtr.deploy.chaincodePath);
        } else {
            chaincodePath = verifyIfPathExists(ccDfnPtr.deploy.chaincodePath);
        }
        logger.info('chaincode language: %s, path: %s', language, chaincodePath);
    }

    if (ccDfnPtr.deploy.hasOwnProperty('metadataPath')) {
        metadataPath = verifyIfPathExists(ccDfnPtr.deploy.metadataPath);
        logger.info('metadataPath: %s', metadataPath);
    }

    //This part is untested, it might need to call the getRelativePath() function
    if (ccDfnPtr.deploy.hasOwnProperty('collectionsConfigPath')) {
        collectionsConfigPath = verifyIfPathExists(ccDfnPtr.deploy.collectionsConfigPath);
        logger.info('collectionsConfigPath: %s', collectionsConfigPath);
    }
}

function getRelativePath(inputPath) {
    if (fs.existsSync(inputPath)) {
        inputPath = inputPath.substring(inputPath.indexOf("github.com/hyperledger"), inputPath.length)
    }
    return inputPath
}

function verifyIfPathExists(inputPath) {
    if (!fs.existsSync(inputPath)) {
        let currentDirectory = __dirname
        let homeDirectory = currentDirectory.split("/github.com")[0]
        inputPath = path.join(homeDirectory, inputPath)
    }
    return inputPath
}

var tx_id = null;
var the_user = null;
var allEventhubs = [];
var org;
var orgName;

var orderer;

var sBlock = 0;
var eBlock = 0;
var maxWaitForFetchChannelBlock = 30;

var testSummaryArray = [];

function getOrgOrdererID(org) {
    var ordererID;

    var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
    if (0 === testUtil.getConnProfilePropCntSubmitter(cpf, 'orderers')) {
        logger.error('[getOrgOrdererID] org: %s, no orderer found in the connection profile', org);
        process.exit(1);
    }

    var cpOrgs = cpf['organizations'];

    if (cpOrgs[org].hasOwnProperty('ordererID')) {
        ordererID = cpOrgs[org].ordererID;
    } else {
        ordererID = Object.getOwnPropertyNames(orderersCPFList)[0];
    }
    return ordererID;
}

var chaincode_id;
var chaincode_ver;
function getCCID() {
    var channelID = uiContent.channelID;
    chaincode_id = uiContent.chaincodeID
    if (channelID) {
        chaincode_id = uiContent.chaincodeID + channelID;
    }
    chaincode_ver = uiContent.chaincodeVer;
    logger.debug('[getCCID] Nid: %d, chaincode_id: %s, chaincode_ver: %s', Nid, chaincode_id, chaincode_ver);
}


// output report file
var rptFile = 'pteReport.txt';
var sTime = new Date();

// latency output
var latency_peer = [0, 0, 0, 0];
var latency_orderer = [0, 0, 0, 0];
var latency_event = [0, 0, 0, 0];
function update_latency_array(lat_new, rawText) {
    var lat_tmp = [0, 0, 0, 0];
    lat_tmp[0] = parseInt(rawText.substring(rawText.indexOf("tx num=") + 7, rawText.indexOf(", total")).trim());
    lat_tmp[1] = parseInt(rawText.substring(rawText.indexOf("total time:") + 11, rawText.indexOf("ms")).trim());
    lat_tmp[2] = parseInt(rawText.substring(rawText.indexOf("min=") + 4, rawText.indexOf("ms, max")).trim());
    lat_tmp[3] = parseInt(rawText.substring(rawText.indexOf("max=") + 4, rawText.indexOf("ms, avg")).trim());

    lat_new[0] = lat_new[0] + lat_tmp[0];    // time
    lat_new[1] = lat_new[1] + lat_tmp[1];    // tx number
    if (lat_new[2] == 0) {             // min
        lat_new[2] = lat_tmp[2];
    } else if (lat_tmp[2] < lat_new[2]) {
        lat_new[2] = lat_tmp[2];
    }
    if (lat_new[3] == 0) {             // max
        lat_new[3] = lat_tmp[3];
    } else if (lat_tmp[3] > lat_new[3]) {
        lat_new[3] = lat_tmp[3];
    }

}

// test begins ....
performance_main();

// install chaincode
async function chaincodeInstall(client, org) {
    try {
        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
        var channel
        if (null === cpf) {
            logger.error('[chaincodeInstall] no connection profile is found for org(%s)', org);
            process.exit(1);
        }
        var cpOrgs = cpf['organizations'];

        var orgName = cpOrgs[org].name;
        logger.info('[chaincodeInstall] org: %s, org Name: %s', org, orgName);

        var cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(Nid, orgName) }));
        client.setCryptoSuite(cryptoSuite);

        // get client key
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, org, cpf);
            logger.debug('[chaincodeInstall] got user private key: org= %s', org);
        }

        var targets;
        var tgtOrg = [];
        tgtOrg[0]=org;
        var tgtPeers = [];
        tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, tgtOrg, 'ALLPEERS')
        if ( tgtPeers ) {
            targets = testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, null, null, null, null, null);
        }

        //sendInstallProposal
        getCCID();
        let baseDir = __dirname.split("/github.com/hyperledger/")[0];
        baseDir = baseDir.endsWith("src") ? baseDir.substring(0, baseDir.length - 3) : baseDir;
        var request_install = {
            targets: targets,
            chaincodePath: chaincodePath,
            metadataPath: metadataPath,
            chaincodeId: chaincode_id,
            chaincodeType: language,
            chaincodeVersion: chaincode_ver,
            goPath: baseDir
        };

        logger.debug('request_install: %j', request_install.targets);

        client.installChaincode(request_install, cfgTimeout)
            .then(
                function (results) {
                    var proposalResponses = results[0];
                    var all_good = true;
                    for (var i in proposalResponses) {
                        let one_good = false;
                        if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                            one_good = true;
                            logger.debug('[chaincodeInstall] org(%s): install proposal was good', org);
                        } else {
                            logger.error('[chaincodeInstall] org(%s) install proposal was bad:', org, proposalResponses[i]);
                        }
                        all_good = all_good & one_good;
                    }
                    if (all_good) {
                        logger.info(util.format('[chaincodeInstall] Successfully sent install Proposal to peers in (%s) and received ProposalResponse: Status - %s', orgName, proposalResponses[0].response.status));
                        evtDisconnect();
                    } else {
                        logger.error('[chaincodeInstall] install proposal failed, proposalResponses: %j', proposalResponses);
                        throw new Error('[chaincodeInstall] Failed to send install Proposal in (%s) or receive valid response. Response null or status is not 200. exiting...', orgName);
                    }

                }).catch((err) => {
                    logger.error('[chaincodeInstall] Failed to install chaincode in (%s) due to error: ', orgName, err);
                    evtDisconnect();
                    process.exit(1);

                });
    } catch (err) {
        logger.error(err)
        evtDisconnect();
        process.exit(1);
    }
}

function buildChaincodeProposal(client, the_user, type, upgrade, transientMap) {
    let tx_id = client.newTransactionID();

    // send proposal to endorser
    getCCID();
    var request = {
        chaincodePath: chaincodePath,
        chaincodeId: chaincode_id,
        chaincodeVersion: chaincode_ver,
        fcn: ccDfnPtr.deploy.fcn,
        args: testDeployArgs,
        chainId: channelName,
        chaincodeType: type,
        'endorsement-policy': ccDfnPtr.deploy.endorsement,
        'collections-config': collectionsConfigPath,
        txId: tx_id
    };

    if (upgrade) {
        // use this call to test the transient map support during chaincode instantiation
        request.transientMap = transientMap;
    }

    return request;
}

//instantiate chaincode
async function chaincodeInstantiate(channel, client, org) {
    try {
        var eventHubs = [];
        var cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(Nid, orgName) }));
        client.setCryptoSuite(cryptoSuite);

        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
        if (null === cpf) {
            logger.error('[chaincodeInstantiate] no connection profile is found for org(%s)', org);
            process.exit(1);
        }
        var cpOrgs = cpf['organizations'];

        logger.info('[chaincodeInstantiate] org= %s, org name=%s, channel name=%s', org, orgName, channel.getName());

        // get client key
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, org, cpf);
            logger.debug('[chaincodeInstantiate] get user private key: org= %s', org);
        }
        testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS);

        var ivar = 0
        for (ivar = 0; ivar < channelOrgName.length; ivar++) {
            var tgtOrg = [];
            tgtOrg[0]=channelOrgName[ivar];
            var tgtPeers = [];
            tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, tgtOrg, 'ALLPEERS')
            if ( tgtPeers ) {
                testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, null, null, null, null, eventHubs);
            }
        }

        logger.info('[chaincodeInstantiate:Nid=%d] ready to initialize channel[%s]', Nid, channel.getName());

        channel.initialize()
            .then((success) => {
                logger.info('[chaincodeInstantiate:Nid=%d] Successfully initialized channel[%s]', Nid, channel.getName());
                var upgrade = false;

                var badTransientMap = { 'test1': 'transientValue' }; // have a different key than what the chaincode example_cc1.go expects in Init()
                var request = buildChaincodeProposal(client, the_user, language, upgrade, badTransientMap);
                tx_id = request.txId;

                // sendInstantiateProposal
                //logger.info('request_instantiate: ', request);
                return channel.sendInstantiateProposal(request, cfgTimeout);
            })
            .then(
                function (results) {
                    var proposalResponses = results[0];
                    var proposal = results[1];
                    var header = results[2];
                    var all_good = true;
                    for (var i in proposalResponses) {
                        let one_good = false;
                        if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
                            one_good = true;
                            logger.info('[chaincodeInstantiate:Nid=%d] channel(%s) chaincode instantiation was good', Nid, channelName);
                        } else {
                            logger.error('[chaincodeInstantiate:Nid=%d] channel(%s) chaincode instantiation was bad: results= %j', Nid, channelName, results);
                        }
                        all_good = all_good & one_good;
                    }
                    if (all_good) {
                        logger.info(util.format('[chaincodeInstantiate] Successfully sent chaincode instantiation Proposal and received ProposalResponse: Status - %s', proposalResponses[0].response.status));


                        var request = {
                            proposalResponses: proposalResponses,
                            proposal: proposal,
                            header: header
                        };

                        var deployId = tx_id.getTransactionID();
                        var eventPromises = [];
                        eventPromises.push(channel.sendTransaction(request));
                        eventHubs.forEach((eh) => {
                            let txPromise = new Promise((resolve, reject) => {
                                let handle = setTimeout(reject, cfgTimeout);

                                eh.registerTxEvent(deployId.toString(), (tx, code) => {
                                    var tCurr1 = new Date().getTime();
                                    clearTimeout(handle);
                                    eh.unregisterTxEvent(deployId);

                                    if (code !== 'VALID') {
                                        logger.error('[chaincodeInstantiate] The chaincode instantiate transaction was invalid, code = ' + code);
                                        reject();
                                    } else {
                                        logger.debug('[chaincodeInstantiate] The chaincode instantiate transaction was valid.');
                                        resolve();
                                    }
                                }, (err) => {
                                    clearTimeout(handle);
                                    reject();
                                }, {
                                    disconnect: true
                                });
                                eh.connect();
                            });
                            logger.info('[chaincodeInstantiate] register eventhub %s with tx=%s', eh.getPeerAddr(), deployId);
                            eventPromises.push(txPromise);
                        });

                        var tCurr = new Date().getTime();
                        logger.debug('[chaincodeInstantiate] Promise.all tCurr=%d', tCurr);
                        return Promise.all(eventPromises)

                            .then((results) => {
                                logger.info('[chaincodeInstantiate] Event promise all complete and testing complete');
                                return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
                            }).catch((err) => {
                                var tCurr1 = new Date().getTime();
                                logger.error('[chaincodeInstantiate] failed to send instantiate transaction: tCurr=%d, elapse time=%d', tCurr, tCurr1 - tCurr);
                                //logger.error('Failed to send instantiate transaction and get notifications within the timeout period.');
                                evtDisconnect();
                                process.exit(1);
                            });
                    } else {
                        logger.error('[chaincodeInstantiate] Failed to send instantiate Proposal or receive valid response. Response results: %j', results);
                        evtDisconnect();
                        throw new Error('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
                    }
                })
            .then((response) => {
                if (response.status === 'SUCCESS') {
                    logger.info('[chaincodeInstantiate(Nid=%d)] Successfully instantiate transaction on %s. ', Nid, channelName);
                    evtDisconnect();
                    return;
                } else {
                    logger.error('[chaincodeInstantiate(Nid=%d)] Failed to instantiate transaction on %s. Error response: %j', Nid, channelName, response);
                    evtDisconnect();
                    throw new Error('Failed to instantiate transaction on %s. Response null or status is not 200. exiting...', channelName);
                }
            }).catch((err) => {
                logger.error('[chaincodeInstantiate(Nid=%d)] Failed to instantiate transaction on %s due to error: ', Nid, channelName, err.stack ? err.stack : err);
                evtDisconnect();
                process.exit(1);
            }
            );
    } catch (err) {
        logger.error(err)
        evtDisconnect();
        process.exit(1)
    }
}

//Upgrade chaincode
async function chaincodeUpgrade(channel, client, org) {
    try {
        var eventHubs = [];
        var cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(Nid, orgName) }));
        client.setCryptoSuite(cryptoSuite);
        logger.info('[chaincodeUpgrade] org= %s, org name=%s, channel name=%s', org, orgName, channel.getName());

        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
        if (null === cpf) {
            logger.error('[chaincodeUpgrade] no connection profile is found for org(%s)', org);
            process.exit(1);
        }

        // get client key
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, org, cpf);
            logger.debug('[chaincodeUpgrade] get user private key: org= %s', org);
        }
        testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS);

        var ivar = 0
        for (ivar = 0; ivar < channelOrgName.length; ivar++) {
            var tgtOrg = [];
            tgtOrg[0]=channelOrgName[ivar];
            var tgtPeers = [];
            tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, tgtOrg, 'ALLPEERS')
            if ( tgtPeers ) {
                testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, null, null, null, null, eventHubs);
            }
        }

        logger.info('[chaincodeUpgrade:Nid=%d] ready to initialize channel[%s]', Nid, channel.getName());

        channel.initialize()
            .then((success) => {
                logger.info('[chaincodeUpgrade:Nid=%d] Successfully initialized channel[%s]', Nid, channel.getName());
                var upgrade = true;

                var badTransientMap = { 'test1': 'transientValue' }; // have a different key than what the chaincode example_cc1.go expects in Init()
                var transientMap = { 'test': 'transientValue' };
                var request = buildChaincodeProposal(client, the_user, language, upgrade, badTransientMap);
                tx_id = request.txId;

                return channel.sendUpgradeProposal(request, cfgTimeout);
            })
            .then(
                function (results) {
                    var proposalResponses = results[0];
                    var proposal = results[1];
                    var header = results[2];
                    var all_good = true;
                    for (var i in proposalResponses) {
                        let one_good = false;
                        if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
                            one_good = true;
                            logger.info('[chaincodeUpgrade:Nid=%d] channel(%s) chaincode upgrade was good', Nid, channelName);
                        } else {
                            logger.error('[chaincodeUpgrade:Nid=%d] channel(%s) chaincode upgrade was bad: results= %j', Nid, channelName, results);
                            process.exit(1);
                        }
                        all_good = all_good & one_good;
                    }
                    if (all_good) {
                        logger.info(util.format('[chaincodeUpgrade] Successfully sent chaincode upgrade Proposal and received ProposalResponse: Status - %s', proposalResponses[0].response.status));


                        var request = {
                            proposalResponses: proposalResponses,
                            proposal: proposal,
                            header: header
                        };

                        var deployId = tx_id.getTransactionID();
                        var eventPromises = [];
                        eventPromises.push(channel.sendTransaction(request));
                        eventHubs.forEach((eh) => {
                            let txPromise = new Promise((resolve, reject) => {
                                let handle = setTimeout(reject, cfgTimeout);

                                eh.registerTxEvent(deployId.toString(), (tx, code) => {
                                    var tCurr1 = new Date().getTime();
                                    clearTimeout(handle);
                                    eh.unregisterTxEvent(deployId);

                                    if (code !== 'VALID') {
                                        logger.error('[chaincodeUpgrade] The chaincode upgrade transaction was invalid, code = ' + code);
                                        reject();
                                    } else {
                                        logger.info('[chaincodeUpgrade] The chaincode upgrade transaction was valid.');
                                        resolve();
                                    }
                                }, (err) => {
                                    clearTimeout(handle);
                                    reject();
                                }, {
                                    disconnect: true
                                });
                                eh.connect();
                            });
                            logger.info('[chaincodeUpgrade] register eventhub %s with tx=%s', eh.getPeerAddr(), deployId);
                            eventPromises.push(txPromise);
                        });

                        var tCurr = new Date().getTime();
                        logger.debug('[chaincodeUpgrade] Promise.all tCurr=%d', tCurr);
                        return Promise.all(eventPromises)

                            .then((results) => {
                                logger.info('[chaincodeUpgrade] Event promise all complete and testing complete');
                                return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
                            }).catch((err) => {
                                var tCurr1 = new Date().getTime();
                                logger.error('[chaincodeUpgrade] failed to send upgrade transaction: tCurr=%d, elapse time=%d', tCurr, tCurr1 - tCurr);
                                evtDisconnect();
                                process.exit(1);
                            });
                    } else {
                        logger.error('[chaincodeUpgrade] Failed to send upgrade Proposal or receive valid response. Response results: %j', results);
                        evtDisconnect();
                        throw new Error('Failed to send upgrade Proposal or receive valid response. Response null or status is not 200. exiting...');
                    }
                })
            .then((response) => {
                if (response.status === 'SUCCESS') {
                    logger.info('[chaincodeUpgrade(Nid=%d)] Successfully Upgrade transaction on %s. ', Nid, channelName);
                    evtDisconnect();
                    return;
                } else {
                    logger.error('[chaincodeUpgrade(Nid=%d)] Failed to Upgrade transaction on %s. Error response: %j', Nid, channelName, response);
                    evtDisconnect();
                    process.exit(1);
                }

            }).catch((err) => {
                logger.error('[chaincodeUpgrade(Nid=%d)] Failed to upgrade transaction on %s due to error: ', Nid, channelName, err.stack ? err.stack : err);
                evtDisconnect();
                process.exit(1);
            }
            );

    } catch (err) {
        logger.error(err)
        evtDisconnect();
        process.exit(1);
    }
}

//create or update channel
async function createOrUpdateOneChannel(client, channelOrgName) {
    try {
        var config;
        var envelope_bytes;
        var signatures = [];

        var username;
        var secret;
        var submitter = null;

        hfc.setConfigSetting('key-value-store', 'fabric-common/lib/impl/FileKeyValueStore.js');

        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, channelOrgName[0]);
        if (null === cpf) {
            logger.error('[createOrUpdateOneChannel] no connection profile is found for org(%s)', org);
            process.exit(1);
        }

        logger.info('[createOrUpdateOneChannel] org(%s) go path: %s', channelOrgName[0]);
        var channelTX = channelOpt.channelTX;
        if (!fs.existsSync(channelTX)) {
            let currentPath = __dirname
            let homeDirecotry = currentPath.split("github.com/")[0]
            channelTX = path.join(homeDirecotry, channelTX)
        }
        logger.info('[createOrUpdateOneChannel] channelTX: ', channelTX);
        envelope_bytes = fs.readFileSync(channelTX);
        config = client.extractChannelConfig(envelope_bytes);
        logger.info('[createOrUpdateOneChannel] Successfully extracted the config update from the configtx envelope: ', channelTX);

        // get client key
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, channelOrgName[0], cpf);
            logger.debug('[createOrUpdateOneChannel] get user private key: org= %s', channelOrgName[0]);
        }

        hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(Nid, orgName)
        }).then((store) => {
            client.setStateStore(store);
            var cryptoSuite = hfc.newCryptoSuite();
            cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(org) }));
            client.setCryptoSuite(cryptoSuite);

            var submitePromises = [];
            channelOrgName.forEach((org) => {
                submitter = new Promise(function (resolve, reject) {
                    cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
                    var cpOrgs = cpf['organizations'];
                    username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
                    secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);
                    orgName = cpOrgs[org].name;
                    logger.debug('[createOrUpdateOneChannel] org= %s, org name= %s, username= %s, secret= %s', org, orgName, username, secret);
                    client._userContext = null;
                    resolve(testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf));
                });
                submitePromises.push(submitter);
            });
            // all the orgs
            return Promise.all(submitePromises);
        })
            .then((results) => {
                results.forEach(function (result) {
                    var signature = client.signChannelConfig(config);
                    logger.info('[createOrUpdateOneChannel] Successfully signed config update for one organization ');
                    // collect signature from org admin
                    signatures.push(signature);
                });
                return signatures;
            }).then((sigs) => {
                client._userContext = null;
                return testUtil.getOrderAdminSubmitter(client, channelOrgName[0], cpPath);
            }).then(async (admin) => {
                the_user = admin;
                logger.info('[createOrUpdateOneChannel] Successfully enrolled user \'admin\' for', "orderer");
                var channelName = uiContent.ordererSystemChannel ? uiContent.ordererSystemChannel : "orderersystemchannel"
                var sysChannel = client.newChannel(channelName);

                testUtil.assignChannelOrdererSubmitter(sysChannel, client, channelOrgName[0], cpPath, TLS);

                let tx_id_sysCh = client.newTransactionID();

                var sysCh_request = {
                    txId: tx_id_sysCh
                };
                let retry = 0;
                let block
                while (retry < maxWaitForFetchChannelBlock ) {
                    try {
                        block = await sysChannel.getGenesisBlock(sysCh_request)
                        break
                    } catch (err) {
                        if ( retry < maxWaitForFetchChannelBlock ) {
                            await sleep(1000);
                            retry++
                        } else {
                            logger.error('[createOrUpdateOneChannel] Orderer system channel %s is not yet ready even after %d seconds, please try again later', channelName, retry);
                            process.exit(1);
                        }
                    }
                }
                if (block == undefined) {
                    logger.error('[createOrUpdateOneChannel] Unable to fetch genesis block for orderer system channel %s even after %d seconds, please try again later', channelName, retry);
                    process.exit(1);
                } else {
                    return block
                }
            }).then((block) => {
                var signature = client.signChannelConfig(config);
                logger.info('[createOrUpdateOneChannel] Successfully signed config update: ', "orderer");
                // collect signature from org admin
                signatures.push(signature);

                logger.debug('[createOrUpdateOneChannel] done signing: %s', channelName);
                // add new orderer
                orderer = testUtil.assignChannelOrdererSubmitter(null, client, channelOrgName[0], cpPath, TLS);
                // build up the create request
                let tx_id = client.newTransactionID();
                let nonce = tx_id.getNonce();
                var request = {
                    config: config,
                    signatures: signatures,
                    name: channelName,
                    orderer: orderer,
                    txId: tx_id,
                    nonce: nonce
                };
                //logger.info('request: ',request);
                if (channelOpt.action.toUpperCase() == 'CREATE') {
                    return client.createChannel(request);
                } else if (channelOpt.action.toUpperCase() == 'UPDATE') {
                    return client.updateChannel(request);
                }
            }).then((result) => {
                if (result.status == 'SUCCESS') {
                    logger.info('[createOrUpdateOneChannel] Successfully created/updated the channel (%s) with result: %j', channelName, result);
                    evtDisconnect();
                    process.exit();
                } else {
                    logger.error('[createOrUpdateOneChannel] Failed to created/updated the channel (%s) with result: %j', channelName, result);
                    evtDisconnect();
                    process.exit(1);
                }
            })
            .then((nothing) => {
                logger.info('Successfully waited to make sure new channel was created/updated.');
                evtDisconnect();
                process.exit();
            }).catch((err) => {
                logger.error('Failed due to error: ' + err.stack ? err.stack : err);
                evtDisconnect();
                process.exit(1);
            });
    } catch (err) {
        logger.error(err)
        evtDisconnect()
        process.exit(1)
    }
}

// join channel
async function joinChannel(channel, client, org) {
    try {
        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
        if (null === cpf) {
            logger.error('[joinChannel] no connection profile is found for org(%s)', org);
            process.exit(1);
        }
        var cpOrgs = cpf['organizations'];

        var orgName = cpOrgs[org].name;
        logger.info('[joinChannel] Calling peers in organization (%s) to join the channel (%s)', orgName, channelName);
        var username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
        var secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);
        logger.debug('[joinChannel] user=%s, secret=%s', username, secret);
        var genesis_block = null;
        var eventHubs = [];
        var blockCallbacks = [];

        // get client key
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, org, cpf);
            logger.debug('[joinChannel] get user private key: org= %s', org);
        }


        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(Nid, orgName)
        }).then((store) => {
            client.setStateStore(store);
            client._userContext = null;
            return testUtil.getOrderAdminSubmitter(client, org, cpPath)
        }).then(async (admin) => {
            logger.info('[joinChannel:%s] Successfully enrolled orderer \'admin\'', org);
            the_user = admin;
            logger.debug('[joinChannel] orderer admin: ', admin);

            // add orderers
            testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS);

            let tx_id = client.newTransactionID();
            var request = {
                txId: tx_id
            };

            let retry = 0;
            let block
            while ( retry < maxWaitForFetchChannelBlock ) {
                try {
                    block = await channel.getGenesisBlock(request);
                    break
                } catch (err) {
                    if ( retry < maxWaitForFetchChannelBlock ) {
                        await sleep(1000);
                        retry++
                    } else {
                        logger.error('[joinChannel] Channel %s is not yet ready even after %d seconds, please try again later', channelName, retry);
                        process.exit(1);
                    }
                }
            }
            if (block == undefined) {
                logger.error('[joinChannel] Unable to fetch genesis block for Channel %s even after %d seconds, please try again later', channelName, retry);
                process.exit(1);
            } else {
                return block
            }
        }).then((block) => {
            logger.info('[joinChannel:org=%s:%s] Successfully got the genesis block', channelName, org);
            genesis_block = block;

            client._userContext = null;
            return testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf);
        }).then((admin) => {
            logger.info('[joinChannel] Successfully enrolled org:' + org + ' \'admin\'');
            the_user = admin;
            logger.debug('[joinChannel] org admin: ', admin);

            // add peers and events
            var targets;
            var tgtOrg = [];
            tgtOrg[0]=org;
            var tgtPeers = [];
            tgtPeers = testUtil.getTargetPeerListSubmitter(cpList, tgtOrg, 'ALLPEERS')
            if ( tgtPeers ) {
                targets = testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, null, null, null, null, eventHubs);
            }

            tx_id = client.newTransactionID();
            let request = {
                targets: targets,
                block: genesis_block,
                txId: tx_id
            };

            return channel.joinChannel(request);
        })
            .then((results) => {
                logger.debug(util.format('[joinChannel:%s] join Channel (%s) R E S P O N S E : %j', org, channelName, results));

                if (results[0] && results[0].response && results[0].response.status == 200) {
                    logger.info('[joinChannel] Successfully joined peers in (%s:%s)', channelName, orgName);
                    evtDisconnect(eventHubs, blockCallbacks);
                } else {
                    logger.error('[joinChannel] Failed to join peers in org (%s), Error: %j', orgName, results);
                    evtDisconnect(eventHubs, blockCallbacks);
                    throw new Error('[joinChannel] Failed to join channel');
                }
            }).catch((err) => {
                logger.error('[joinChannel] --- Failed to join channel due to error: ' + err.stack ? err.stack : err);
                evtDisconnect(eventHubs, blockCallbacks);
                process.exit(1);
            });
    } catch (err) {
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

var totalLength = 0;
async function execQueryBlock(channel, sB, eB) {
    try {
        var tmp = txCfgPtr.queryBlockOpt;
        var tgtOrg = Object.keys(tmp)[0];

        var qBlks = [];
        for (i = sB; i <= eB; i++) {
            qBlks.push(parseInt(i));
        }

        var qPromises = [];
        var qb = null;
        var qi = 0;
        qBlks.forEach((qi) => {
            qb = new Promise(function (resolve, reject) {
                resolve(channel.queryBlock(qi));
            });
            qPromises.push(qb);
        });
        return Promise.all(qPromises).then((block) => {
            block.forEach(function (block) {

                totalLength = totalLength + block.data.data.length;
                logger.info('[execQueryBlock] channel:peer:block:length:accu length=%s:%s:%d:%d:%d', channelName, tmp[tgtOrg][0], block.header.number, block.data.data.length, totalLength);
            });
            logger.info('[execQueryBlock] Summary channel:peer:starting block:ending block:length=%s:%s:%d:%d:%j', channelName, tmp[tgtOrg][0], sBlock, eB, totalLength);

        }).catch((err) => {
            logger.error(err.stack ? err.stack : err);
            evtDisconnect();
            process.exit(1);
        });
    } catch (err) {
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

async function preQueryBlock(channel, sB, eB) {
    try {
        logger.info('[preQueryBlock] sB:eB= %d:%d', sB, eB);
        while (eBlock >= sB) {
            var tB = eBlock - sB;
            if (tB > 100) {
                eB = parseInt(sB) + 100 - 1;
            } else {
                eB = eBlock;
            }

            logger.info('[preQueryBlock] channel(%s) starting Block:ending Block= %d:%d', channelName, sB, eB);
            await execQueryBlock(channel, sB, eB);
            sB = eB + 1;
        }
    } catch (err) {
        throw new Error(err.stack ? err.stack : err);
    }
}

async function queryBlockchainInfo(channel, client, org) {
    try {
        logger.info('[queryBlockchainInfo] channel (%s)', channelName);
        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, channelOrgName[0]);
        if (null === cpf) {
            logger.error('[queryBlockchainInfo] no connection profile is found for org(%s)', org);
            process.exit(1);
        }

        var username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
        var secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);

        sBlock = txCfgPtr.queryBlockOpt.startBlock;
        eBlock = txCfgPtr.queryBlockOpt.endBlock;

        hfc.setConfigSetting('key-value-store', 'fabric-common/lib/impl/FileKeyValueStore.js');
        var cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({ path: testUtil.storePathForOrg(Nid, orgName) }));
        client.setCryptoSuite(cryptoSuite);

        // get client key
        if (TLS == testUtil.TLSCLIENTAUTH) {
            await testUtil.tlsEnroll(client, org, cpf);
            logger.debug('[queryBlockchainInfo] got user private key: org= %s', org);
        }

        testUtil.assignChannelOrdererSubmitter(channel, client, org, cpPath, TLS);

        var tmp = txCfgPtr.queryBlockOpt;
        var tgtPeers = [];
        var tgtOrg = Object.keys(tmp)[0]
        tgtPeers[tgtOrg]=[];
        for ( var j=0;  j<tmp[tgtOrg].length; j++) {
            tgtPeers[tgtOrg].push(tmp[tgtOrg][j]);
        }
        if ( tgtPeers ) {
            testUtil.assignChannelPeersSubmitter(cpList, channel, client, tgtPeers, TLS, cpPath, null, null, null, null, null);
        }
        logger.info('[queryBlockchainInfo] requested: channel:peer:start:end=%s:%s:%d:%d', channelName, tgtPeers[tgtOrg], sBlock, eBlock);

        return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(orgName)
        }).then(function (store) {
            client.setStateStore(store);
            return testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf);
        }).then((admin) => {
            logger.info('[queryBlockchainInfo] Successfully enrolled user \'admin\'');
            the_user = admin;

            return channel.initialize();
        }).then((success) => {
            logger.info('[queryBlockchainInfo] Successfully initialized channel');
            return channel.queryInfo();
        }).then((blockchainInfo) => {
            var blockHeight = blockchainInfo.height - 1;
            logger.info('[queryBlockchainInfo] channel:peer:block height=%s:%s:%d', channelName, tgtPeers[tgtOrg], blockchainInfo.height);
            if (eBlock > blockHeight) {
                logger.info('[queryBlockchainInfo] channel (%s) eBlock:block height = %d:%d', channelName, eBlock, blockHeight);
                logger.info('[queryBlockchainInfo] channel(%s) reset eBlock to block height', channelName);
                eBlock = blockHeight;
            }
            preQueryBlock(channel, sBlock, eBlock);
        }).catch((err) => {
            logger.error(err.stack ? err.stack : err);
            evtDisconnect();
            process.exit(1);
        });
    } catch (err) {
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

/**
 * stop a child process
 *
 * @param {string} proc The child process to be stopped
 * @param {string} msg The log message
 * @returns {Promise<void>}
 */
async function stopProcess(proc, msg) {
    for (let wpid in proc) {
        process.kill(wpid);
    }
    logger.info("[stopProcess] %s terminated", msg);
}

/**
 * snapshot queryinfo handler
 *
 * @param {string} org The target organization name
 * @param {string} proc The child process to be terminated
 * @returns {Promise<void>}
 */
async function snapshotHandler(org, proc) {
    const pteSnapshotPath = path.join(__dirname, 'pte-snapshot.js')
    snapshotProcess = child_process.spawn('node', [pteSnapshotPath, Nid, uiFile, PTEid]);
    snapshotPid.push(snapshotProcess.pid);
    logger.info('[pte-main:snapshotHandler] spawn off snapshot child process pid: %d', snapshotProcess.pid);
    logger.info('[pte-main:snapshotHandler] node %s %d %s %s %d', pteSnapshotPath, Nid, uiFile, PTEid);

    snapshotProcess.stdout.on('data', function (data) {
        logger.info('stdout: ' + data);
        if (data.indexOf("reach final block height:") > -1) {
            logger.info('snapshots are generated successfully, stop transaction proc');
            stopProcess(proc, 'transaction processes');
            process.exit(0);
        }
    });

    snapshotProcess.on('close', function (code) {
        logger.info('snapshotProcess closed, with code=', code);
    });

    snapshotProcess.on('exit', function (code, signal) {
        logger.info("snapshotProcess exited, with code= " + code + " and signal= " + signal);
        stopProcess(proc, 'transaction processes');
        process.exit(0);
    });
}

async function performance_main() {
    try {
        var channelConfigDone = 0;
        // set timeout for create/join/update channel and install/instantiate chaincode
        hfc.setConfigSetting('request-timeout', cfgTimeout);
        // send proposal to endorser
        for (var i = 0; i < channelOrgName.length; i++) {
            let org = channelOrgName[i];
            var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
            if (null === cpf) {
                logger.error('[performance_main] no connection profile is found for org(%s)', org);
                process.exit(1);
            }
            var cpOrgs = cpf['organizations'];

            let orgName = cpOrgs[org].name;
            logger.info('[performance_main] org= %s, org Name= %s', org, orgName);
            let client = new hfc();

            if (transType == 'INSTALL') {
                initDeploy(org);
                let username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
                let secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);
                logger.debug('[performance_main] Deploy: user= %s, secret= %s', username, secret);

                hfc.newDefaultKeyValueStore({
                    path: testUtil.storePathForOrg(Nid, orgName)
                })
                    .then((store) => {
                        client.setStateStore(store);
                        var cpf = testUtil.findOrgConnProfileSubmitter(cpList, org);
                        if (null === cpf) {
                            logger.error('[performance_main] no connection profile is found for org(%s)', org);
                            process.exit(1);
                        }
                        testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf)
                            .then(
                                function (admin) {
                                    logger.info('[performance_main:Nid=%d] Successfully enrolled user \'admin\'', Nid);
                                    the_user = admin;
                                    chaincodeInstall(client, org);
                                }).catch((err) => {
                                    logger.error('[Nid=%d] Failed to wait due to error: ', Nid, err.stack ? err.stack : err)
                                    evtDisconnect();
                                    process.exit(1);
                                }
                                );
                    }).catch((err) => {
                        logger.error('[Nid=%d] Failed to install chaincode on org(%s) to error: ', Nid, org, err.stack ? err.stack : err);
                        evtDisconnect();
                        process.exit(1);
                    });
            } else if (transType == 'INSTANTIATE') {
                initDeploy(org, transType);
                let username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
                let secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);
                logger.info('[performance_main] instantiate: user= %s, secret= %s', username, secret);

                hfc.newDefaultKeyValueStore({
                    path: testUtil.storePathForOrg(Nid, orgName)
                })
                    .then((store) => {
                        client.setStateStore(store);
                        testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf)
                            .then(
                                function (admin) {
                                    logger.info('[performance_main:Nid=%d] Successfully enrolled user \'admin\'', Nid);
                                    the_user = admin;
                                    var channel = client.newChannel(channelName);
                                    chaincodeInstantiate(channel, client, org);
                                }).catch((err) => {
                                    logger.error('[performance_main:Nid=%d] Failed to wait due to error: ', Nid, err.stack ? err.stack : err)
                                    evtDisconnect();
                                    process.exit(1)
                                }
                                );
                    }).catch((err) => {
                        logger.error(err)
                        evtDisconnect();
                        process.exit(1)
                    });
                break;

            } else if (transType == 'UPGRADE') {
                initDeploy(org, transType);
                let username = testUtil.getOrgEnrollIdSubmitter(cpf, org);
                let secret = testUtil.getOrgEnrollSecretSubmitter(cpf, org);
                logger.info('[performance_main] upgrade: user= %s, secret= %s', username, secret);

                hfc.newDefaultKeyValueStore({
                    path: testUtil.storePathForOrg(Nid, orgName)
                })
                    .then((store) => {
                        client.setStateStore(store);
                        testUtil.getSubmitter(username, secret, client, true, Nid, org, cpf)
                            .then(
                                function (admin) {
                                    logger.info('[performance_main:Nid=%d] Successfully enrolled user \'admin\'', Nid);
                                    the_user = admin;
                                    var channel = client.newChannel(channelName);
                                    chaincodeUpgrade(channel, client, org);
                                }).catch((err) => {
                                    logger.error('[performance_main:Nid=%d] Failed to wait due to error: ', Nid, err.stack ? err.stack : err)
                                    evtDisconnect();
                                    process.exit(1)
                                }
                                );
                    }).catch((err) => {
                        logger.error(err)
                        evtDisconnect();
                        process.exit(1)
                    });;
                break;
            } else if (transType == 'CHANNEL') {
                if ((channelOpt.action.toUpperCase() == 'CREATE') || (channelOpt.action.toUpperCase() == 'UPDATE')) {
                    // This will be hit for every org in the channelOpt.orgName list, but we only need to create/update channel once.
                    if (channelConfigDone == 0) {
                        logger.info('[performance_main] peer channel %s, channel name: ', channelOpt.action.toUpperCase(), channelName);
                        createOrUpdateOneChannel(client, channelOrgName);
                        channelConfigDone = 1;
                    } else {
                        logger.info('[performance_main] INFO: peer channel create/update, extra orgs listed, but only one org is required in the orgName list; channelOpt.name: ', channelName);
                    }
                } else if (channelOpt.action.toUpperCase() == 'JOIN') {
                    var channel = client.newChannel(channelName);
                    logger.info('[performance_main] peer channel join, channel name: ', channelName);
                    joinChannel(channel, client, org);
                } else {
                    logger.error('[performance_main] UNKNOWN channelOpt.action (%s); channel name: ', channelOpt.action, channelName);
                    process.exit(1)
                }
            } else if (transType == 'QUERYBLOCK') {
                var channel = client.newChannel(channelName);
                logger.info('[performance_main] channel name: ', channelName);
                queryBlockchainInfo(channel, client, org);
            } else if ((transType == 'INVOKE') || (transType == 'DISCOVERY')) {

                // spawn off processes for transactions
                getCCID();
                var nProcPerOrg = parseInt(txCfgPtr.nProcPerOrg);
                var invokeType = txCfgPtr.invokeType.toUpperCase();
                logger.info('nProcPerOrg ', nProcPerOrg);
                let output = {}
                for (var j = 0; j < nProcPerOrg; j++) {
                    output = {}
                    const pteExecPath = path.join(__dirname, 'pte-execRequest.js')
                    var workerProcess = child_process.spawn('node', [pteExecPath, j, Nid, uiFile, tStart, org, PTEid]);
                    workerPid.push(workerProcess.pid);

                    // spawn off process for snapshot
                    if ( (!snapshotProcess) && (j === 0) && (snapshot) && (snapshot.enabled) && (invokeType === 'MOVE') ) {
                        snapshotHandler(org, workerPid);
                    }

                    workerProcess.stdout.on('data', function (data) {
                        logger.debug('stdout: ' + data);
                        if (data.indexOf('pte-exec:completed') > -1) {
                            var dataStr = data.toString();
                            var tempDataArray = dataStr.split("\n");
                            for (var i = 0; i < tempDataArray.length; i++) {
                                if (tempDataArray[i].indexOf('pte-exec:completed') > -1) {
                                    testSummaryArray.push(tempDataArray[i]);
                                }
                            }


                        }
                    });

                    workerProcess.stderr.on('data', function (data) {
                        logger.info('stderr: ' + data);
                    });

                    workerProcess.on('close', function (code) {
                    });

                    workerProcess.on('exit', function (code, signal) {
                        procDone = procDone + 1;
                        logger.info("Child proc exited, procId= " + procDone + ", exit with code= " + code + " and signal= " + signal);

                        if (procDone === nProcPerOrg * channelOrgName.length) {
                            // end snapshot process if exists
                            if ( snapshotProcess ) {
                                logger.info('stop snapshot proc pid: ', snapshotPid);
                                stopProcess(snapshotPid, 'snapshot process');
                            }

                            var summaryIndex;
                            var transMode = txCfgPtr.transMode.toUpperCase();

                            var totalInvokeTrans = 0;
                            var totalInvokeTransRcvd = 0;
                            var totalInvokePeerFailures = 0;
                            var totalInvokeOrdererFailures = 0;
                            var totalInvokeEventTimeout = 0;
                            var totalInvokeEventUnreceived = 0;
                            var totalInvokeEventInvalid = 0;
                            var totalInvokeTps = 0;
                            var totalQueryTrans = 0;
                            var totalQueryFailed = 0;
                            var totalQueryReceived = 0;
                            var totalQueryTps = 0;
                            var totalInvokeTime = 0;
                            var totalQueryTime = 0;
                            var totalDiscoveryTrans = 0;
                            var totalDiscoveryTransFailures = 0;
                            var totalDiscoveryTime = 0;

                            var stmp = 0;
                            var etmp = 0;

                            for (summaryIndex in testSummaryArray) {
                                var rawText = testSummaryArray[summaryIndex].toString();
                                logger.info('Test Summary[%d]: %s', summaryIndex, rawText.substring(rawText.indexOf("[Nid")));
                                if (rawText.indexOf("execTransMode") > -1) {
                                    logger.error("ERROR occurred:" + rawText);
                                    continue;
                                };
                                if (rawText.indexOf("execModeConstant") > -1) {
                                    logger.error("ERROR occurred:" + rawText);
                                    continue;
                                };
                                if ((rawText.indexOf("postEventProc") > -1) || (rawText.indexOf("eventRegister") > -1)) {
                                    var transNum = parseInt(rawText.substring(rawText.indexOf("sent=") + 5, rawText.indexOf("(", rawText.indexOf("sent=") + 5)).trim());
                                    totalInvokeTrans = totalInvokeTrans + transNum;
                                    var transNum = parseInt(rawText.substring(rawText.indexOf("Rcvd=") + 5, rawText.indexOf("(", rawText.indexOf("Rcvd=") + 5)).trim());
                                    totalInvokeTransRcvd = totalInvokeTransRcvd + transNum;
                                    var peerFailures = parseInt(rawText.substring(rawText.indexOf("proposal failure") + 17, rawText.indexOf("(", rawText.indexOf("proposal failure") + 17)).trim());
                                    totalInvokePeerFailures = totalInvokePeerFailures + peerFailures;
                                    var ordererFailures = parseInt(rawText.substring(rawText.indexOf("tx orderer failure") + 19, rawText.indexOf("(", rawText.indexOf("tx orderer failure") + 19)).trim());
                                    totalInvokeOrdererFailures = totalInvokeOrdererFailures + ordererFailures;
                                    var eventUnreceived = parseInt(rawText.substring(rawText.indexOf("event unreceived:") + 18).trim());
                                    totalInvokeEventUnreceived = totalInvokeEventUnreceived + eventUnreceived;
                                    var eventInvalid = parseInt(rawText.substring(rawText.indexOf("event invalid:") + 15).trim());
                                    totalInvokeEventInvalid = totalInvokeEventInvalid + eventInvalid;
                                    var tempTimeoutNum = parseInt(rawText.substring(rawText.indexOf("timeout:") + 8).trim());
                                    totalInvokeEventTimeout = totalInvokeEventTimeout + tempTimeoutNum;
                                    var tempDur = parseInt(rawText.substring(rawText.indexOf(") in") + 4, rawText.indexOf("ms")).trim());
                                    totalInvokeTime = totalInvokeTime + tempDur;

                                    var tempInvokeTps = parseFloat(rawText.substring(rawText.indexOf("Throughput=") + 11, rawText.indexOf("TPS")).trim());
                                    if (tempInvokeTps > 0) {
                                        totalInvokeTps = totalInvokeTps + tempInvokeTps;
                                    }

                                    var tmp = parseInt(rawText.substring(rawText.indexOf("start") + 5, rawText.indexOf("end")).trim());
                                    var tmp1 = parseInt(rawText.substring(rawText.indexOf("end") + 3, rawText.indexOf(", #event")).trim());
                                    if (stmp == 0) {
                                        stmp = tmp;
                                    } else if (stmp > tmp) {
                                        stmp = tmp;
                                    }
                                    if (etmp == 0) {
                                        etmp = tmp1;
                                    } else if (etmp < tmp1) {
                                        etmp = tmp1;
                                    }

                                    continue;
                                };
                                if (rawText.indexOf("peer latency stats") > -1) {
                                    update_latency_array(latency_peer, rawText);
                                    logger.info("Test Summary (%s): latency_peer", chaincode_id, latency_peer);
                                }
                                if (rawText.indexOf("orderer latency stats") > -1) {
                                    update_latency_array(latency_orderer, rawText);
                                }
                                if (rawText.indexOf("event latency stats") > -1) {
                                    update_latency_array(latency_event, rawText);
                                }
                                if ((invokeType == "QUERY") && (rawText.indexOf("invoke_query_") > -1)) {
                                    var queryTransNum = parseInt(rawText.substring(rawText.indexOf("pte-exec:completed") + 18, rawText.indexOf("transaction", rawText.indexOf("pte-exec:completed") + 18)).trim());
                                    totalQueryTrans = totalQueryTrans + queryTransNum;

                                    var queryTransFailed = parseInt(rawText.substring(rawText.indexOf("with") + 4, rawText.indexOf("failures", rawText.indexOf("with") + 4)).trim());
                                    totalQueryFailed = totalQueryFailed + queryTransFailed;

                                    var queryTransRcvd = parseInt(rawText.substring(rawText.indexOf("failures") + 8, rawText.indexOf("received", rawText.indexOf("failures") + 8)).trim());
                                    totalQueryReceived = totalQueryReceived + queryTransRcvd;

                                    var tempDur = parseInt(rawText.substring(rawText.indexOf(") in") + 4, rawText.indexOf("ms")).trim());
                                    totalQueryTime = totalQueryTime + tempDur;
                                    var tempQueryTps = parseFloat(rawText.substring(rawText.indexOf("Throughput=") + 11, rawText.indexOf("TPS")).trim());
                                    if (tempQueryTps > 0) {
                                        totalQueryTps = totalQueryTps + tempQueryTps;
                                    }

                                    var tmp = parseInt(rawText.substring(rawText.indexOf("start") + 5, rawText.indexOf("end")).trim());
                                    var tmp1 = parseInt(rawText.substring(rawText.indexOf("end") + 3, rawText.indexOf(",Thr")).trim());
                                    if (stmp == 0) {
                                        stmp = tmp;
                                    } else if (stmp > tmp) {
                                        stmp = tmp;
                                    }
                                    if (etmp == 0) {
                                        etmp = tmp1;
                                    } else if (etmp < tmp1) {
                                        etmp = tmp1;
                                    }

                                    continue;
                                };
                                if (rawText.indexOf("invoke_discovery") > -1) {
                                    var transNum = parseInt(rawText.substring(rawText.indexOf("sent") + 4, rawText.indexOf("transactions")).trim());
                                    totalDiscoveryTrans = totalDiscoveryTrans + transNum;
                                    var transNumFailures = parseInt(rawText.substring(rawText.indexOf("failed") + 6, rawText.indexOf("transactions")).trim());
                                    totalDiscoveryTransFailures = totalDiscoveryTransFailures + transNumFailures;
                                    var tempDur = parseInt(rawText.substring(rawText.indexOf(") in") + 4, rawText.indexOf("ms")).trim());
                                    totalDiscoveryTime = totalDiscoveryTime + tempDur;

                                    var tmp = parseInt(rawText.substring(rawText.indexOf("start") + 5, rawText.indexOf("end")).trim());
                                    var tmp1 = parseInt(rawText.substring(rawText.indexOf("end") + 3, rawText.indexOf(",Throughput")).trim());
                                    if (stmp == 0) {
                                        stmp = tmp;
                                    } else if (stmp > tmp) {
                                        stmp = tmp;
                                    }
                                    if (etmp == 0) {
                                        etmp = tmp1;
                                    } else if (etmp < tmp1) {
                                        etmp = tmp1;
                                    }
                                    logger.info('invoke_discovery found it', totalDiscoveryTrans, totalDiscoveryTime, stmp, etmp);

                                    continue;
                                };
                            }
                            logger.info("Test Summary: Total %d Threads run completed", procDone);
                            if (totalInvokeTrans > 0) {

                                var dur = etmp - stmp;

                                // transaction output
                                var buff = "======= " + loggerMsg + " Test Summary: executed at " + sTime + " =======\n";
                                output["Test executed at"] = sTime
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "): " + transMode + " INVOKE transaction stats\n";
                                output["INVOKE transactions type"] = transMode
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTotal processes " + procDone + "\n";
                                output["Total processes"] = procDone
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTotal transactions sent " + totalInvokeTrans + "  received " + totalInvokeTransRcvd + "\n";
                                const transactions = { "sent": totalInvokeTrans, "received": totalInvokeTransRcvd }
                                output["Total transactions"] = transactions
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tfailures: proposal " + totalInvokePeerFailures + "  transactions " + totalInvokeOrdererFailures + "\n";
                                const failures = { "proposal": totalInvokePeerFailures, "transactions": totalInvokeOrdererFailures }
                                output["failures"] = failures
                                fs.appendFileSync(rptFile, buff);

                                buff = "(" + channelName + ":" + chaincode_id + "):\tevent: received " + totalInvokeTransRcvd + "  timeout " + totalInvokeEventTimeout + "  unreceived " + totalInvokeEventUnreceived + " invalid " + totalInvokeEventInvalid + "\n";
                                const events = { "received": totalInvokeTransRcvd, "timeout": totalInvokeEventTimeout, "unreceived": totalInvokeEventUnreceived, "invalid": totalInvokeEventInvalid }
                                output["event"] = events
                                fs.appendFileSync(rptFile, buff);

                                buff = "(" + channelName + ":" + chaincode_id + "):\tstart " + stmp + "  end " + etmp + "  duration " + dur + " ms \n";
                                output["start"] = stmp
                                output["end"] = etmp
                                output["duration"] = dur + " ms"
                                fs.appendFileSync(rptFile, buff);

                                if (transMode === 'LATENCY') {
                                    var iTPS = dur / totalInvokeTransRcvd;
                                    buff = "(" + channelName + ":" + chaincode_id + "):\tLatency " + iTPS.toFixed(2) + " ms \n";
                                    output["Latency"] = iTPS.toFixed(2) + " ms"
                                    fs.appendFileSync(rptFile, buff);
                                } else {
                                    var iTPS = 1000 * totalInvokeTransRcvd / dur;
                                    buff = "(" + channelName + ":" + chaincode_id + "):\tTPS " + iTPS.toFixed(2) + "\n";
                                    output["TPS"] = iTPS.toFixed(2)
                                    fs.appendFileSync(rptFile, buff);
                                }

                                // peer latency output (endorsement)
                                buff = "(" + channelName + ":" + chaincode_id + "): peer latency stats (endorsement)\n";
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\ttotal transactions: " + latency_peer[0] + "  total time: " + latency_peer[1] + " ms \n";
                                let peerLatencyStats = { "total transactions": latency_peer[0], "total time": latency_peer[1] + " ms" }
                                fs.appendFileSync(rptFile, buff);
                                if (latency_peer[0] > 0) {
                                    buff = "(" + channelName + ":" + chaincode_id + "):\tmin: " + latency_peer[2] + " ms  max: " + latency_peer[3] + " ms  avg: " + (latency_peer[1] / latency_peer[0]).toFixed(2) + " ms \n";
                                    peerLatencyStats["min"] = latency_peer[2] + " ms"
                                    peerLatencyStats["max"] = latency_peer[3] + " ms"
                                    peerLatencyStats["avg"] = (latency_peer[1] / latency_peer[0]).toFixed(2) + " ms"
                                    fs.appendFileSync(rptFile, buff);
                                }
                                output["peer latency stats (endorsement)"] = peerLatencyStats
                                // orderer latency output (transaction ack)
                                buff = "(" + channelName + ":" + chaincode_id + "): orderer latency stats (transaction ack)\n";
                                let ordererLatencyStats = {}
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\ttotal transactions: " + latency_orderer[0] + "  total time: " + latency_orderer[1] + " ms \n";
                                ordererLatencyStats = { "total transactions": latency_orderer[0], "total time": latency_orderer[1] + " ms" }
                                fs.appendFileSync(rptFile, buff);
                                if (latency_orderer[0] > 0) {
                                    buff = "(" + channelName + ":" + chaincode_id + "):\tmin: " + latency_orderer[2] + " ms  max: " + latency_orderer[3] + " ms  avg: " + (latency_orderer[1] / latency_orderer[0]).toFixed(2) + " ms \n";
                                    ordererLatencyStats["min"] = latency_orderer[2] + " ms"
                                    ordererLatencyStats["max"] = latency_orderer[3] + " ms"
                                    ordererLatencyStats["avg"] = (latency_orderer[1] / latency_orderer[0]).toFixed(2) + " ms"
                                    fs.appendFileSync(rptFile, buff);
                                }
                                output["orderer latency stats (submit tx ack/nack)"] = ordererLatencyStats
                                // event latency output (end-to-end)
                                buff = "(" + channelName + ":" + chaincode_id + "): event latency stats (end-to-end)\n";
                                let eventLatencyStats = {}
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\ttotal transactions: " + latency_event[0] + "  total time: " + latency_event[1] + " ms \n";
                                eventLatencyStats = { "total transactions": latency_event[0], "total time": latency_event[1] + " ms" }
                                fs.appendFileSync(rptFile, buff);
                                if (latency_event[0] > 0) {
                                    buff = "(" + channelName + ":" + chaincode_id + "):\tmin: " + latency_event[2] + " ms  max: " + latency_event[3] + " ms  avg: " + (latency_event[1] / latency_event[0]).toFixed(2) + " ms \n\n";
                                    eventLatencyStats["min"] = latency_event[2] + " ms"
                                    eventLatencyStats["max"] = latency_event[3] + " ms"
                                    eventLatencyStats["avg"] = (latency_event[1] / latency_event[0]).toFixed(2) + " ms"
                                    fs.appendFileSync(rptFile, buff);
                                }
                                output["event latency stats (end to end)"] = eventLatencyStats
                            }
                            if (totalQueryTrans > 0) {
                                var dur = etmp - stmp;
                                var qTPS = 1000 * (totalQueryReceived - totalQueryFailed) / dur;
                                logger.info("Aggregate Test Summary (%s):Total QUERY transaction %d received %d, start %d end %d duration is %d ms, TPS %d", chaincode_id, totalQueryTrans, totalQueryReceived, stmp, etmp, dur, qTPS.toFixed(2));

                                // query transaction output
                                var buff = "======= " + loggerMsg + " Test Summary: executed at " + sTime + " =======\n";
                                output["Test executed at"] = sTime
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "): " + transMode + " QUERY transaction stats\n";
                                output["QUERY transaction stats"] = transMode
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTotal processes " + procDone + "\n";
                                output["Total processes"] = procDone
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTotal transactions sent " + totalQueryTrans + "  received " + totalQueryReceived + "\n";
                                const totalTransactions = { "sent": totalQueryTrans, "received": totalQueryReceived }
                                output["Total transactions"] = totalTransactions
                                fs.appendFileSync(rptFile, buff);

                                buff = "(" + channelName + ":" + chaincode_id + "):\tfailures: query transactions " + totalQueryFailed + "\n";
                                fs.appendFileSync(rptFile, buff);
                                output["query transactions failed"] = totalQueryFailed
                                buff = "(" + channelName + ":" + chaincode_id + "):\tstart " + stmp + "  end " + etmp + "  duration " + dur + " ms \n";
                                output["start"] = stmp
                                output["end"] = etmp
                                output["duration"] = dur + " ms"
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTPS " + qTPS.toFixed(2) + "\n\n";
                                output["TPS"] = qTPS.toFixed(2)
                                fs.appendFileSync(rptFile, buff);
                            }
                            if (totalDiscoveryTrans > 0) {
                                var dur = etmp - stmp;
                                logger.info("Test Summary (%s):Total  DISCOVERY transaction=%d, failed=%d, duration=%d ms, total throughput=%d TPS", chaincode_id, totalDiscoveryTrans, totalDiscoveryTransFailures, dur, (totalDiscoveryTrans / dur).toFixed(2));
                                var sdTPS = 1000 * totalDiscoveryTrans / dur;
                                logger.info("Aggregate Test Summary (%s):Total DISCOVERY transaction %d, failed %d, start %d end %d duration is %d ms, TPS %d", chaincode_id, totalDiscoveryTrans, totalDiscoveryTransFailures, stmp, etmp, dur, sdTPS.toFixed(2));

                                // service discovery transaction output
                                var buff = "======= " + loggerMsg + " Test Summary: executed at " + sTime + " =======\n";
                                output["Test executed at"] = sTime
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "): " + transMode + " " + transType + " transaction stats\n";
                                output[transType + " transaction mode"] = transMode
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTotal processes " + procDone + "\n";
                                output["Total processes"] = procDone
                                fs.appendFileSync(rptFile, buff);
                                var totalDiscoveryTransReceived = totalDiscoveryTrans - totalDiscoveryTransFailures;
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTotal transactions sent " + totalDiscoveryTrans + "  received " + totalDiscoveryTransReceived + "\n";
                                const totalTransactions = { "sent": totalDiscoveryTrans, "received": totalDiscoveryTransReceived }
                                output["Total transactions"] = totalTransactions
                                fs.appendFileSync(rptFile, buff);

                                buff = "(" + channelName + ":" + chaincode_id + "):\tstart " + stmp + "  end " + etmp + "  duration " + dur + " ms \n";
                                output["start"] = stmp
                                output["end"] = etmp
                                output["duration"] = dur
                                fs.appendFileSync(rptFile, buff);
                                buff = "(" + channelName + ":" + chaincode_id + "):\tTPS " + sdTPS.toFixed(2) + "\n\n";
                                output["TPS"] = sdTPS.toFixed(2)
                                fs.appendFileSync(rptFile, buff);
                            }
                            output["channel name"] = channelName
                            output["chaincode ID"] = chaincode_id
                            logger.info('[performance_main] pte-main:completed:');
                            if ((output["Total transactions"]["sent"]) && (output["Total transactions"]["sent"] == output["Total transactions"]["received"]) && (output["Total transactions"]["sent"] != 0) && (totalInvokeEventInvalid == 0)) {
                                output["Test Result"] = "PASS"
                                logger.info('[performance_main] Test Output:', JSON.stringify(output, null, 4));
                            } else if ( invokeType == "QUERY" ) {
                                var targetPeers = txCfgPtr.targetPeers.toUpperCase();
                                var qFactor = 0;
                                if ( targetPeers === 'ORGANCHOR' ) {
                                    qFactor = channelOrgName.length;
                                } else if ( targetPeers === 'ALLANCHORS' ) {
                                    var orgList = [];
                                    orgList = testUtil.findAllOrgFromConnProfileSubmitter(cpList);
                                    qFactor = orgList.length;
                                } else if ( targetPeers === 'ORGPEERS' ) {
                                    qFactor = testUtil.getTotalPeersSubmitter(cpList, channelOrgName)
                                } else if ( targetPeers === 'ALLPEERS' ) {
                                    var orgList = [];
                                    orgList = testUtil.findAllOrgFromConnProfileSubmitter(cpList);
                                    qFactor = testUtil.getTotalPeersSubmitter(cpList, orgList)
                                } else if ( targetPeers === 'DISCOVERY' ) {
                                    qFactor = 1;
                                } else {
                                    logger.error('[performance_main] unknown targetPeers: %s',targetPeers);
                                    qFactor = 0;
                                }
                                logger.info('[performance_main] Test targetPeers: %s, qFactor: %d',targetPeers, qFactor);

                                if ( (output["Total transactions"]["sent"] != 0) && (output["Total transactions"]["received"] === qFactor * output["Total transactions"]["sent"]) ) {
                                    output["Test Result"] = "PASS";
                                    logger.info('[performance_main] Test Output:', JSON.stringify(output, null, 4));
                                } else {
                                    output["Test Result"] = "FAIL"
                                    const errMsg = '[performance_main] Test ran, but failed with errors. Exiting... \n pteReport: ' + JSON.stringify(output, null, 4)
                                    logger.error(errMsg);
                                    process.exit(1)
                                }
                            } else {
                                output["Test Result"] = "FAIL"
                                const errMsg = '[performance_main] Test ran, but failed with errors. Exiting... \n pteReport: ' + JSON.stringify(output, null, 4)
                                logger.error(errMsg);
                                process.exit(1)
                            }

                        }

                    });

                }
            } else {
                logger.error('[Nid=%d] invalid transType: %s', Nid, transType);
            }

        }
    } catch (err) {
        logger.error(err)
        evtDisconnect()
        process.exit(1)
    }
}

function readFile(path) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function evtDisconnect(eventHubs, blockCallbacks) {
    if (!eventHubs) {
        eventHubs = allEventhubs;
    }
    for (var i = 0; i < eventHubs.length; i++) {
        if (eventHubs[i] && eventHubs[i].isconnected()) {
            logger.info('[pte-main:evtDisconnect] Disconnecting the event hub: %s', eventHubs[i].getPeerAddr());
            if (blockCallbacks && blockCallbacks[i]) {
                eventHubs[i].unregisterBlockEvent(blockCallbacks[i]);
            }
            eventHubs[i].disconnect();
        }
    }
}
