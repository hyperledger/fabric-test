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

const crypto = require('crypto');
const ccFunctionsBase = require('../ccFunctionsBase.js');

class ccFunctions extends ccFunctionsBase {
    constructor(ccDfnPtr, logger, Nid, channelName, org, pid) {
        super(ccDfnPtr, logger, Nid, channelName, org, pid);
        this.keyStart = parseInt(this.ccDfnPtr.ccOpt.keyStart);
        this.payLoadMin = parseInt(this.ccDfnPtr.ccOpt.payLoadMin)/2;
        this.payLoadMax = parseInt(this.ccDfnPtr.ccOpt.payLoadMax)/2;
        if ( this.ccDfnPtr.ccOpt.payLoadType )
            this.payLoadType = this.ccDfnPtr.ccOpt.payLoadType.toUpperCase();

        // Fixed payload
        for ( var i = 0; i < this.keyPayLoad.length; i++ ) {
            if ( this.keyPayLoadType[i] == 'FIXED' ) {
                // Fixed string payload
                var rlen = Math.floor(Math.random() * (this.keyPayLoadMax[i] - this.keyPayLoadMin[i])) + this.keyPayLoadMin[i];
                var buf = crypto.randomBytes(rlen);
                this.testInvokeArgs[this.keyPayLoad[i]] = buf.toString('hex');
            } else if ( this.keyPayLoadType[i] == 'FIXEDINT' ) {
                // Fixed int payload
                var rnum = Math.floor(Math.random() * ((this.keyPayLoadMax[i] - this.keyPayLoadMin[i]) * 2 )) + this.keyPayLoadMin[i] * 2;
                this.testInvokeArgs[this.keyPayLoad[i]] = String(rnum);
            }
        }

        this.arg0 = parseInt(this.keyStart);
        this.logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d',
                this.Nid, this.channelName, this.org, this.pid, this.ccDfnPtr.ccType, this.keyStart);
    }

    getInvokeArgs(txIDVar) {
        this.arg0 ++;
        var i = 0;
        for ( i=0; i<this.keyIdx.length; i++ ) {
            this.testInvokeArgs[this.keyIdx[i]] = 'key_'+txIDVar+'_'+this.arg0;
        }

        // random payload
        for ( i = 0; i < this.keyPayLoad.length; i++ ) {
            if ( this.keyPayLoadType[i] === 'RANDOM' ) {
                // random string
                var rlen = Math.floor(Math.random() * (this.keyPayLoadMax[i] - this.keyPayLoadMin[i])) + this.keyPayLoadMin[i];
                var buf = crypto.randomBytes(rlen);
                this.testInvokeArgs[this.keyPayLoad[i]] = buf.toString('hex');
            } else if ( this.keyPayLoadType[i] === 'RANDOMINT' ) {
                // random int
                var rnum = Math.floor(Math.random() * ((this.keyPayLoadMax[i] - this.keyPayLoadMin[i]) * 2 )) + this.keyPayLoadMin[i] * 2;
                this.testInvokeArgs[this.keyPayLoad[i]] = String(rnum);
            }
        }
    }

    getQueryArgs(txIDVar) {
        this.arg0 ++;
        var i = 0;
        for ( i=0; i<this.keyIdx.length; i++ ) {
            this.testQueryArgs[this.keyIdx[i]] = 'key_'+txIDVar+'_'+this.arg0;
        }
    }

    getExecModeLatencyFreq() {
        return 0;
    }

    getExecModeSimpleFreq() {
        return 0;
    }

    getExecModeProposalFreq() {
        return 0;
    }

    // This is an OPTIONAL function
    // Returns lists of organization names allowed to invoke/query chaincode functions
    // - <function name> --> <array of organization names>
    // Default access policy: any organization is allowed to call the function
    // - If 'getAccessControlPolicyMap' is not defined
    // - If the return value is an empty JSON: {}
    // - If the invoke/query function is not a key in the returned JSON
    // - If the value corresponding to an invoke/query function is an empty array
    getAccessControlPolicyMap() {
        return {
            "invoke": []
        };
    }
}

module.exports = ccFunctions;
