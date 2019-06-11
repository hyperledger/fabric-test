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
 *      node pte-main.js <Nid> <uiFile> <tStart> <PTEid>
 *        - Nid: Network id
 *        - uiFile: user input file
 *        - tStart: tStart
 *        - PTEid: PTE id
 */
// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';


const child_process = require('child_process');

var hfc = require('fabric-client');
var fs = require('fs');
var grpc = require('grpc');
var path = require('path');
var util = require('util');

var testUtil = require('./pte-util.js');
var utils = require('fabric-common/lib/Utils.js');

hfc.setConfigSetting('crypto-keysize', 256);

var webUser = null;
var tmp;
var i=0;
var procDone=0;

// input: userinput json file
var PTEid = parseInt(process.argv[5]);
var loggerMsg='PTE ' + PTEid + ' main';
var logger = new testUtil.PTELogger({"prefix":loggerMsg, "level":"info"});

// output local time
var localTime = new Date();
logger.info('The local time is: %j', localTime.toLocaleString());

var Nid = parseInt(process.argv[2]);
var uiFile = process.argv[3];
var tStart = parseInt(process.argv[4]);
logger.info('input parameters: Nid=%d, uiFile=%s, tStart=%d PTEid=%d', Nid, uiFile, tStart, PTEid);
var uiContent = testUtil.readConfigFileSubmitter(uiFile);
logger.info('[Nid=%d pte-main] input uiContent[%s]: %j', Nid, uiFile, uiContent);

var txCfgPtr;
var txCfgTmp;
if ( typeof(uiContent.txCfgPtr) === 'undefined' ) {
    txCfgTmp = uiFile;
} else {
    txCfgTmp = uiContent.txCfgPtr;
}
txCfgPtr = testUtil.readConfigFileSubmitter(txCfgTmp);
logger.info('[Nid=%d pte-main] input txCfgPtr[%s]: %j', Nid, txCfgTmp, txCfgPtr);


var ccDfnPtr;
var ccDfnTmp;
if ( typeof(uiContent.ccDfnPtr) === 'undefined' ) {
    ccDfnTmp = uiFile;
} else {
    ccDfnTmp = uiContent.ccDfnPtr;
}
ccDfnPtr = testUtil.readConfigFileSubmitter(ccDfnTmp);
logger.info('[Nid=%d pte-main] input ccDfnPtr[%s]: %j', Nid, ccDfnTmp, ccDfnPtr);


var TLS=testUtil.setTLS(txCfgPtr);
logger.info('[Nid=%d pte-main] TLS= %d', Nid, TLS);

var channelOpt=uiContent.channelOpt;
var channelName=channelOpt.name;
var channelOrgName = [];
for (i=0; i<channelOpt.orgName.length; i++) {
    channelOrgName.push(channelOpt.orgName[i]);
}
logger.info('[Nid=%d pte-main] channelName: %s', Nid, channelName);
logger.info('[Nid=%d pte-main] channelOrgName.length: %d, channelOrgName: %s', Nid, channelOrgName.length, channelOrgName);

// get connection profiles
var cpFile;
var cpList = [];
var cpPath = uiContent.ConnProfilePath;
logger.info('[Nid=%d pte-main] cpPath: ', Nid, cpPath);
fs.readdirSync(cpPath).forEach(file => {
  console.log(file);
  var cpf=path.join(cpPath, file);
  cpList.push(cpf);
});
logger.info('[Nid=%d pte-main] cpList; ', Nid, cpList);
cpFile = cpList[0];
logger.info('[Nid=%d pte-main] cpFile; ', Nid, cpFile);

var CPFile = testUtil.readConfigFileSubmitter(cpFile, 'test-network');
var goPath=process.env.GOPATH;
if ( typeof(CPFile.gopath) === 'undefined' ) {
    goPath = '';
} else if ( CPFile.gopath == 'GOPATH') {
    goPath = process.env['GOPATH'];
} else {
    goPath = CPFile.gopath;
}
logger.info('[Nid=%d pte-main] GOPATH: ', Nid, goPath);

// get connection profile sub pointers
var cpClient = CPFile['client'];
var cpChannels = CPFile['channels'];
var cpOrgs = CPFile['organizations'];
var cpOrderers = CPFile['orderers'];
var cpPeers = CPFile['peers'];
var cpCAs = CPFile['certificateAuthorities'];
logger.info('[Nid=%d pte-main] input cpClient: %j', Nid, cpClient);
logger.info('[Nid=%d pte-main] input cpChannels: %j', Nid, cpChannels);
logger.info('[Nid=%d pte-main] input cpOrgs: %j', Nid, cpOrgs);
logger.info('[Nid=%d pte-main] input cpOrderers: %j', Nid, cpOrderers);
logger.info('[Nid=%d pte-main] input cpPeers: %j', Nid, cpPeers);
logger.info('[Nid=%d pte-main] input cpCAs: %j', Nid, cpCAs);

var ordererName = [];
for ( var key in cpOrderers) {
    ordererName.push(key);
    logger.info('[Nid=%d pte-main] cpOrderers key: ', Nid, key);
}
logger.info('[Nid=%d pte-main] cpOrderers length: %d, name: ', Nid, ordererName.length, ordererName);
if ( ordererName.length == 0 ) {
    logger.error('[Nid=%d pte-main] no orderer found in the connection profile: %s', cpFile);
    process.exit(1);
}

var users =  hfc.getConfigSetting('users');


var transType = txCfgPtr.transType.toUpperCase();
var tCurr;

// timeout option
var timeoutOpt;
var cfgTimeout=200000;   // default 200 sec
var grpcTimeout=3000;    // default 3 sec
if ((typeof( txCfgPtr.timeoutOpt ) !== 'undefined')) {
    timeoutOpt = txCfgPtr.timeoutOpt;
    logger.info('main - timeoutOpt: %j', timeoutOpt);
    if ((typeof( timeoutOpt.preConfig ) !== 'undefined')) {
        cfgTimeout = parseInt(timeoutOpt.preConfig);
    }
    if ((typeof( timeoutOpt.grpcTimeout ) !== 'undefined')) {
        grpcTimeout = parseInt(timeoutOpt.grpcTimeout);
        hfc.setConfigSetting('grpc-wait-for-ready-timeout', grpcTimeout);
    }
}
logger.info('main - cfgTimeout: %d', cfgTimeout);

// default chaincode language: golang
var language='golang';
var testDeployArgs = [];
var chaincodePath;
var metadataPath;
var collectionsConfigPath;
function initDeploy() {
    if ((typeof( ccDfnPtr.deploy.language ) !== 'undefined')) {
        language=ccDfnPtr.deploy.language.toLowerCase();
    }

    for (i=0; i<ccDfnPtr.deploy.args.length; i++) {
        testDeployArgs.push(ccDfnPtr.deploy.args[i]);
    }

    // If language is golang, then user specifies path relative to gopath.  Note: since SDK prepends
    // GOPATH/src to any golang chaincodePath, PTE will use it as defined in the json file.
    // And for other chaincode languages, if user defines goPath, then they will also specify path
    // relative to gopath.  In that case, the PTE will prepend GOPATH/src here.  Otherwise (not golang
    // and no gopath defined) PTE uses the chaincodepath exactly as specified (user should specify an
    // absolute path in the input json file).
    if (language == 'golang') {
        chaincodePath = ccDfnPtr.deploy.chaincodePath;
    } else if (goPath !== '') {
        chaincodePath = path.join(goPath, 'src', ccDfnPtr.deploy.chaincodePath);
    } else {
        chaincodePath = ccDfnPtr.deploy.chaincodePath;
    }
    logger.info('chaincode language: %s, path: %s', language, chaincodePath);

    // If user defines goPath, then they must also specify path relative to gopath in the input json file.
    // In that case, the PTE must prepend GOPATH/src here.  Otherwise PTE uses the metadataPath and
    // collectionsConfigPath exactly as specified (user should specify an absolute path) in the input json file.
    if ((typeof( ccDfnPtr.deploy.metadataPath ) !== 'undefined')) {
        if (goPath !== '') {
            metadataPath = path.join(goPath, 'src', ccDfnPtr.deploy.metadataPath);
        } else {
            metadataPath=ccDfnPtr.deploy.metadataPath;
        }
        logger.info('metadataPath: %s', metadataPath);
    }
    if ((typeof( ccDfnPtr.deploy.collectionsConfigPath ) !== 'undefined')) {
        if (goPath !== '') {
            collectionsConfigPath = path.join(goPath, 'src', ccDfnPtr.deploy.collectionsConfigPath);
        } else {
            collectionsConfigPath=ccDfnPtr.deploy.collectionsConfigPath;
        }
        logger.info('collectionsConfigPath: %s', collectionsConfigPath);
    }
}

var tx_id = null;
var nonce = null;

var the_user = null;

var cfgtxFile;
var allEventhubs = [];
var org;
var orgName;

var orderer;

var sBlock = 0;
var eBlock = 0;
var qOrg ;
var qPeer ;

var testSummaryArray=[];

function getOrgOrdererID(org) {
    var ordererID;

    if ( typeof cpOrgs[org].ordererID !== 'undefined' ) {
        ordererID = cpOrgs[org].ordererID;
    } else {
        ordererID = ordererName[0];
    }
    return ordererID;
}

function clientNewOrderer(client, org) {
    var data;

    var ordererID = getOrgOrdererID(org);

    logger.info('[clientNewOrderer] org: %s, ordererID: %s', org, ordererID);
    if (TLS > testUtil.TLSDISABLED) {
        data = testUtil.getTLSCert('orderer', ordererID, cpFile);
        if ( data !== null ) {
            let caroots = Buffer.from(data).toString();

            orderer = client.newOrderer(
                cpOrderers[ordererID].url,
                {
                    'pem': caroots,
                    'ssl-target-name-override': cpOrderers[ordererID]['grpcOptions']['ssl-target-name-override']
                }
            );
        }
    } else {
        orderer = client.newOrderer(cpOrderers[ordererID].url);
    }
    logger.info('[clientNewOrderer] orderer: %s', cpOrderers[ordererID].url);
}

function chainAddOrderer(channel, client, org) {
    logger.info('[chainAddOrderer] channel name: ', channel.getName());

    var data;
    var ordererID = getOrgOrdererID(org);

    if (TLS > testUtil.TLSDISABLED) {
        data = testUtil.getTLSCert('orderer', ordererID, cpFile);
        if ( data !== null ) {
            let caroots = Buffer.from(data).toString();

            channel.addOrderer(
                client.newOrderer(
                    cpOrderers[ordererID].url,
                    {
                        'pem': caroots,
                        'ssl-target-name-override': cpOrderers[ordererID]['grpcOptions']['ssl-target-name-override']
                    }
                )
            );
        }
    } else {
        channel.addOrderer(
            client.newOrderer(cpOrderers[ordererID].url)
        );
    }
    logger.info('[chainAddOrderer] channel orderers: %s', channel.getOrderers());
}

function channelAddPeer(channel, client, org) {
    logger.info('[channelAddPeer] channel name: ', channel.getName());
    var data;
    var peerTmp;
    var targets = [];

    for (let i=0; i < cpOrgs[org]['peers'].length; i++) {
        var key=cpOrgs[org]['peers'][i];
        if (cpPeers.hasOwnProperty(key)) {
            if (cpPeers[key].url) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(org, key, cpFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            cpPeers[key].url,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': cpPeers[key]['grpcOptions']['ssl-target-name-override']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                    }
                } else {
                    peerTmp = client.newPeer( cpPeers[key].url);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                }
            }
        }
    }
    logger.info('[channelAddPeer] channel peers: %s', channel.getPeers());

    return targets;
}

function channelAddListedPeer(channel, client, org) {
    logger.info('[Nid:chan:org=%d:%s:%s channelAddListedPeer] listOpt: %j', Nid, channel.getName(), org, txCfgPtr.listOpt);
    var peerTmp;
    var eh;
    var data;
    var listOpt=txCfgPtr.listOpt;
    var peername;
    var targets = [];
    for(var key in listOpt) {
        for (i = 0; i < listOpt[key].length; i++) {
            if (cpPeers.hasOwnProperty(listOpt[key][i])) {
                peername = listOpt[key][i];
                if (cpPeers[peername].url) {
                    if (TLS > testUtil.TLSDISABLED) {
                        data = testUtil.getTLSCert(key, peername, cpFile);
                        if ( data !== null ) {
                            peerTmp = client.newPeer(
                                cpPeers[peername].url,
                                {
                                    pem: Buffer.from(data).toString(),
                                    'ssl-target-name-override': cpPeers[peername]['grpcOptions']['ssl-target-name-override']
                                }
                            );
                            targets.push(peerTmp);
                            channel.addPeer(peerTmp);
                        }
                    } else {
                        peerTmp = client.newPeer(cpPeers[peername].url);
                        channel.addPeer(peerTmp);
                    }
                } else {
                    logger.error('[Nid:chan:org=%d:%s:%s channelAddListedPeer] cannot install cc: peer(%s:%s) incorrect peer name', Nid, channel.getName(), org, key, listOpt[key][i]);
                    process.exit(1);
                }
            } else {
                logger.error('[Nid:chan:org=%d:%s:%s channelAddListedPeer] cannot install cc: peer(%s:%s) does not exist', Nid, channel.getName(), org, key, listOpt[key][i]);
                process.exit(1);
            }
        }
    }
    logger.info('[Nid:chan:org=%d:%s:%s channelAddListedPeer] add peer: %s', Nid, channelName, org, channel.getPeers());

    return targets;
}

function channelAddQIPeer(channel, client, qorg, qpeer) {
    logger.info('[channelAddQIPeer] channel name: ', channel.getName());
    logger.info('[channelAddQIPeer] qorg %s qpeer: ', qorg,qpeer);
    var data;
    var peerTmp;
    var targets = [];

    for (let i=0; i < cpOrgs[qorg]['peers'].length; i++) {
        var key=cpOrgs[qorg]['peers'][i];
        if (cpPeers.hasOwnProperty(key)) {
            if (key.indexOf(qpeer) === 0) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(qorg, key, cpFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            cpPeers[key].url,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': cpPeers[key]['grpcOptions']['ssl-target-name-override']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                    }
                } else {
                    peerTmp = client.newPeer( cpPeers[key].url);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                }
            }
        }
    }
    logger.info('[channelAddQIPeer] channel peers: %s', channel.getPeers());

    return targets;
}

function channelAddPeer1(channel, client, org, eventHubs) {
    logger.info('[channelAddPeer1] channel name: %s, org: %s', channel.getName(), org);
    var data;
    var peerTmp;
    var targets = [];

    for (let i=0; i < cpOrgs[org]['peers'].length; i++) {
        var key=cpOrgs[org]['peers'][i];
        if (cpPeers.hasOwnProperty(key)) {
            if (cpPeers[key].url) {
                if (TLS > testUtil.TLSDISABLED) {
                    data = testUtil.getTLSCert(org, key, cpFile);
                    if ( data !== null ) {
                        peerTmp = client.newPeer(
                            cpPeers[key].url,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': cpPeers[key]['grpcOptions']['ssl-target-name-override']
                            }
                        );
                        targets.push(peerTmp);
                        channel.addPeer(peerTmp);
                        let eh = channel.newChannelEventHub(peerTmp);
                        eventHubs.push(eh);
                    }
                } else {
                    peerTmp = client.newPeer( cpPeers[key].url);
                    targets.push(peerTmp);
                    channel.addPeer(peerTmp);
                }
                break; // found first peer, as identified in the ConnProfile
            }
        }
    }
    logger.debug('[channelAddPeer1] org: %s, channel peers: %s', org, channel.getPeers());

    return targets;
}

function channelAddPeerEventJoin(channel, client, org) {
    logger.info('[channelAddPeerEventJoin] channel name: ', channel.getName());
            var data;
            var eh;
            var peerTmp;

            var targets = [];
            var eventHubs = [];

            for (let i=0; i < cpOrgs[org]['peers'].length; i++) {
                var key=cpOrgs[org]['peers'][i];
                if (cpPeers.hasOwnProperty(key)) {
                    if (cpPeers[key].url) {
                        if (TLS > testUtil.TLSDISABLED) {
                            data = testUtil.getTLSCert(org, key, cpFile);
                            if ( data !== null ) {
                                targets.push(
                                    client.newPeer(
                                        cpPeers[key].url,
                                        {
                                            pem: Buffer.from(data).toString(),
                                            'ssl-target-name-override': cpPeers[key]['grpcOptions']['ssl-target-name-override']
                                        }
                                    )
                                );
                            }
                        } else {
                            targets.push(
                                client.newPeer(
                                    cpPeers[key].url
                                )
                            );
                            logger.info('[channelAddPeerEventJoin] peer: ', cpPeers[key].url);
                        }
                    }
                }
            }

    allEventhubs = allEventhubs.concat(eventHubs);
    return { targets: targets, eventHubs: eventHubs };
}


var chaincode_id;
var chaincode_ver;
function getCCID() {
    var channelID = uiContent.channelID;
    chaincode_id = uiContent.chaincodeID+channelID;
    chaincode_ver = uiContent.chaincodeVer;
    logger.info('[getCCID] Nid: %d, chaincode_id: %s, chaincode_ver: %s', Nid, chaincode_id, chaincode_ver);
}


// output report file
var rptFile='pteReport.txt';
var sTime=new Date();

// latency output
var latency_peer=[0,0,0,0];
var latency_orderer=[0,0,0,0];
var latency_event=[0,0,0,0];
function update_latency_array(lat_new, rawText) {
    var lat_tmp=[0,0,0,0];
    lat_tmp[0]=parseInt(rawText.substring(rawText.indexOf("tx num=")+7, rawText.indexOf(", total")).trim());
    lat_tmp[1]=parseInt(rawText.substring(rawText.indexOf("total time:")+11, rawText.indexOf("ms")).trim());
    lat_tmp[2]=parseInt(rawText.substring(rawText.indexOf("min=")+4, rawText.indexOf("ms, max")).trim());
    lat_tmp[3]=parseInt(rawText.substring(rawText.indexOf("max=")+4, rawText.indexOf("ms, avg")).trim());

    lat_new[0]=lat_new[0]+lat_tmp[0];    // time
    lat_new[1]=lat_new[1]+lat_tmp[1];    // tx number
    if ( lat_new[2] == 0 ) {             // min
        lat_new[2]=lat_tmp[2];
    } else if ( lat_tmp[2] < lat_new[2] ) {
        lat_new[2]=lat_tmp[2];
    }
    if ( lat_new[3] == 0 ) {             // max
        lat_new[3]=lat_tmp[3];
    } else if ( lat_tmp[3] > lat_new[3] ) {
        lat_new[3]=lat_tmp[3];
    }

}

function getOrgEnrollId(org) {
    var orgCA=cpOrgs[org].certificateAuthorities[0];
    return cpCAs[orgCA].registrar.enrollId;
}

function getOrgEnrollSecret(org) {
    var orgCA=cpOrgs[org].certificateAuthorities[0];
    return cpCAs[orgCA].registrar.enrollSecret;
}

// test begins ....
performance_main();

// install chaincode
async function chaincodeInstall(channel, client, org) {
    try{
    var orgName = cpOrgs[org].name;
    logger.info('[chaincodeInstall] org: %s, org Name: %s, channel name: %s', org, orgName, channel.getName());

    var cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(Nid, orgName)}));
    client.setCryptoSuite(cryptoSuite);

    // get client key
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, org, cpFile);
        logger.info('[chaincodeInstall] got user private key: org= %s', org);
    }
    chainAddOrderer(channel, client, org);

    var targets;
    if ( (typeof(txCfgPtr.targetPeers) !== 'undefined') && (txCfgPtr.targetPeers.toUpperCase() == 'LIST') ) {
        if ( typeof(txCfgPtr.listOpt) == 'undefined' ) {
            logger.error('[Nid:chan:org=%d:%s:%s chaincodeInstall] listOpt undefined', Nid, channel.getName(), org);
            process.exit(1);
        }
        targets = channelAddListedPeer(channel, client, org);
    } else {
        targets = channelAddPeer(channel, client, org);
    }

    //sendInstallProposal
    getCCID();
    var request_install = {
        targets: targets,
        chaincodePath: chaincodePath,
        metadataPath: metadataPath,
        chaincodeId: chaincode_id,
        chaincodeType: language,
        chaincodeVersion: chaincode_ver
    };

    //logger.info('request_install: %j', request_install);

    client.installChaincode(request_install)
        .then(
            function(results) {
                var proposalResponses = results[0];
                var proposal = results[1];
                var header   = results[2];
                var all_good = true;
                for(var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                        one_good = true;
                        logger.info('[chaincodeInstall] org(%s): install proposal was good', org);
                    } else {
                        logger.error('[chaincodeInstall] org(%s): install proposal was bad', org);
                    }
                    all_good = all_good & one_good;
                }
                if (all_good) {
                    logger.info(util.format('[chaincodeInstall] Successfully sent install Proposal to peers in (%s:%s) and received ProposalResponse: Status - %s', channelName, orgName, proposalResponses[0].response.status));
                    evtDisconnect();
                } else {
                    throw new Error('[chaincodeInstall] Failed to send install Proposal in (%s:%s) or receive valid response. Response null or status is not 200. exiting...', channelName, orgName);
                }

            }).catch((err) => {
                logger.error('[chaincodeInstall] Failed to install chaincode in (%s:%s) due to error: ', channelName, orgName, err);
                evtDisconnect();
                process.exit(1);

            });
        }catch(err){
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

    if(upgrade) {
        // use this call to test the transient map support during chaincode instantiation
        request.transientMap = transientMap;
    }

    return request;
}

//instantiate chaincode
async function chaincodeInstantiate(channel, client, org) {
    try{
    var eventHubs = [];
    var cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(Nid, orgName)}));
    client.setCryptoSuite(cryptoSuite);

    logger.info('[chaincodeInstantiate] org= %s, org name=%s, channel name=%s', org, orgName, channel.getName());

    // get client key
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, org, cpFile);
        logger.info('[chaincodeInstantiate] get user private key: org= %s', org);
    }
    chainAddOrderer(channel, client, org);

    var ivar=0
    for (ivar=0; ivar<channelOrgName.length; ivar++ ) {
        var orgInstantiate = channelOrgName[ivar];
        channelAddPeer1(channel, client, orgInstantiate, eventHubs);
    }

    logger.info('[chaincodeInstantiate:Nid=%d] ready to initialize channel[%s]', Nid, channel.getName());

    channel.initialize()
        .then((success) => {
            logger.info('[chaincodeInstantiate:Nid=%d] Successfully initialize channel[%s]', Nid, channel.getName());
            var upgrade = false;

            var badTransientMap = { 'test1': 'transientValue' }; // have a different key than what the chaincode example_cc1.go expects in Init()
            var transientMap = { 'test': 'transientValue' };
            var request = buildChaincodeProposal(client, the_user, language, upgrade, badTransientMap);
            tx_id = request.txId;

            // sendInstantiateProposal
            //logger.info('request_instantiate: ', request);
            return channel.sendInstantiateProposal(request, cfgTimeout);
        })
        .then(
            function(results) {
                var proposalResponses = results[0];
                var proposal = results[1];
                var header   = results[2];
                var all_good = true;
                for(var i in proposalResponses) {
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
                                var tCurr1=new Date().getTime();
                                clearTimeout(handle);
                                eh.unregisterTxEvent(deployId);

                                if (code !== 'VALID') {
                                    logger.error('[chaincodeInstantiate] The chaincode instantiate transaction was invalid, code = ' + code);
                                    reject();
                                } else {
                                    logger.info('[chaincodeInstantiate] The chaincode instantiate transaction was valid.');
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
                        logger.info('[chaincodeInstantiate] register eventhub %s with tx=%s', eh.getPeerAddr(),deployId);
                        eventPromises.push(txPromise);
                    });

                    var tCurr=new Date().getTime();
                    logger.info('[chaincodeInstantiate] Promise.all tCurr=%d', tCurr);
                    return Promise.all(eventPromises)

                        .then((results) => {

                            logger.info('[chaincodeInstantiate] Event promise all complete and testing complete');
                            return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
                        }).catch((err) => {
                            var tCurr1=new Date().getTime();
                            logger.error('[chaincodeInstantiate] failed to send instantiate transaction: tCurr=%d, elapse time=%d', tCurr, tCurr1-tCurr);
                            //logger.error('Failed to send instantiate transaction and get notifications within the timeout period.');
                            evtDisconnect();
                            process.exit(1);
                        });
                } else {
                    logger.error('[chaincodeInstantiate] Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
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
                throw new Error('[chaincodeInstantiate(Nid=%d)] Failed to instantiate transaction on %s. Error code: ', Nid, channelName, response.status);
            }
        }).catch((err) => {
            logger.error('[chaincodeInstantiate(Nid=%d)] Failed to instantiate transaction on %s due to error: ', Nid, channelName, err.stack ? err.stack : err);
            evtDisconnect();
            process.exit(1);
        }
        );
    }catch(err){
        logger.error(err)
        evtDisconnect();
        process.exit(1)
    }
}

//Upgrade chaincode
async function chaincodeUpgrade(channel, client, org) {
    try{
    var eventHubs = [];
    var cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(Nid, orgName)}));
    client.setCryptoSuite(cryptoSuite);
    logger.info('[chaincodeUpgrade] org= %s, org name=%s, channel name=%s', org, orgName, channel.getName());

    // get client key
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, org, cpFile);
        logger.info('[chaincodeUpgrade] get user private key: org= %s', org);
    }
    chainAddOrderer(channel, client, org);

    var ivar=0
    for (ivar=0; ivar<channelOrgName.length; ivar++ ) {
        var orgInstantiate = channelOrgName[ivar];
        channelAddPeer1(channel, client, orgInstantiate, eventHubs);
    }

    logger.info('[chaincodeUpgrade:Nid=%d] ready to initialize channel[%s]', Nid, channel.getName());

    channel.initialize()
        .then((success) => {
            logger.info('[chaincodeUpgrade:Nid=%d] Successfully initialize channel[%s]', Nid, channel.getName());
            var upgrade = true;

            var badTransientMap = { 'test1': 'transientValue' }; // have a different key than what the chaincode example_cc1.go expects in Init()
            var transientMap = { 'test': 'transientValue' };
            var request = buildChaincodeProposal(client, the_user, language, upgrade, badTransientMap);
            tx_id = request.txId;

            return channel.sendUpgradeProposal(request, cfgTimeout);
        })
        .then(
            function(results) {
                var proposalResponses = results[0];
                var proposal = results[1];
                var header   = results[2];
                var all_good = true;
                for(var i in proposalResponses) {
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
                                var tCurr1=new Date().getTime();
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
                        logger.info('[chaincodeUpgrade] register eventhub %s with tx=%s', eh.getPeerAddr(),deployId);
                        eventPromises.push(txPromise);
                    });

                    var tCurr=new Date().getTime();
                    logger.info('[chaincodeUpgrade] Promise.all tCurr=%d', tCurr);
                    return Promise.all(eventPromises)

                        .then((results) => {

                            logger.info('[chaincodeUpgrade] Event promise all complete and testing complete');
                            return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
                        }).catch((err) => {
                            var tCurr1=new Date().getTime();
                            logger.error('[chaincodeUpgrade] failed to send upgrade transaction: tCurr=%d, elapse time=%d', tCurr, tCurr1-tCurr);
                            evtDisconnect();
                            process.exit(1);
                        });
                } else {
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
                logger.error('[chaincodeUpgrade(Nid=%d)] Failed to Upgrade transaction on %s. Error code: ', Nid, channelName, response.status);
                evtDisconnect();
                process.exit(1);
            }

        }).catch((err) => {
            logger.error('[chaincodeUpgrade(Nid=%d)] Failed to upgrade transaction on %s due to error: ', Nid, channelName, err.stack ? err.stack : err);
            evtDisconnect();
            process.exit(1);
        }
        );

    }catch(err){
        logger.error(err)
        evtDisconnect();
        process.exit(1);
    }
}

function readAllFiles(dir) {
    var files = fs.readdirSync(dir);
    var certs = [];
    files.forEach((file_name) => {
        let file_path = path.resolve(dir,file_name);
        logger.info('[readAllFiles] looking at file ::'+file_path);
        let data = fs.readFileSync(file_path);
        certs.push(data);
    });
    return certs;
}

//create or update channel
async function createOrUpdateOneChannel(client, channelOrgName) {
 try{
    var config;
    var envelope_bytes;
    var signatures = [];
    var key;

    var username ;
    var secret;
    var submitter = null;

    hfc.setConfigSetting('key-value-store', 'fabric-common/lib/impl/FileKeyValueStore.js');

    // If user defines goPath, then they must also specify path relative to gopath in the input json file.
    // In that case, the PTE must prepend GOPATH/src here.  Otherwise PTE uses the channelTX exactly as
    // specified (user should specify an absolute path) in the input json file.
    var channelTX=channelOpt.channelTX;
    if ( goPath !== '' ) {
        channelTX = path.join(goPath, 'src', channelOpt.channelTX);
    }
    logger.info('[createOrUpdateOneChannel] channelTX: ', channelTX);
    envelope_bytes = fs.readFileSync(channelTX);
    config = client.extractChannelConfig(envelope_bytes);
    logger.info('[createOrUpdateOneChannel] Successfully extracted the config update from the configtx envelope: ', channelTX);

    // get client key
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, channelOrgName[0], cpFile);
        logger.info('[createOrUpdateOneChannel] get user private key: org= %s', channelOrgName[0]);
    }
    //clientNewOrderer(client, channelOrgName[0]);

    hfc.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(Nid, orgName)
    }).then((store) => {


        client.setStateStore(store);
        var cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(org)}));
        client.setCryptoSuite(cryptoSuite);

        var submitePromises= [];
        channelOrgName.forEach((org) => {
            submitter = new Promise(function (resolve,reject) {
                username=getOrgEnrollId(org);
                secret=getOrgEnrollSecret(org);
                orgName = cpOrgs[org].name;
                logger.info('[createOrUpdateOneChannel] org= %s, org name= %s', org, orgName);
                logger.info('[createOrUpdateOneChannel] org= %s, org name= %s, username= %s, secret= %s', org, orgName, username, secret);
                client._userContext = null;
                resolve(testUtil.getSubmitter(username, secret, client, true, Nid, org, cpFile));
            });
            submitePromises.push(submitter);
        });
        // all the orgs
        return Promise.all(submitePromises);
    })
        .then((results) => {
            results.forEach(function(result){
                var signature = client.signChannelConfig(config);
                logger.info('[createOrUpdateOneChannel] Successfully signed config update for one organization ');
                // collect signature from org admin
                signatures.push(signature);
            });
            return signatures;
        }).then((sigs) =>{
            client._userContext = null;
            return testUtil.getOrderAdminSubmitter(client, channelOrgName[0], cpFile);
        }).then((admin) => {
            the_user = admin;
            logger.info('[createOrUpdateOneChannel] Successfully enrolled user \'admin\' for', "orderer");
            var signature = client.signChannelConfig(config);
            logger.info('[createOrUpdateOneChannel] Successfully signed config update: ', "orderer");
            // collect signature from org admin
            signatures.push(signature);

            logger.info('[createOrUpdateOneChannel] done signing: %s', channelName);
            // add new orderer
            clientNewOrderer(client, channelOrgName[0]);
            // build up the create request
            let tx_id = client.newTransactionID();
            let nonce = tx_id.getNonce();
            var request = {
                config: config,
                signatures : signatures,
                name : channelName,
                orderer : orderer,
                txId  : tx_id,
                nonce : nonce
            };
            //logger.info('request: ',request);
            if (channelOpt.action.toUpperCase() == 'CREATE') {
                return client.createChannel(request);
            } else if (channelOpt.action.toUpperCase() == 'UPDATE') {
                return client.updateChannel(request);
            }
        }).then((result) => {
            logger.info('[createOrUpdateOneChannel] Successfully created/updated the channel (%s).', channelName);
            evtDisconnect();
            process.exit();
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
    }catch(err){
        logger.error(err)
        evtDisconnect()
        process.exit(1)
    }
}

// join channel
async function joinChannel(channel, client, org) {
    try{
    var orgName = cpOrgs[org].name;
    logger.info('[joinChannel] Calling peers in organization (%s) to join the channel (%s)', orgName, channelName);
    var username = getOrgEnrollId(org);
    var secret = getOrgEnrollSecret(org);
    logger.info('[joinChannel] user=%s, secret=%s', username, secret);
    var genesis_block = null;
    var eventHubs = [];
    var blockCallbacks = [];

    // get client key
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, org, cpFile);
        logger.info('[joinChannel] get user private key: org= %s', org);
    }


    return hfc.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(Nid, orgName)
    }).then((store) => {
        client.setStateStore(store);
        client._userContext = null;
        return testUtil.getOrderAdminSubmitter(client, org, cpFile)
    }).then((admin) => {
        logger.info('[joinChannel:%s] Successfully enrolled orderer \'admin\'', org);
        the_user = admin;
        logger.debug('[joinChannel] orderer admin: ', admin);

        // add orderers
        chainAddOrderer(channel, client, org);

        tx_id = client.newTransactionID();
        var request = {
            txId :  tx_id
        };
        return channel.getGenesisBlock(request);
    }).then((block) =>{
        logger.info('[joinChannel:org=%s:%s] Successfully got the genesis block', channelName, org);
        genesis_block = block;

        client._userContext = null;
        return testUtil.getSubmitter(username, secret, client, true, Nid, org, cpFile);
    }).then((admin) => {
        logger.info('[joinChannel] Successfully enrolled org:' + org + ' \'admin\'');
        the_user = admin;
        logger.debug('[joinChannel] org admin: ', admin);

        // add peers and events
        var targeteh = channelAddPeerEventJoin(channel, client, org);
        eventHubs = targeteh.eventHubs;
        var targets = targeteh.targets;

        var eventPromises = [];

        tx_id = client.newTransactionID();
        let request = {
            targets : targets,
            block : genesis_block,
            txId :  tx_id
        };

        return channel.joinChannel(request);
    })
        .then((results) => {
            logger.info(util.format('[joinChannel:%s] join Channel R E S P O N S E : %j', org, results));

            if(results[0] && results[0].response && results[0].response.status == 200) {
                logger.info('[joinChannel] Successfully joined peers in (%s:%s)', channelName, orgName);
                evtDisconnect(eventHubs, blockCallbacks);
            } else {
                evtDisconnect(eventHubs, blockCallbacks);
                throw new Error('[joinChannel] Failed to join channel');
            }
        }).catch((err) => {
            logger.error('[joinChannel] --- Failed to join channel due to error: ' + err.stack ? err.stack : err);
            evtDisconnect(eventHubs, blockCallbacks);
            process.exit(1);
        });
    }catch(err){
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

function joinOneChannel(channel, client, org) {
    logger.info('[joinOneChannel] org: ', org);

    joinChannel(channel, client, org)
        .then(() => {
            logger.info('[joinOneChannel] Successfully joined peers in organization %s to join the channel %s', cpOrgs[org].name, channelName);
            process.exit();
        })
        .catch(function(err) {
            logger.error('[joinOneChannel] Failed to join channel: ' + err);
            process.exit(1);
        });

}


var totalLength=0;
async function execQueryBlock(channel, sB, eB) {
    try{
    var qBlks = [];
    for (i = sB; i <= eB; i++) {
        qBlks.push(parseInt(i));
    }

    var qPromises = [];
    var qb = null;
    var qi = 0;
    qBlks.forEach((qi) => {
        qb = new Promise(function(resolve, reject) {
            resolve(channel.queryBlock(qi));
        });
        qPromises.push(qb);
    });
    return Promise.all(qPromises).then((block) => {
        block.forEach(function(block){

            totalLength = totalLength + block.data.data.length;
            logger.info('[execQueryBlock] block:Length:accu length= %d:%d:%d', block.header.number, block.data.data.length, totalLength);
        });
        logger.info('[execQueryBlock] blocks= %d:%d, totalLength= %j', sBlock, eB, totalLength);

    }).catch((err) => {
        logger.error(err.stack ? err.stack : err);
        evtDisconnect();
        process.exit(1);
    });
    }catch(err){
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

async function preQueryBlock(channel, sB, eB) {
    try {
        logger.info('[preQueryBlock] sB:eB= %d:%d', sB, eB);
        while ( eBlock >= sB ) {
            var tB = eBlock - sB;
            if ( tB > 100 ) {
                eB = parseInt(sB) + 100 - 1;
            } else {
                eB=eBlock;
            }

            logger.info('[preQueryBlock] starting Block:ending Block= %d:%d', sB, eB);
            await execQueryBlock(channel, sB, eB);
            sB=eB+1;
        }
    } catch (err) {
        throw new Error(err.stack ? err.stack : err);
    }
}

async function queryBlockchainInfo(channel, client, org) {
try{
    logger.info('[queryBlockchainInfo] channel (%s)', channelName);
    var username = getOrgEnrollId(org);
    var secret = getOrgEnrollSecret(org);
    //logger.info('[queryBlockchainInfo] user=%s, secret=%s', username, secret);
    sBlock = txCfgPtr.queryBlockOpt.startBlock;
    eBlock = txCfgPtr.queryBlockOpt.endBlock;
    qOrg = txCfgPtr.queryBlockOpt.org;
    qPeer = txCfgPtr.queryBlockOpt.peer;
    logger.info('[queryBlockchainInfo] query block info org:peer:start:end=%s:%s:%d:%d', qOrg, qPeer, sBlock, eBlock);

    hfc.setConfigSetting('key-value-store','fabric-common/lib/impl/FileKeyValueStore.js');
    var cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: testUtil.storePathForOrg(Nid, orgName)}));
    client.setCryptoSuite(cryptoSuite);

    // get client key
    if ( TLS == testUtil.TLSCLIENTAUTH ) {
        await testUtil.tlsEnroll(client, org, cpFile);
        logger.info('[queryBlockchainInfo] got user private key: org= %s', org);
    }

    chainAddOrderer(channel, client, org);

    channelAddQIPeer(channel, client, qOrg, qPeer);

    return hfc.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(orgName)
    }).then( function (store) {
        client.setStateStore(store);
        return testUtil.getSubmitter(username, secret, client, true, Nid, org, cpFile);
    }).then((admin) => {
        logger.info('[queryBlockchainInfo] Successfully enrolled user \'admin\'');
        the_user = admin;

        return channel.initialize();
    }).then((success) => {
        logger.info('[queryBlockchainInfo] Successfully initialized channel');
        return channel.queryInfo();
    }).then((blockchainInfo) => {
        var blockHeight = blockchainInfo.height - 1;
        logger.info('[queryBlockchainInfo] Channel queryInfo() returned block height=' + blockchainInfo.height);
        if ( eBlock > blockHeight ) {
            logger.info('[queryBlockchainInfo] eBlock:block height = %d:%d', eBlock, blockHeight);
            logger.info('[queryBlockchainInfo] reset eBlock to block height');
            eBlock = blockHeight;
        }

        preQueryBlock(channel, sBlock, eBlock);

    }).catch((err) => {
        logger.error(err.stack ? err.stack : err);
        evtDisconnect();
        process.exit(1);
    });
    }catch(err){
        logger.error(err);
        evtDisconnect();
        process.exit(1);
    }
}

async function performance_main() {
    try{
    var channelConfigDone = 0;
    // set timeout for create/join/update channel and install/instantiate chaincode
    hfc.setConfigSetting('request-timeout', cfgTimeout);
    // send proposal to endorser
    for (var i=0; i<channelOrgName.length; i++ ) {
        let org = channelOrgName[i];
        let orgName=cpOrgs[org].name;
        logger.info('[performance_main] org= %s, org Name= %s', org, orgName);
        let client = new hfc();

        if ( transType == 'INSTALL' ) {
            initDeploy();
            let username = getOrgEnrollId(org);
            let secret = getOrgEnrollSecret(org);
            logger.info('[performance_main] Deploy: user= %s, secret= %s', username, secret);

            hfc.newDefaultKeyValueStore({
                path: testUtil.storePathForOrg(Nid, orgName)
            })
                .then((store) => {
                    client.setStateStore(store);
                    testUtil.getSubmitter(username, secret, client, true, Nid, org, cpFile)
                        .then(
                            function(admin) {
                                logger.info('[performance_main:Nid=%d] Successfully enrolled user \'admin\'', Nid);
                                the_user = admin;
                                var channel = client.newChannel(channelName);
                                chaincodeInstall(channel, client, org);
                            }).catch((err)=>{
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
        } else if ( transType == 'INSTANTIATE' ) {
            initDeploy();
            let username = getOrgEnrollId(org);
            let secret = getOrgEnrollSecret(org);
            logger.info('[performance_main] instantiate: user= %s, secret= %s', username, secret);

            hfc.newDefaultKeyValueStore({
                path: testUtil.storePathForOrg(Nid, orgName)
            })
                .then((store) => {
                    client.setStateStore(store);
                    testUtil.getSubmitter(username, secret, client, true, Nid, org, cpFile)
                        .then(
                            function(admin) {
                                logger.info('[performance_main:Nid=%d] Successfully enrolled user \'admin\'', Nid);
                                the_user = admin;
                                var channel = client.newChannel(channelName);
                                chaincodeInstantiate(channel, client, org);
                            }).catch((err)=>{
                                logger.error('[performance_main:Nid=%d] Failed to wait due to error: ', Nid, err.stack ? err.stack : err)
                                evtDisconnect();
                                process.exit(1)
                            }
                        );
                }).catch((err)=>{
                    logger.error(err)
                    evtDisconnect();
                    process.exit(1)
                });
            break;

        } else if ( transType == 'UPGRADE' ) {
            initDeploy();
            var username=getOrgEnrollId(org);
            var secret=getOrgEnrollSecret(org);
            logger.info('[performance_main] upgrade: user= %s, secret= %s', username, secret);

            hfc.newDefaultKeyValueStore({
                path: testUtil.storePathForOrg(Nid, orgName)
            })
                .then((store) => {
                    client.setStateStore(store);
                    testUtil.getSubmitter(username, secret, client, true, Nid, org, cpFile)
                        .then(
                            function(admin) {
                                logger.info('[performance_main:Nid=%d] Successfully enrolled user \'admin\'', Nid);
                                the_user = admin;
                                var channel = client.newChannel(channelName);
                                chaincodeUpgrade(channel, client, org);
                            }).catch((err)=>{
                                logger.error('[performance_main:Nid=%d] Failed to wait due to error: ', Nid, err.stack ? err.stack : err)
                                evtDisconnect();
                                process.exit(1)
                            }
                        );
                }).catch((err)=>{
                    logger.error(err)
                    evtDisconnect();
                    process.exit(1)
                });;
            break;
        } else if ( transType == 'CHANNEL' ) {
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
                logger.info('[performance_main] UNKNOWN channelOpt.action (%s); channel name: ', channelOpt.action, channelName);
            }
        } else if ( transType == 'QUERYBLOCK' ) {
            var channel = client.newChannel(channelName);
            logger.info('[performance_main] channel name: ', channelName);
            queryBlockchainInfo(channel, client, org);
        } else if ( (transType == 'INVOKE') || (transType == 'DISCOVERY') ) {
            // spawn off processes for transactions
            getCCID();
            var nProcPerOrg = parseInt(txCfgPtr.nProcPerOrg);
            var invokeType = txCfgPtr.invokeType.toUpperCase();
            logger.info('nProcPerOrg ', nProcPerOrg);
            for (var j = 0; j < nProcPerOrg; j++) {
                var workerProcess = child_process.spawn('node', ['./pte-execRequest.js', j, Nid, uiFile, tStart, org, PTEid]);

                workerProcess.stdout.on('data', function (data) {
                    logger.info('stdout: ' + data);
                    if (data.indexOf('pte-exec:completed') > -1) {
                        var dataStr=data.toString();
                        var tempDataArray =dataStr.split("\n");
                        for (var i=0; i<tempDataArray.length;i++) {
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
                    procDone = procDone+1;
                    logger.info("Child proc exited, procId= " + procDone + ", exit with code= " + code + " and signal= " + signal);

                    if ( procDone === nProcPerOrg*channelOrgName.length ) {

                        var summaryIndex;
                        var transMode=txCfgPtr.transMode.toUpperCase();

                        var totalInvokeTrans=0;
                        var totalInvokeTransRcvd=0;
                        var totalInvokePeerFailures=0;
                        var totalInvokeOrdererFailures=0;
                        var totalInvokeEventTimeout=0;
                        var totalInvokeEventUnreceived=0;
                        var totalInvokeTps=0;
                        var totalQueryTrans=0;
                        var totalQueryFailed=0;
                        var totalQueryReceived=0;
                        var totalQueryTps=0;
                        var totalInvokeTime=0;
                        var totalQueryTime=0;
                        var totalMixedTPS=0;
                        var totalMixedTime=0;
                        var totalMixedInvoke=0;
                        var totalMixedQuery=0;
                        var totalDiscoveryTrans=0;
                        var totalDiscoveryTransFailures=0;
                        var totalDiscoveryTime=0;

                        var stmp=0;
                        var etmp=0;

                        for (summaryIndex in testSummaryArray ) {
                            var rawText=testSummaryArray[summaryIndex].toString();
                            logger.info('Test Summary[%d]: %s',summaryIndex, rawText.substring(rawText.indexOf("[Nid")));
                            if (rawText.indexOf("execTransMode")>-1) {
                                logger.info("ERROR occurred:" +rawText);
                                continue;
                            };
                            if (rawText.indexOf("execModeConstant")>-1) {
                                logger.info("ERROR occurred:" +rawText);
                                continue;
                            };
                            if ( (rawText.indexOf("postEventProc")>-1 ) || (rawText.indexOf("eventRegister")>-1) ) {
                                var transNum= parseInt(rawText.substring(rawText.indexOf("sent=")+5,rawText.indexOf("(",rawText.indexOf("sent=")+5)).trim());
                                totalInvokeTrans=totalInvokeTrans+transNum;
                                var transNum= parseInt(rawText.substring(rawText.indexOf("Rcvd=")+5,rawText.indexOf("(",rawText.indexOf("Rcvd=")+5)).trim());
                                totalInvokeTransRcvd=totalInvokeTransRcvd+transNum;
                                var peerFailures=parseInt(rawText.substring(rawText.indexOf("proposal failure")+17,rawText.indexOf("(",rawText.indexOf("proposal failure")+17)).trim());
                                totalInvokePeerFailures=totalInvokePeerFailures+peerFailures;
                                var ordererFailures=parseInt(rawText.substring(rawText.indexOf("tx orderer failure")+19,rawText.indexOf("(",rawText.indexOf("tx orderer failure")+19)).trim());
                                totalInvokeOrdererFailures=totalInvokeOrdererFailures+ordererFailures;
                                var eventUnreived=parseInt(rawText.substring(rawText.indexOf("event unreceived:")+18).trim());
                                totalInvokeEventUnreceived=totalInvokeEventUnreceived+eventUnreived;
                                var tempTimeoutNum=parseInt(rawText.substring(rawText.indexOf("timeout:")+8).trim());
                                totalInvokeEventTimeout=totalInvokeEventTimeout+tempTimeoutNum;
                                var tempDur=parseInt(rawText.substring(rawText.indexOf(") in")+4,rawText.indexOf("ms")).trim());
                                totalInvokeTime=totalInvokeTime+tempDur;

                                var tempInvokeTps=parseFloat(rawText.substring(rawText.indexOf("Throughput=")+11,rawText.indexOf("TPS")).trim());
                                if (tempInvokeTps >0 ) {
                                    totalInvokeTps =totalInvokeTps+tempInvokeTps;
                                }

                                var tmp=parseInt(rawText.substring(rawText.indexOf("start")+5, rawText.indexOf("end")).trim());
                                var tmp1=parseInt(rawText.substring(rawText.indexOf("end")+3, rawText.indexOf(", #event")).trim());
                                if ( stmp == 0 ) {
                                    stmp = tmp;
                                } else if ( stmp > tmp ) {
                                    stmp = tmp;
                                }
                                if ( etmp == 0 ) {
                                    etmp = tmp1;
                                } else if ( etmp < tmp1 ) {
                                    etmp = tmp1;
                                }

                                continue;
                            };
                            if (rawText.indexOf("peer latency stats")>-1) {
                                update_latency_array(latency_peer, rawText);
                                logger.info("Test Summary (%s): latency_peer", chaincode_id, latency_peer);
                            }
                            if (rawText.indexOf("orderer latency stats")>-1) {
                                update_latency_array(latency_orderer, rawText);
                            }
                            if (rawText.indexOf("event latency stats")>-1) {
                                update_latency_array(latency_event, rawText);
                            }
                            if (rawText.indexOf("invoke_query_mix")>-1) {
                                var mixedTransNum= parseInt(rawText.substring(rawText.indexOf("pte-exec:completed")+18,rawText.indexOf("Invoke(move)")).trim());
                                totalMixedInvoke=totalMixedInvoke+mixedTransNum;
                                var mixedQueryNum=parseInt(rawText.substring(rawText.indexOf("and")+3, rawText.indexOf("Invoke(query)")).trim());
                                totalMixedQuery=totalMixedQuery+mixedQueryNum;
                                var tempDur=parseInt(rawText.substring(rawText.indexOf(") in")+4,rawText.indexOf("ms")).trim());
                                totalMixedTime=totalMixedTime+tempDur;
                                var tempMixedTps=parseFloat(rawText.substring(rawText.indexOf("Throughput=")+11,rawText.indexOf("TPS")).trim());
                                if (tempMixedTps >0 ) {
                                    totalMixedTPS =totalMixedTPS+tempMixedTps;
                                }

                                var tmp=parseInt(rawText.substring(rawText.indexOf("start")+5, rawText.indexOf("end")).trim());
                                var tmp1=parseInt(rawText.substring(rawText.indexOf("end")+3, rawText.indexOf(",Thr")).trim());
                                if ( stmp == 0 ) {
                                    stmp = tmp;
                                } else if ( stmp > tmp ) {
                                    stmp = tmp;
                                }
                                if ( etmp == 0 ) {
                                    etmp = tmp1;
                                } else if ( etmp < tmp1 ) {
                                    etmp = tmp1;
                                }

                                continue;
                            };
                            if ( (invokeType == "QUERY") && (rawText.indexOf("invoke_query_")>-1) ) {
                                var queryTransNum= parseInt(rawText.substring(rawText.indexOf("pte-exec:completed")+18,rawText.indexOf("transaction",rawText.indexOf("pte-exec:completed")+18)).trim());
                                totalQueryTrans=totalQueryTrans+queryTransNum;

                                var queryTransFailed= parseInt(rawText.substring(rawText.indexOf("with")+4,rawText.indexOf("failures",rawText.indexOf("with")+4)).trim());
                                totalQueryFailed=totalQueryFailed+queryTransFailed;

                                var queryTransRcvd= parseInt(rawText.substring(rawText.indexOf("failures")+8,rawText.indexOf("received",rawText.indexOf("failures")+8)).trim());
                                totalQueryReceived=totalQueryReceived+queryTransRcvd;

                                var tempDur=parseInt(rawText.substring(rawText.indexOf(") in")+4,rawText.indexOf("ms")).trim());
                                totalQueryTime=totalQueryTime+tempDur;
                                var tempQueryTps=parseFloat(rawText.substring(rawText.indexOf("Throughput=")+11,rawText.indexOf("TPS")).trim());
                                if (tempQueryTps >0 ) {
                                    totalQueryTps =totalQueryTps+tempQueryTps;
                                }

                                var tmp=parseInt(rawText.substring(rawText.indexOf("start")+5, rawText.indexOf("end")).trim());
                                var tmp1=parseInt(rawText.substring(rawText.indexOf("end")+3, rawText.indexOf(",Thr")).trim());
                                if ( stmp == 0 ) {
                                    stmp = tmp;
                                } else if ( stmp > tmp ) {
                                    stmp = tmp;
                                }
                                if ( etmp == 0 ) {
                                    etmp = tmp1;
                                } else if ( etmp < tmp1 ) {
                                    etmp = tmp1;
                                }

                                continue;
                            };
                            if (rawText.indexOf("invoke_discovery")>-1) {
                                var transNum= parseInt(rawText.substring(rawText.indexOf("sent")+4,rawText.indexOf("transactions")).trim());
                                totalDiscoveryTrans=totalDiscoveryTrans+transNum;
                                var transNumFailures= parseInt(rawText.substring(rawText.indexOf("failed")+6,rawText.indexOf("transactions")).trim());
                                totalDiscoveryTransFailures=totalDiscoveryTransFailures+transNumFailures;
                                var tempDur=parseInt(rawText.substring(rawText.indexOf(") in")+4,rawText.indexOf("ms")).trim());
                                totalDiscoveryTime=totalDiscoveryTime+tempDur;

                                var tmp=parseInt(rawText.substring(rawText.indexOf("start")+5, rawText.indexOf("end")).trim());
                                var tmp1=parseInt(rawText.substring(rawText.indexOf("end")+3, rawText.indexOf(",Throughput")).trim());
                                if ( stmp == 0 ) {
                                    stmp = tmp;
                                } else if ( stmp > tmp ) {
                                    stmp = tmp;
                                }
                                if ( etmp == 0 ) {
                                    etmp = tmp1;
                                } else if ( etmp < tmp1 ) {
                                    etmp = tmp1;
                                }
                                logger.info('invoke_discovery found it', totalDiscoveryTrans, totalDiscoveryTime, stmp, etmp);

                                continue;
                            };
                        }
                        logger.info("Test Summary: Total %d Threads run completed",procDone);
                        if (totalInvokeTrans>0) {

                            var dur=etmp-stmp;

                            // transaction output
                            var buff = "======= "+loggerMsg+" Test Summary: executed at " + sTime + " =======\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"): "+ transMode + " INVOKE transaction stats\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal processes "+procDone+"\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal transactions sent "+totalInvokeTrans + "  received "+totalInvokeTransRcvd+"\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tfailures: proposal "+totalInvokePeerFailures + "  transactions "+totalInvokeOrdererFailures+"\n";
                            fs.appendFileSync(rptFile, buff);

                            buff = "("+channelName+":"+chaincode_id+"):\tevent: received "+totalInvokeTransRcvd + "  timeout "+totalInvokeEventTimeout+ "  unreceived "+ totalInvokeEventUnreceived+"\n";
                            fs.appendFileSync(rptFile, buff);

                            buff = "("+channelName+":"+chaincode_id+"):\tstart "+stmp+"  end "+etmp+"  duration "+dur+" ms \n";
                            fs.appendFileSync(rptFile, buff);

                            if ( transMode === 'LATENCY' ) {
                                var iTPS=dur/totalInvokeTransRcvd;
                                buff = "("+channelName+":"+chaincode_id+"):\tLatency "+iTPS.toFixed(2)+" ms \n";
                                fs.appendFileSync(rptFile, buff);
                            } else {
                                var iTPS=1000*totalInvokeTransRcvd/dur;
                                buff = "("+channelName+":"+chaincode_id+"):\tTPS "+iTPS.toFixed(2)+ "\n";
                                fs.appendFileSync(rptFile, buff);
                            }

                            // peer latency output (endorsement)
                            buff = "("+channelName+":"+chaincode_id+"): peer latency stats (endorsement)\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\ttotal transactions: "+ latency_peer[0] +"  total time: "+ latency_peer[1] +" ms \n";
                            fs.appendFileSync(rptFile, buff);
                            if ( latency_peer[0] > 0 ) {
                                buff = "("+channelName+":"+chaincode_id+"):\tmin: "+ latency_peer[2] +" ms  max: "+ latency_peer[3] +" ms  avg: "+ (latency_peer[1]/latency_peer[0]).toFixed(2) +" ms \n";
                                fs.appendFileSync(rptFile, buff);
                            }

                            // orderer latency output (transaction ack)
                            buff = "("+channelName+":"+chaincode_id+"): orderer latency stats (transaction ack)\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\ttotal transactions: "+ latency_orderer[0] +"  total time: "+ latency_orderer[1] +" ms \n";
                            fs.appendFileSync(rptFile, buff);
                            if ( latency_orderer[0] > 0 ) {
                                buff = "("+channelName+":"+chaincode_id+"):\tmin: "+ latency_orderer[2] +" ms  max: "+ latency_orderer[3] +" ms  avg: "+ (latency_orderer[1]/latency_orderer[0]).toFixed(2) +" ms \n";
                                fs.appendFileSync(rptFile, buff);
                            }

                            // event latency output (end-to-end)
                            buff = "("+channelName+":"+chaincode_id+"): event latency stats (end-to-end)\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\ttotal transactions: "+ latency_event[0] +"  total time: "+ latency_event[1] +" ms \n";
                            fs.appendFileSync(rptFile, buff);
                            if ( latency_event[0] > 0 ) {
                                buff = "("+channelName+":"+chaincode_id+"):\tmin: "+ latency_event[2] +" ms  max: "+ latency_event[3] +" ms  avg: "+ (latency_event[1]/latency_event[0]).toFixed(2) +" ms \n\n";
                                fs.appendFileSync(rptFile, buff);
                            }
                        }
                        if (totalQueryTrans>0) {
                            var dur=etmp-stmp;
                            var qTPS=1000*(totalQueryReceived-totalQueryFailed)/dur;
                            logger.info("Aggregate Test Summary (%s):Total QUERY transaction %d received %d, start %d end %d duration is %d ms, TPS %d", chaincode_id, totalQueryTrans, totalQueryReceived, stmp, etmp, dur, qTPS.toFixed(2));

                            // query transaction output
                            var buff = "======= "+loggerMsg+" Test Summary: executed at " + sTime + " =======\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"): "+ transMode + " QUERY transaction stats\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal processes "+procDone+"\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal transactions sent "+totalQueryTrans + "  received "+totalQueryReceived+"\n";
                            fs.appendFileSync(rptFile, buff);

                            buff = "("+channelName+":"+chaincode_id+"):\tfailures: query transactions "+totalQueryFailed+"\n";
                            fs.appendFileSync(rptFile, buff);

                            buff = "("+channelName+":"+chaincode_id+"):\tstart "+stmp+"  end "+etmp+"  duration "+dur+" ms \n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTPS "+qTPS.toFixed(2)+ "\n\n";
                            fs.appendFileSync(rptFile, buff);
                        }
                        if (totalMixedTPS) {
                            var dur=etmp-stmp;
                            var mixTotal=totalMixedInvoke+totalMixedQuery;
                            var mTPS=1000*(totalMixedInvoke+totalMixedQuery)/dur;
                            logger.info("Aggregate Test Summary (%s):Total MIX transaction invoke %d query %d total %d, start %d end %d duration is %d ms, TPS %d", chaincode_id, totalMixedInvoke, totalMixedQuery, totalMixedInvoke+totalMixedQuery, stmp, etmp, etmp-stmp, mTPS.toFixed(2));

                            // mix transaction output
                            var buff = "======= "+loggerMsg+" Test Summary: executed at " + sTime + " =======\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"): "+ transMode + " INVOKE/QUERY transaction stats\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal processes "+procDone+"\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal transactions sent "+mixTotal+" INVOKE "+totalMixedInvoke+"  QUERY "+ totalMixedQuery + "\n";
                            fs.appendFileSync(rptFile, buff);

                            buff = "("+channelName+":"+chaincode_id+"):\tstart "+stmp+"  end "+etmp+"  duration "+dur+" ms \n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTPS "+mTPS.toFixed(2)+ "\n\n";
                            fs.appendFileSync(rptFile, buff);
                        }
                        if (totalDiscoveryTrans>0) {
                            var dur=etmp-stmp;
                            logger.info("Test Summary (%s):Total  DISCOVERY transaction=%d, failed=%d, duration=%d ms, total throughput=%d TPS", chaincode_id, totalDiscoveryTrans, totalDiscoveryTransFailures, dur, (totalDiscoveryTrans/dur).toFixed(2));
                            var sdTPS=1000*totalDiscoveryTrans/dur;
                            logger.info("Aggregate Test Summary (%s):Total DISCOVERY transaction %d, failed %d, start %d end %d duration is %d ms, TPS %d", chaincode_id, totalDiscoveryTrans, totalDiscoveryTransFailures, stmp, etmp, dur, sdTPS.toFixed(2));

                            // service discovery transaction output
                            var buff = "======= "+loggerMsg+" Test Summary: executed at " + sTime + " =======\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"): "+transMode+" "+transType+" transaction stats\n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal processes "+procDone+"\n";
                            fs.appendFileSync(rptFile, buff);
                            var totalDiscoveryTransReceived = totalDiscoveryTrans - totalDiscoveryTransFailures;
                            buff = "("+channelName+":"+chaincode_id+"):\tTotal transactions sent "+totalDiscoveryTrans + "  received "+totalDiscoveryTransReceived+"\n";
                            fs.appendFileSync(rptFile, buff);

                            buff = "("+channelName+":"+chaincode_id+"):\tstart "+stmp+"  end "+etmp+"  duration "+dur+" ms \n";
                            fs.appendFileSync(rptFile, buff);
                            buff = "("+channelName+":"+chaincode_id+"):\tTPS "+sdTPS.toFixed(2)+ "\n\n";
                            fs.appendFileSync(rptFile, buff);
                        }
                        logger.info('[performance_main] pte-main:completed:');

                    }

                });

            }
        } else {
            logger.error('[Nid=%d] invalid transType: %s', Nid, transType);
        }

    }
    }catch(err){
        logger.error(err)
        evtDisconnect()
        process.exit(1)
    }
}

function readFile(path) {
    return new Promise(function(resolve, reject) {
        fs.readFile(path, function(err, data) {
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
    for (var i=0; i<eventHubs.length; i++) {
        if (eventHubs[i] && eventHubs[i].isconnected()) {
            logger.info('[pte-main:evtDisconnect] Disconnecting the event hub: %s', eventHubs[i].getPeerAddr());
            if (blockCallbacks && blockCallbacks[i]) {
                eventHubs[i].unregisterBlockEvent(blockCallbacks[i]);
            }
            eventHubs[i].disconnect();
        }
    }
}
