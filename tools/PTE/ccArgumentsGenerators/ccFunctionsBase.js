class ccFunctionsBase {
	constructor(ccDfnPtr, logger, Nid, channelName, org, pid) {
		this.ccDfnPtr = ccDfnPtr;
		this.logger = logger;
		this.Nid = Nid;
		this.channelName = channelName;
		this.org = org;
		this.pid = pid;
		this.keyStart = 0;
		this.payLoadMin = 0;
		this.payLoadMax = 0;
		this.payLoadType = 'RANDOM';
		this.arg0 = 0;
		this.keyIdx = [];
		if (typeof( this.ccDfnPtr.ccOpt.keyIdx ) !== 'undefined') {
			for (let i=0; i<this.ccDfnPtr.ccOpt.keyIdx.length; i++) {
				this.keyIdx.push(this.ccDfnPtr.ccOpt.keyIdx[i]);
			}
		}
		logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] keyIdx: ', this.Nid, this.channelName, this.org, this.pid, this.keyIdx);
		this.testInvokeArgs = [];
		for (let i=0; i<this.ccDfnPtr.invoke.move.args.length; i++) {
			this.testInvokeArgs.push(this.ccDfnPtr.invoke.move.args[i]);
		}
		this.testQueryArgs = [];
		for (let i=0; i<this.ccDfnPtr.invoke.query.args.length; i++) {
			this.testQueryArgs.push(this.ccDfnPtr.invoke.query.args[i]);
		}
		this.keyPayLoad = [];
		if (typeof( this.ccDfnPtr.ccOpt.keyPayLoad ) !== 'undefined') {
			for (let i=0; i<this.ccDfnPtr.ccOpt.keyPayLoad.length; i++) {
				this.keyPayLoad.push(this.ccDfnPtr.ccOpt.keyPayLoad[i]);
			}
		}
		this.logger.info('[Nid:chan:org:id=%d:%s:%s:%d pte-execRequest] keyPayLoad: ', this.Nid, this.channelName, this.org, this.pid, this.keyPayLoad);
	}
}

module.exports = ccFunctionsBase;
