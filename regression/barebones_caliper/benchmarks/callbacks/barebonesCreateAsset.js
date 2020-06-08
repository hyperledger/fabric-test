'use strict';

const contractID = 'mapcc';
const version = '0';

let bc, ctx, clientIdx, invokeCount, queryCount;

module.exports.init = async function(blockchain, context, args) {
    bc = blockchain;
    ctx = context;

    clientIdx = ctx.clientIdx;    // worker id

    invokeCount = 0;
    queryCount = 0;
};

module.exports.run = function() {
    const assetID = `${contractID}_${clientIdx}_${invokeCount}`
    const myArgs = {
        chaincodeFunction: 'invoke',
        chaincodeArguments: ['getPut', assetID, '1']
    };
    invokeCount++;
    return bc.bcObj.invokeSmartContract(ctx, contractID, version, myArgs);
};

module.exports.end = async function() {
    const assetID = `${contractID}_${clientIdx}_${queryCount}`
    const myArgs = {
        chaincodeFunction: 'invoke',
        chaincodeArguments: ['get', assetID]
    };
    queryCount++;
    return bc.bcObj.invokeSmartContract(ctx, contractID, version, myArgs);

};
