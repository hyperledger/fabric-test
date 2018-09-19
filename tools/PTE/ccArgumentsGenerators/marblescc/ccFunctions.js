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
        this.pagesize = 1000000000;
        this.queryMarbleDocType = 'marble';
        this.keyStart = parseInt(this.ccDfnPtr.ccOpt.keyStart);
        this.arg0 = parseInt(this.keyStart);
        this.logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] %s chaincode setting: keyStart=%d',
                 this.Nid, this.channelName, this.org, this.pid, this.ccDfnPtr.ccType, this.keyStart);

        // get number of owners
        if ( typeof( this.ccDfnPtr.invoke.nOwner ) !== 'undefined'  ) {
            this.nOwner=parseInt(this.ccDfnPtr.invoke.nOwner);
        }

        // get prefix owner name
        // moveMarbleOwner
        // "args": ["marble", "blue","35","tom"]
        if ( this.ccDfnPtr.invoke.move.fcn == 'initMarble' ) {
            this.moveMarbleOwner = this.ccDfnPtr.invoke.move.args[3];
        }
        this.moveMarbleName=ccDfnPtr.invoke.move.args[0];

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
        } else if ( (this.ccDfnPtr.invoke.query.fcn == 'queryMarbles') && (this.ccDfnPtr.invoke.query.fcn == 'queryMarblesWithPagination') ) {
            if ( typeof( this.ccDfnPtr.invoke.query.args.selector.owner ) !== 'undefined' ) {
                this.queryMarbleOwner=this.ccDfnPtr.invoke.query.args.selector.owner;
            }
            if ( typeof( this.ccDfnPtr.invoke.query.args.selector.docType ) !== 'undefined' ) {
                this.queryMarbleDocType=this.ccDfnPtr.invoke.query.args.selector.docType;
            }
        }
        this.queryMarbleName=this.ccDfnPtr.invoke.query.args[0];

        this.rqSelector = {};
        if ( (this.ccDfnPtr.invoke.query.fcn == 'queryMarbles') || (this.ccDfnPtr.invoke.query.fcn == 'queryMarblesWithPagination') ) {
            if ( typeof( this.ccDfnPtr.invoke.query.args.selector ) !== 'undefined' ) {
                this.rqSelector = this.ccDfnPtr.invoke.query.args.selector;
            }
        }
        if ( this.ccDfnPtr.invoke.query.fcn == 'queryMarblesWithPagination' ) {
            if ( typeof( this.ccDfnPtr.invoke.query.args.pagesize ) !== 'undefined' ) {
                this.pagesize = this.ccDfnPtr.invoke.query.args.pagesize;
            }
        }
    }

    getInvokeArgs(txIDVar) {
        this.arg0 ++;
        var i = 0;
        for ( i=0; i<this.keyIdx.length; i++ ) {
            this.testInvokeArgs[this.keyIdx[i]] = this.moveMarbleName+'_'+txIDVar+'_'+this.arg0;
        }
        var index=this.arg0%this.nOwner;
        if ( this.ccDfnPtr.invoke.move.fcn == 'initMarble' ) {
            this.testInvokeArgs[3]=this.moveMarbleOwner+'_'+txIDVar+'_'+index;
        }
        // marble size
        for ( i=0; i<this.keyPayLoad.length; i++ ) {
            this.testInvokeArgs[this.keyPayLoad[i]] = String(index);
        }
    }

    getQueryArgs(txIDVar) {
        if ( arguments.length !== 2 ) {
            this.arg0 ++;
        } else if ( (arguments[1] == '') || (this.arg0 == 0) ) {
            this.arg0 ++;
        }
        var keyA = this.keyStart;
        if ( this.arg0 - this.keyStart > 10 ) {
            this.keyA = this.arg0 - 10;
        }
        if ( this.ccDfnPtr.invoke.query.fcn == 'getMarblesByRange' ) {
            this.testQueryArgs[0] = this.queryMarbleName+'_'+txIDVar+'_'+keyA;
            this.testQueryArgs[1] = this.queryMarbleName+'_'+txIDVar+'_'+this.arg0;
        } else if ( this.ccDfnPtr.invoke.query.fcn == 'queryMarblesByOwner' ) {
            // marbles02 rich query: queryMarblesByOwner
            var index=this.arg0%this.nOwner;
            this.testQueryArgs[0] = this.queryMarbleOwner+'_'+txIDVar+'_'+index;
        } else if ( ( this.ccDfnPtr.invoke.query.fcn == 'queryMarbles' ) || ( this.ccDfnPtr.invoke.query.fcn == 'queryMarblesWithPagination' ) ) {
            // marbles02 rich query: queryMarbles, queryMarblesWithPagination
            var selector=0;
            var index=this.arg0%this.nOwner;
            if ( this.rqSelector ) {
                this.testQueryArgs[0]='{\"selector\":{';
                for ( let key in this.rqSelector ) {
                    if ( selector == 1 ) {
                        this.testQueryArgs[0]=this.testQueryArgs[0]+',';
                    }

                    if ( key == 'owner' ) {
                        this.testQueryArgs[0]=this.testQueryArgs[0]+'\"'+key+'\":\"'+this.queryMarbleOwner+'_'+txIDVar+'_'+index+'\"';
                    } else if ( key == 'size' ) {
                        var mSize=this.arg0%this.nOwner;
                        this.testQueryArgs[0]=this.testQueryArgs[0]+'\"'+key+'\":'+mSize;
                    } else {
                        this.testQueryArgs[0]=this.testQueryArgs[0]+'\"'+key+'\":\"'+this.rqSelector[key]+'\"';
                    }

                    if ( selector == 0 ) {
                        selector = 1;
                    }
                }
                this.testQueryArgs[0]=this.testQueryArgs[0]+'}';
            }

            this.testQueryArgs[0]=this.testQueryArgs[0]+'}';
            if ( this.ccDfnPtr.invoke.query.fcn == 'queryMarblesWithPagination' ) {
                this.testQueryArgs[1]=this.pagesize;
                this.testQueryArgs[2]=arguments[1];
            }

        } else {
            var i = 0;
            for ( i=0; i<this.keyIdx.length; i++ ) {
                this.testQueryArgs[this.keyIdx[i]] = this.queryMarbleName+'_'+txIDVar+'_'+this.arg0;
            }
        }
    }

    getExecModeLatencyFreq() {
        return 20000;
    }

    getExecModeSimpleFreq() {
        return 20000;
    }

    getExecModeProposalFreq() {
        return 20000;
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
            "initMarble": ["org1", "org2"],
            "readMarble": []
        };
    }
}

module.exports = ccFunctions;
