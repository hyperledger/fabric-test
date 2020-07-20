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
 *       node pte-main.js -r <Rid> -u <uiFile> -t <tStart> -p <PTEid>
 *       or node pte-main.js <Rid> <uiFile> <tStart> <PTEid>
 *         - Rid: runcase id
 *         - uiFile: user input file
 *         - tStart: tStart
 *         - PTEid: PTE client id
 *    ii. If using jsonObject
 *       node pte-main.js -r <Rid> -u <jsonObject> -t <tStart> -p <PTEid>
 *       or node pte-main.js <Rid> <jsonObject> <tStart> <PTEid>
 *        - Rid: runcase id
 *        - jsonObject: user input jsonObject
 *        - tStart: tStart
 *        - PTEid: PTE client id
 */

'use strict';

// parse input args
const { argv } = require("yargs")
    .usage("Usage: $0 -r Rid -u uiFile -t tStart -p PTEid")
    .help('help')
    .example(
      "$0 -r 0 -u test.yaml -t 1595951543161 -p 1",
      "Execute transactions specified in the test.yaml starts at 1595951543161"
    )
    .option("r", {
      alias: "Rid",
      describe: "The R-th runcase of this PTE",
      demandOption: "The Rid is required.",
      type: "number",
      nargs: 1,
    })
    .option("p", {
      alias: "PTEid",
      describe: "The P-th PTE client of this testcase",
      demandOption: "The PTEid is required.",
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
      describe: "The starting time of this testcase",
      demandOption: "The tStart is required.",
      type: "string",
      nargs: 1,
    });

// input argv
let Rid, uiFile, tStart, PTEid;
if ( argv._.length > 0 ) {
    // without options
    if ( argv._.length === 3 ) {
        Rid = parseInt(argv._[0]);
        uiFile = argv._[1];
        tStart = parseInt(argv._[2]);
        PTEid = parseInt(argv._[3]);
    } else {
        console.log('invalid input');
        process.exit(1);
    }
} else {
    // with options
    Rid = argv.Rid;
    uiFile = argv.uiFile;
    tStart = argv.tStart;
    PTEid = argv.PTEid;
}


const child_process = require('child_process');

let fs = require('fs');
let path = require('path');
let pteUtil = require('./pte-util.js');
let pteQueryInfo = require('./pte-queryInfo.js');

// logger
PTEid = PTEid ? PTEid : 0
let loggerMsg = `PTE ${PTEid} main Rid=${Rid}`;
let logger = new pteUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });

// log local time
logger.info('The local time is: %j', new Date().toLocaleString());

// transactions configuration object
const txnCfgObj = pteUtil.getTxnCfgObj(uiFile);
logger.debug('input txnCfgObj: %j', txnCfgObj);

// channelOpt
let channelOpt = txnCfgObj.channelOpt;
let channelName = channelOpt.name;
let targetOrgName = [];
for (let i = 0; i < channelOpt.orgName.length; i++) {
    targetOrgName.push(channelOpt.orgName[i]);
}
logger.info('channelName: %s, targetOrgName: %j', channelName, targetOrgName);

// find connection profiles
let cpList = pteUtil.getConnProfileList(txnCfgObj.ConnProfilePath);
if (cpList.length === 0) {
    logger.error('error: invalid connection profile path or no connection profiles found in the connection profile path: %s', txnCfgObj.ConnProfilePath);
    process.exit(1);
}
logger.info('connection profiles; ', cpList);

// get the transType: Invoke
let transType = txnCfgObj.transType.toUpperCase();


// test result report parameters
let testSummaryArray = [];
let rptFile = 'pteReport.txt';
let sTime = new Date();

// latency output
/**
 * update latency array from all threads
 *
 * @param {string} latencyArray The latency array
 * @param {string} rawText The raw data from PTE cexecution (pte-execRequet.js)
 * @returns {promise<void>}
 **/
let latencyOrderer = [0, 0, 0, 0];
let latencyEvent = [0, 0, 0, 0];
function updateLatency(latencyArray, rawText) {

    latencyArray[0] += parseInt(pteUtil.getValFromString('txn num=', rawText));
    latencyArray[1] += parseInt(pteUtil.getValFromString('total time=', rawText));
    let tmpMin = parseInt(pteUtil.getValFromString('min=', rawText));
    let tmpMax = parseInt(pteUtil.getValFromString('max=', rawText));

    if (latencyArray[2] == 0) {                   // min
        latencyArray[2] = tmpMin;
    } else if (tmpMin < latencyArray[2]) {
        latencyArray[2] = tmpMin;
    }
    if (latencyArray[3] == 0) {                   // max
        latencyArray[3] = tmpMax;
    } else if (tmpMax > latencyArray[3]) {
        latencyArray[3] = tmpMax;
    }

}

/**
 * pte main
 *
 * @returns {promise<void>}
 **/
async function pteMain() {
    try {
        let channelConfigDone = 0;
        for (let i = 0; i < targetOrgName.length; i++) {
            let org = targetOrgName[i];

            if ( transType == 'QUERYINFO' ) {
                let cpf = pteUtil.findOrgConnProfile(cpList, org);
                if ( !cpf ) {
                    logger.error('invalid connection profile');
                    process.exit(1);
                }

                pteQueryInfo.QIHandler(org, channelName, cpf);
                //pteQueryInfo.queryInfo(org, channelName, cpf);
            } else if ( transType == 'INVOKE' ) {
                // spawn off processes for transactions
                let nProcPerOrg = parseInt(txnCfgObj.nProcPerOrg);
                let invokeType = txnCfgObj.invokeType.toUpperCase();
                logger.info('nProcPerOrg ', nProcPerOrg);
                let output = {};
                for (let j = 0; j < nProcPerOrg; j++) {
                    output = {}
                    const pteExecPath = path.join(__dirname, 'pte-execRequest.js')
                    let workerProcess = child_process.spawn('node', [pteExecPath,
                                                                     '-i', j,
                                                                     '-r', Rid,
                                                                     '-u', uiFile,
                                                                     '-t', tStart,
                                                                     '-o', org,
                                                                     '-p', PTEid]);

                    workerProcess.stdout.on('data', function (data) {
                        logger.debug('stdout: ' + data);
                        if (data.indexOf('pte-exec:completed') > -1) {
                            let dataStr = data.toString();
                            let tempDataArray = dataStr.split("\n");
                            for (let i = 0; i < tempDataArray.length; i++) {
                                if (tempDataArray[i].indexOf('pte-exec:completed') > -1) {
                                    testSummaryArray.push(tempDataArray[i]);
                                }
                            }
                        }
                    });

                    workerProcess.stderr.on('data', function (data) {
                        logger.info('stderr: ' + data);
                    });

                    //workerProcess.stdout.on('data', function (data) {
                        //logger.info('stdout: ' + data);
                    //});

                    workerProcess.on('close', function (code) {
                    });

                    workerProcess.on('exit', function (code, signal) {
                        procDone = procDone + 1;
                        logger.info(`Child proc exited, procId= ${procDone}, exit with code= ${code} and signal= ${signal}`);

                        if (procDone === nProcPerOrg * targetOrgName.length) {

                            let summaryIndex;
                            let transMode = txnCfgObj.transMode.toUpperCase();

                            let chaincodeID;
                            let channelChaincodeID;
                            let totalInvokeTrans = 0;
                            let totalInvokeTransRcvd = 0;
                            let totalInvokeOrdererFailures = 0;
                            let totalInvokeEventTimeout = 0;
                            let totalInvokeEventUnreceived = 0;
                            let totalInvokeEventInvalid = 0;
                            let totalQueryTrans = 0;
                            let totalQueryFailed = 0;
                            let totalQueryReceived = 0;

                            let stmp = 0;
                            let etmp = 0;


                            for (summaryIndex in testSummaryArray) {
                                let rawText = testSummaryArray[summaryIndex].toString();
                                logger.info('Test Summary[%d]: %s', summaryIndex, rawText.substring(rawText.indexOf("[Rid")));
                                if (rawText.indexOf("error") > -1) {
                                    continue;
                                };

                                if (rawText.indexOf("postEventProc") > -1) {
                                    chaincodeID = pteUtil.getValFromString('chaincodeID=', rawText);
                                    channelChaincodeID = `${channelName}:${chaincodeID}`;
                                    totalInvokeTrans += parseInt(pteUtil.getValFromString('sent=', rawText));

                                    totalInvokeTransRcvd += parseInt(pteUtil.getValFromString('Rcvd=', rawText));

                                    totalInvokeOrdererFailures += parseInt(pteUtil.getValFromString('failure=', rawText));

                                    totalInvokeEventUnreceived += parseInt(pteUtil.getValFromString('event unreceived=', rawText));

                                    totalInvokeEventInvalid += parseInt(pteUtil.getValFromString('event invalid=', rawText));

                                    totalInvokeEventTimeout += parseInt(pteUtil.getValFromString('timeout=', rawText));

                                    let threadStart = parseInt(pteUtil.getValFromString('start=', rawText));
                                    let threadEnd = parseInt(pteUtil.getValFromString('end=', rawText));
                                    if (stmp == 0) {
                                        stmp = threadStart;
                                    } else if (stmp > threadStart) {
                                        stmp = threadStart;
                                    }
                                    if (etmp == 0) {
                                        etmp = threadEnd;
                                    } else if (etmp < threadEnd) {
                                        etmp = threadEnd;
                                    }

                                    continue;
                                };
                                if (rawText.indexOf("orderer latency stats") > -1) {
                                    updateLatency(latencyOrderer, rawText);
                                }
                                if (rawText.indexOf("event latency stats") > -1) {
                                    updateLatency(latencyEvent, rawText);
                                }
                                if ((invokeType == "QUERY") && (rawText.indexOf("isExecDone") > -1)) {
                                    chaincodeID = pteUtil.getValFromString('chaincodeID=', rawText);
                                    channelChaincodeID = `${channelName}:${chaincodeID}`;
                                    totalQueryTrans += parseInt(pteUtil.getValFromString('sent=', rawText));

                                    totalQueryReceived += parseInt(pteUtil.getValFromString('Rcvd=', rawText));

                                    totalQueryFailed += parseInt(pteUtil.getValFromString('failures=', rawText));

                                    let threadStart = parseInt(pteUtil.getValFromString('start=', rawText));
                                    let threadEnd = parseInt(pteUtil.getValFromString('end=', rawText));
                                    if (stmp === 0) {
                                        stmp = threadStart;
                                    } else if (stmp > threadStart) {
                                        stmp = threadStart;
                                    }
                                    if (etmp === 0) {
                                        etmp = threadEnd;
                                    } else if (etmp < threadEnd) {
                                        etmp = threadEnd;
                                    }

                                    continue;
                                };
                            }
                            if (totalInvokeTrans > 0) {

                                let dur = etmp - stmp;

                                // transaction output
                                let buff = `======= ${loggerMsg} Test Summary: executed at ${sTime} =======\n`;
                                output["Test executed at"] = sTime;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}): ${transMode} INVOKE transaction stats\n`;
                                output["INVOKE transactions type"] = transMode;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    Total processes ${procDone}\n`;
                                output["Total processes"] = procDone;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    Total transactions sent ${totalInvokeTrans} received ${totalInvokeTransRcvd}\n`;
                                const transactions = { "sent": totalInvokeTrans, "received": totalInvokeTransRcvd };
                                output["Total transactions"] = transactions;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    failures: transactions ${totalInvokeOrdererFailures}\n`;
                                const failures = { "transactions": totalInvokeOrdererFailures };
                                output["failures"] = failures;
                                fs.appendFileSync(rptFile, buff);

                                buff = `(${channelChaincodeID}):    event: received ${totalInvokeTransRcvd} timeout ${totalInvokeEventTimeout} unreceived ${totalInvokeEventUnreceived} invalid ${totalInvokeEventInvalid}\n`;
                                const events = { "received": totalInvokeTransRcvd, "timeout": totalInvokeEventTimeout, "unreceived": totalInvokeEventUnreceived, "invalid": totalInvokeEventInvalid };
                                output["event"] = events;
                                fs.appendFileSync(rptFile, buff);

                                buff = `(${channelChaincodeID}):    start ${stmp} end ${etmp} duration ${dur} ms\n`;
                                output["start"] = stmp;
                                output["end"] = etmp;
                                output["duration"] = `${dur} ms`;
                                fs.appendFileSync(rptFile, buff);

                                if (transMode === 'LATENCY') {
                                    let iTPS = dur / totalInvokeTransRcvd;
                                    buff = `(${channelChaincodeID}):    Latency ${iTPS.toFixed(2)} ms\n`;
                                    output["Latency"] = `${iTPS.toFixed(2)} ms`;
                                    fs.appendFileSync(rptFile, buff);
                                } else {
                                    let iTPS = 1000 * totalInvokeTransRcvd / dur;
                                    buff = `(${channelChaincodeID}):    TPS ${iTPS.toFixed(2)}\n`;
                                    output["TPS"] = iTPS.toFixed(2);
                                    fs.appendFileSync(rptFile, buff);
                                }

                                // orderer latency output (endorsement and transaction ack)
                                buff = `(${channelChaincodeID}): orderer latency stats (endorsement and transaction ack)\n`;
                                let ordererLatencyStats = {};
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    total transactions: ${latencyOrderer[0]}  total time: ${latencyOrderer[1]} ms\n`;
                                ordererLatencyStats = { "total transactions": latencyOrderer[0], "total time": `${latencyOrderer[1]} ms` };
                                fs.appendFileSync(rptFile, buff);
                                if (latencyOrderer[0] > 0) {
                                    buff = `(${channelChaincodeID}):    min: ${latencyOrderer[2]} ms  max: ${latencyOrderer[3]} ms  avg: ${(latencyOrderer[1] / latencyOrderer[0]).toFixed(2)} ms \n`;
                                    ordererLatencyStats["min"] = `${latencyOrderer[2]} ms`;
                                    ordererLatencyStats["max"] = `${latencyOrderer[3]} ms`;
                                    ordererLatencyStats["avg"] = `${(latencyOrderer[1] / latencyOrderer[0]).toFixed(2)} ms`;
                                    fs.appendFileSync(rptFile, buff);
                                }
                                output["orderer latency stats (endorsement submission and txn ack/nack)"] = ordererLatencyStats;
                                // event latency output (end-to-end)
                                buff = `(${channelChaincodeID}): event latency stats (end-to-end)\n`;
                                let eventLatencyStats = {};
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    total transactions: ${latencyEvent[0]}  total time: ${latencyEvent[1]} ms\n`;
                                eventLatencyStats = { "total transactions": latencyEvent[0], "total time": `${latencyEvent[1]} ms` };
                                fs.appendFileSync(rptFile, buff);
                                if (latencyEvent[0] > 0) {
                                    buff = `(${channelChaincodeID}):    min: ${latencyEvent[2]} ms  max: ${latencyEvent[3]} ms  avg: ${(latencyEvent[1] / latencyEvent[0]).toFixed(2)} ms\n\n`;
                                    eventLatencyStats["min"] = `${latencyEvent[2]} ms`;
                                    eventLatencyStats["max"] = `${latencyEvent[3]} ms`;
                                    eventLatencyStats["avg"] = `${(latencyEvent[1] / latencyEvent[0]).toFixed(2)} ms`;
                                    fs.appendFileSync(rptFile, buff);
                                }
                                output["event latency stats (end to end)"] = eventLatencyStats;
                            }
                            if (totalQueryTrans > 0) {
                                let dur = etmp - stmp;
                                let qTPS = 1000 * (totalQueryReceived - totalQueryFailed) / dur;
                                logger.info("Aggregate Test Summary (%s):Total QUERY transaction %d received %d, start %d end %d duration is %d ms, TPS %d", chaincodeID, totalQueryTrans, totalQueryReceived, stmp, etmp, dur, qTPS.toFixed(2));

                                // query transaction output
                                let buff = `======= ${loggerMsg} Test Summary: executed at ${sTime} =======\n`;
                                output["Test executed at"] = sTime;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}): ${transMode} QUERY transaction stats\n`;
                                output["QUERY transaction stats"] = transMode;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    Total processes ${procDone}\n`;
                                output["Total processes"] = procDone;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    Total transactions sent ${totalQueryTrans}  received ${totalQueryReceived}\n`;
                                const totalTransactions = { "sent": totalQueryTrans, "received": totalQueryReceived };
                                output["Total transactions"] = totalTransactions;
                                fs.appendFileSync(rptFile, buff);

                                buff = `(${channelChaincodeID}):    failures: query transactions ${totalQueryFailed}\n`;
                                fs.appendFileSync(rptFile, buff);
                                output["query transactions failed"] = totalQueryFailed;
                                buff = `(${channelChaincodeID}):    start ${stmp}  end ${etmp}  duration ${dur} ms\n`;
                                output["start"] = stmp;
                                output["end"] = etmp;
                                output["duration"] = `${dur} ms`;
                                fs.appendFileSync(rptFile, buff);
                                buff = `(${channelChaincodeID}):    TPS ${qTPS.toFixed(2)}\n\n`;
                                output["TPS"] = qTPS.toFixed(2);
                                fs.appendFileSync(rptFile, buff);
                            }
                            if ( (totalInvokeTrans > 0) || (totalQueryTrans > 0) ) {
                                output["channel name"] = channelName;
                                output["chaincode ID"] = chaincodeID;
                                logger.info('[pteMain] pte-main:completed:');
                                if ((output["Total transactions"]["sent"]) && (output["Total transactions"]["sent"] == output["Total transactions"]["received"]) && (output["Total transactions"]["sent"] != 0) && (totalInvokeEventInvalid == 0)) {
                                    output["Test Result"] = "PASS";
                                    logger.info('[pteMain] Test Output:', JSON.stringify(output, null, 4));
                                } else if ( invokeType == "QUERY" ) {
                                    let targetPeers = txnCfgObj.targetPeers.toUpperCase();
                                    let qFactor = 0;
                                    if ( targetPeers === 'ORGANCHOR' ) {
                                        qFactor = targetOrgName.length;
                                    } else if ( targetPeers === 'ALLANCHORS' ) {
                                        let orgList = [];
                                        orgList = pteUtil.findAllOrgFromConnProfile(cpList);
                                        qFactor = orgList.length;
                                    } else if ( targetPeers === 'ORGPEERS' ) {
                                        qFactor = pteUtil.getTotalPeersNum(cpList, targetOrgName);
                                    } else if ( targetPeers === 'ALLPEERS' ) {
                                        let orgList = [];
                                        orgList = pteUtil.findAllOrgFromConnProfile(cpList);
                                        qFactor = pteUtil.getTotalPeersNum(cpList, orgList);
                                    } else if ( targetPeers === 'DISCOVERY' ) {
                                        qFactor = 1;
                                    } else {
                                        logger.error('[pteMain] unknown targetPeers: %s',targetPeers);
                                        qFactor = 0;
                                    }
                                    logger.info('[pteMain] Test targetPeers: %s, qFactor: %d',targetPeers, qFactor);

                                    if ( (output["Total transactions"]["sent"] != 0) && (output["Total transactions"]["received"] === qFactor * output["Total transactions"]["sent"]) ) {
                                        output["Test Result"] = "PASS";
                                        logger.info('[pteMain] Test Output:', JSON.stringify(output, null, 4));
                                    } else {
                                        output["Test Result"] = "FAIL";
                                        const errMsg = '[pteMain] Test ran, but failed with errors. Exiting... \n pteReport: ' + JSON.stringify(output, null, 4);
                                        logger.error(errMsg);
                                        process.exit(1);
                                    }
                                } else {
                                    output["Test Result"] = "FAIL"
                                    const errMsg = '[pteMain] Test ran, but failed with errors. Exiting... \n pteReport: ' + JSON.stringify(output, null, 4);
                                    logger.error(errMsg);
                                    process.exit(1);
                                }

                            }
                        }

                    });

                }
            } else {
                logger.error('[pteMain] invalid transType: %s', transType);
            }

        }
    } catch (err) {
        logger.error(err)
        process.exit(1)
    }
}

// test begins ....
let procDone = 0;
pteMain();

