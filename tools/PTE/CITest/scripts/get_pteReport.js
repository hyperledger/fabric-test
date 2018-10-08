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
 * Purpose: To append the overall performance summary in the pteReport.txt
 *
 * Usage:
 *     node get_pteReport.js <pte report txt file>
 *       - pte report txt file: pte report output from PTE run,
 *                              default: pteReport.txt in current directory
 */

var fs = require('fs');

var pteReport = 'pteReport.txt'
if (process.argv.length > 2) {
   pteReport = process.argv[2];
}
console.log('pteReport file: ', pteReport);

var nPTE=0;

// transaction keys
var transKey1;
var transKey2;
var procNum=0;
var sentTx=0;
var receivedTx=0
var proposalFailed=0
var queryFailed=0
var txFailed=0
var evtReceived=0
var evtTimeout=0
var evtUnreceived=0

// timestamp vars
var startTime=0
var endTime=0

// latency vars
var peerLatency=[];
var ordererLatency=[];
var eventLatency=[];
for (var j = 0; j <= 3; j++ ) {
    peerLatency.push(0);
    ordererLatency.push(0);
    eventLatency.push(0);
}
var latIndx=0;
var peerIndx=0;
var ordererIndx=1;
var eventIndx=2;

// parse pte report input
var array = fs.readFileSync(pteReport).toString().split("\n");
for(i in array) {
    //console.log(array[i]);
    if ( array[i].indexOf('======= PTE')>-1 ) {
        //console.log(array[i]);
        nPTE++;
    } else if ( array[i].indexOf('transaction stats') >-1 ) {
        var arr = array[i].split(' ');
        transKey1 = arr[1];
        transKey2 = arr[2];
        //console.log(array[i]);
    } else if ( array[i].indexOf('Total processes') > -1) {
        procNum = procNum + parseInt(array[i].substring(array[i].indexOf('processes')+9).trim());
        //console.log('procNum=%d', procNum);
    } else if ( array[i].indexOf('Total transactions sent') > -1) {
        sentTx = sentTx + parseInt(array[i].substring(array[i].indexOf('sent')+4).trim());
        receivedTx = receivedTx + parseInt(array[i].substring(array[i].indexOf('received')+8).trim());
        //console.log('sentTx=%d, receivedTx=%d', sentTx, receivedTx);
    } else if ( array[i].indexOf('failures:') > -1) {
        if ( array[i].indexOf('proposal') > -1) {
            proposalFailed = proposalFailed + parseInt(array[i].substring(array[i].indexOf('proposal')+8).trim());
            txFailed = txFailed + parseInt(array[i].substring(array[i].indexOf('transactions')+12).trim());
            //console.log('proposalFailed=%d, txFailed=%d', proposalFailed, txFailed);
        }  else if ( array[i].indexOf('query') > -1 ) {
            queryFailed = queryFailed + parseInt(array[i].substring(array[i].indexOf('transactions')+12).trim());
            //console.log('queryFailed=%d', queryFailed);
        }
    } else if ( array[i].indexOf('event:') > -1) {
        evtReceived = evtReceived + parseInt(array[i].substring(array[i].indexOf('received')+8).trim());
        evtTimeout = evtTimeout + parseInt(array[i].substring(array[i].indexOf('timeout')+7).trim());
        evtUnreceived = evtUnreceived + parseInt(array[i].substring(array[i].indexOf('unreceived')+10).trim());
        //console.log('evtReceived=%d, evtTimeout=%d, evtUnreceived=%d', evtReceived, evtTimeout, evtUnreceived);
    } else if ( array[i].indexOf('start') > -1) {
        var tmp0 = parseInt(array[i].substring(array[i].indexOf('start')+5).trim());
        var tmp1 = parseInt(array[i].substring(array[i].indexOf('end')+3).trim());
        if ( (startTime == 0) || (startTime > tmp0) ) {
            startTime = tmp0;
        }
        if ( (endTime == 0) || (endTime < tmp1) ) {
            endTime = tmp1;
        }
        //console.log('startTime=%d, endTime=%d', startTime, endTime);
    } else if ( array[i].indexOf('peer latency stats') > -1) {
        latIndx=peerIndx;
    } else if ( array[i].indexOf('orderer latency stats') > -1) {
        latIndx=ordererIndx;
    } else if ( array[i].indexOf('event latency stats') > -1) {
        latIndx=eventIndx;
    } else if ( array[i].indexOf('total transactions:') > -1) {
        var tmp0 = parseInt(array[i].substring(array[i].indexOf('transactions:')+13).trim());
        var tmp1 = parseInt(array[i].substring(array[i].indexOf('time:')+5).trim());
        if ( latIndx == peerIndx ) {
            peerLatency[0] = peerLatency[0] + tmp0;
            peerLatency[1] = peerLatency[1] + tmp1;
        }
        if ( latIndx == ordererIndx ) {
            ordererLatency[0] = ordererLatency[0] + tmp0;
            ordererLatency[1] = ordererLatency[1] + tmp1;
        }
        if ( latIndx == eventIndx ) {
            eventLatency[0] = eventLatency[0] + tmp0;
            eventLatency[1] = eventLatency[1] + tmp1;
        }
    } else if ( (array[i].indexOf('min:') > -1) && (array[i].indexOf('max') > -1) ) {
        var tmp0 = parseInt(array[i].substring(array[i].indexOf('min:')+4).trim());
        var tmp1 = parseInt(array[i].substring(array[i].indexOf('max:')+4).trim());
        if ( latIndx == peerIndx ) {
            if ( (peerLatency[2] == 0) || (peerLatency[2] > tmp0) ) {
                peerLatency[2] = tmp0;
            }
            if ( peerLatency[3] < tmp1 ) {
                peerLatency[3] = tmp1;
            }
        }
        if ( latIndx == ordererIndx ) {
            if ( (ordererLatency[2] == 0) || (ordererLatency[2] > tmp0) ) {
                ordererLatency[2] = tmp0;
            }
            if ( ordererLatency[3] < tmp1 ) {
                ordererLatency[3] = tmp1;
            }
        }
        if ( latIndx == eventIndx ) {
            if ( (eventLatency[2] == 0) || (eventLatency[2] > tmp0) ) {
                eventLatency[2] = tmp0;
            }
            if ( eventLatency[3] < tmp1 ) {
                eventLatency[3] = tmp1;
            }
        }
    }
}


// output results
    var hdr = transKey1+' '+transKey2;
    var buff = '=======  '+hdr+' Overall Performance Summary  =======\n';
    fs.appendFileSync(pteReport, buff);

    buff = '    '+hdr+' Overall number of PTE: '+nPTE+'\n';
    fs.appendFileSync(pteReport, buff);

    buff = '    '+hdr+' Overall processes: '+procNum+'\n';
    fs.appendFileSync(pteReport, buff);

    if ( transKey2 == 'INVOKE' ) {
        buff = '    '+hdr+' Overall transactions: sent '+sentTx+' received '+receivedTx+'\n';
        fs.appendFileSync(pteReport, buff);

        buff = '    '+hdr+' Overall failures: proposal '+proposalFailed+' transactions '+txFailed+'\n';
        fs.appendFileSync(pteReport, buff);

        buff = '    '+hdr+' Overall event: received '+evtReceived+' timeout '+evtTimeout+' unreceived '+evtUnreceived+'\n';
        fs.appendFileSync(pteReport, buff);

        var duration = endTime - startTime;
        buff = '    '+hdr+' Overall time: start '+startTime+' end '+endTime+' duration '+duration+'\n';
        fs.appendFileSync(pteReport, buff);

        if ( transKey1 == 'LATENCY' ) {
            var tLatency=duration/receivedTx;
            buff = '    '+hdr+' Overall '+transKey1+' '+transKey2+' LATENCY '+tLatency.toFixed(2)+'\n';
        } else {
            var tTPS=1000*receivedTx/duration;
            buff = '    '+hdr+' Overall '+transKey1+' '+transKey2+' TPS '+tTPS.toFixed(2)+'\n';
        }
        fs.appendFileSync(pteReport, buff);

        buff = '    '+hdr+' Overall latency summary\n';
        fs.appendFileSync(pteReport, buff);

        var avg=peerLatency[1]/peerLatency[0];
        buff = '        '+hdr+' Overall proposals latency '+peerLatency[0]+' min '+peerLatency[2]+' ms max '+peerLatency[3]+' ms avg '+avg.toFixed(2)+' ms\n';
        fs.appendFileSync(pteReport, buff);

        avg=ordererLatency[1]/ordererLatency[0];
        buff = '        '+hdr+' Overall transactions latency '+ordererLatency[0]+' min '+ordererLatency[2]+' ms max '+ordererLatency[3]+' ms avg '+avg.toFixed(2)+' ms\n';
        fs.appendFileSync(pteReport, buff);
        avg=eventLatency[1]/eventLatency[0];
        buff = '        '+hdr+' Overall events latency '+eventLatency[0]+' min '+eventLatency[2]+' ms max '+eventLatency[3]+' ms avg '+avg.toFixed(2)+' ms\n';
        fs.appendFileSync(pteReport, buff);

        var overallResult='PASSED';
        if ( (sentTx > receivedTx) || (evtUnreceived > 0) ) {
            overallResult='FAILED';
        }
        buff = '        '+hdr+' Overall TEST RESULTS '+overallResult+'\n';
        fs.appendFileSync(pteReport, buff);
    } else if ( transKey2 == 'QUERY' ) {
        buff = '    '+hdr+' Overall transactions: sent '+sentTx+' received '+receivedTx+' failures '+queryFailed+'\n';
        fs.appendFileSync(pteReport, buff);

        var duration = endTime - startTime;
        buff = '    '+hdr+' Overall time: start '+startTime+' end '+endTime+' duration '+duration+'\n';
        fs.appendFileSync(pteReport, buff);

        if ( transKey1 == 'LATENCY' ) {
            var tLatency=duration/receivedTx;
            buff = '    '+hdr+' Overall '+transKey1+' '+transKey2+' Latency '+tLatency.toFixed(2)+'\n';
        } else {
            var tTPS=1000*(receivedTx-queryFailed)/duration;
            buff = '    '+hdr+' Overall '+transKey1+' '+transKey2+' TPS '+tTPS.toFixed(2)+'\n';
        }
        fs.appendFileSync(pteReport, buff);

        var overallResult='PASSED';
        if ( (sentTx > receivedTx) || (queryFailed > 0) ) {
            overallResult='FAILED';
        }
        buff = '    '+hdr+' Overall TEST RESULTS '+overallResult+'\n';
        fs.appendFileSync(pteReport, buff);
    } else if ( transKey2 == 'DISCOVERY' ) {
        buff = '    '+hdr+' Overall transactions: sent '+sentTx+' received '+receivedTx+'\n';
        fs.appendFileSync(pteReport, buff);

        var duration = endTime - startTime;
        buff = '    '+hdr+' Overall time: start '+startTime+' end '+endTime+' duration '+duration+'\n';
        fs.appendFileSync(pteReport, buff);

        var tTPS=1000*receivedTx/duration;
        buff = '    '+hdr+' Overall '+transKey1+' '+transKey2+' TPS '+tTPS.toFixed(2)+'\n';
        fs.appendFileSync(pteReport, buff);

        var overallResult='PASSED';
        if ( sentTx !== receivedTx ) {
            overallResult='FAILED';
        }
        buff = '    '+hdr+' Overall TEST RESULTS '+overallResult+'\n';
        fs.appendFileSync(pteReport, buff);
    } else if ( transKey1 == 'MIX' ) {
        var sentInvoke=sentTx/2;
        var sentQuery=sentTx/2;
        buff = '    '+hdr+' Overall transactions: total sent '+sentTx+' INVOKE '+sentInvoke+' QUERY '+sentQuery+'\n';
        fs.appendFileSync(pteReport, buff);

        var duration = endTime - startTime;
        buff = '    '+hdr+' Overall time: start '+startTime+' end '+endTime+' duration '+duration+'\n';
        fs.appendFileSync(pteReport, buff);

        var tTPS=1000*sentTx/duration;
        buff = '    '+hdr+' Overall '+transKey1+' '+transKey2+' TPS '+tTPS.toFixed(2)+'\n';
        fs.appendFileSync(pteReport, buff);
    }

    // append a blank line at the end
    buff = '\n';
    fs.appendFileSync(pteReport, buff);
