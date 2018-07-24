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
		if ( this.payLoadType == 'FIXED' ) {
			var rlen = this.payLoadMin;
			var buf = crypto.randomBytes(rlen);
			for ( var i = 0; i < this.keyPayLoad.length; i++ ) {
				this.testInvokeArgs[this.keyPayLoad[i]] = buf.toString('hex');
			}
		}

		this.arg0 = parseInt(this.keyStart);
		this.logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d payLoadMin=%d payLoadMax=%d',
				this.Nid, this.channelName, this.org, this.pid, this.ccDfnPtr.ccType, this.keyStart,
				parseInt(this.ccDfnPtr.ccOpt.payLoadMin), parseInt(this.ccDfnPtr.ccOpt.payLoadMax));
	}

	getInvokeArgs(txIDVar) {
		this.arg0 ++;
		var i = 0;
		for ( i=0; i<this.keyIdx.length; i++ ) {
			this.testInvokeArgs[this.keyIdx[i]] = 'key_'+txIDVar+'_'+this.arg0;
		}

		// randomise length of payload
		var rlen = Math.floor(Math.random() * (this.payLoadMax - this.payLoadMin)) + this.payLoadMin;

		if ( this.payLoadType == 'RANDOM' ) {
			var buf = crypto.randomBytes(rlen);
			for ( i = 0; i < this.keyPayLoad.length; i++ ) {
				this.testInvokeArgs[this.keyPayLoad[i]] = buf.toString('hex');
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
}

module.exports = ccFunctions;
