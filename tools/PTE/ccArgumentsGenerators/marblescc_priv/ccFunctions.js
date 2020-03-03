/**
 * Copyright 2016 IBM
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
/**
 * Licensed Materials - Property of IBM
 * © Copyright IBM Corp. 2016
 */

const ccFunctionsBase = require('../ccFunctionsBase.js');

class ccFunctions extends ccFunctionsBase {
    constructor(ccDfnPtr, logger, Nid, channelName, org, pid) {
        super(ccDfnPtr, logger, Nid, channelName, org, pid);
        this.moveMarbleOwner = 'tom';
        this.moveMarbleName = 'marble';
        this.queryMarbleOwner = 'tom';
        this.queryMarbleName = 'marble';
        this.nOwner = 100;
        this.tsMapKey = "marble";
        this.queryMarbleDocType = 'marble';
        this.keyStart = parseInt(this.ccDfnPtr.ccOpt.keyStart);
        this.payLoadMin = parseInt(this.ccDfnPtr.ccOpt.payLoadMin);
        this.payLoadMax = parseInt(this.ccDfnPtr.ccOpt.payLoadMax);
        this.arg0 = parseInt(this.keyStart);
        this.logger.info('[Nid:chan:org:id=%d:%s:%s:%d ccFunctions] %s chaincode setting: keyStart=%d payLoadMin=%d payLoadMax=%d',
                 this.Nid, this.channelName, this.org, this.pid, this.ccDfnPtr.ccType, this.keyStart,
                 parseInt(this.ccDfnPtr.ccOpt.payLoadMin), parseInt(this.ccDfnPtr.ccOpt.payLoadMax));

        // get number of owners
        if ( typeof( this.ccDfnPtr.invoke.nOwner ) !== 'undefined'  ) {
            this.nOwner=parseInt(this.ccDfnPtr.invoke.nOwner);
        }

        // moveMarbleOwner
        // transientMap: {"marble": {"name":"marble", "color":"blue","size":35,"owner":"tom","price":99}}
        if ( this.ccDfnPtr.invoke.move ) {
            if ( this.ccDfnPtr.invoke.move.transientMap ) {
                this.tsMapKey = Object.keys(this.ccDfnPtr.invoke.move.transientMap)[0];
                this.moveMarbleOwner = this.ccDfnPtr.invoke.move.transientMap[this.tsMapKey].owner;
                this.moveMarbleName = this.ccDfnPtr.invoke.move.transientMap[this.tsMapKey].name;
            } else {
                if ( this.ccDfnPtr.invoke.move.fcn == 'initMarble' ) {
                    this.moveMarbleOwner = this.ccDfnPtr.invoke.move.args[3];
                }
                this.moveMarbleName = this.ccDfnPtr.invoke.move.args[0];
            }
        }

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
        if ( this.ccDfnPtr.invoke.query.fcn == 'queryMarblesByOwner' ) {
            this.queryMarbleOwner=ccDfnPtr.invoke.query.args[0];
        } else if ( this.ccDfnPtr.invoke.query.fcn == 'queryMarbles' ) {
            if ( typeof( this.ccDfnPtr.invoke.query.args.selector.owner ) !== 'undefined' ) {
                this.queryMarbleOwner=this.ccDfnPtr.invoke.query.args.selector.owner;
            }
            if ( typeof( this.ccDfnPtr.invoke.query.args.selector.docType ) !== 'undefined' ) {
                this.queryMarbleDocType=this.ccDfnPtr.invoke.query.args.selector.docType;
            }
        }
        this.queryMarbleName=this.ccDfnPtr.invoke.query.args[0];
    }

    getInvokeArgs(txIDVar) {
        this.arg0 ++;
        if ( this.ccDfnPtr.invoke.move.transientMap ) {
            this.testInvokeTransientMap[this.tsMapKey].name = this.moveMarbleName+'_'+txIDVar+'_'+this.arg0;
            var index=this.arg0%this.nOwner;
            this.testInvokeTransientMap[this.tsMapKey].size = index;
            if ( this.ccDfnPtr.invoke.move.fcn == 'transferMarble' ) {
                this.testInvokeTransientMap[this.tsMapKey].owner=this.moveMarbleOwner+'_'+txIDVar+'_'+index;
            }
            this.testInvokeTransientMapEncoded[this.tsMapKey] = Buffer.from(JSON.stringify(this.testInvokeTransientMap[this.tsMapKey])).toString("base64");
        }
    }

    getQueryArgs(txIDVar) {
        this.arg0 ++;
        var i = 0;
        var keyA = this.keyStart;
        if ( this.arg0 - this.keyStart > 10 ) {
            keyA = this.arg0 - 10;
        }
        if ( this.ccDfnPtr.invoke.query.fcn == 'readMarblePrivateDetails' ) {
            for ( i=0; i<this.keyIdx.length; i++ ) {
                this.testQueryArgs[this.keyIdx[i]] = this.queryMarbleName+'_'+txIDVar+'_'+this.arg0;
            }
        } else {
            for ( i=0; i<this.keyIdx.length; i++ ) {
                this.testQueryArgs[this.keyIdx[i]] = this.queryMarbleName+'_'+txIDVar+'_'+this.arg0;
            }
        }
    }

    getExecModeLatencyFreq() {
        return 20000;
    }

}

module.exports = ccFunctions;
