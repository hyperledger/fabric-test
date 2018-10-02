/**
 * Copyright IBM Corp All Rights Reserved
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const fs = require('fs');
const util = require('util');
const hfc = require('fabric-client');
const {Gateway, InMemoryWallet, X509WalletMixin} = require('fabric-network');
const common = require('./common.js');
const client = new hfc();

/**
 * Perform an "invoke" action on installed/instantiated chaincode
 * @param {String} username the username
 * @param {String} org the organisation to use
 * @param {String} cc string in JSON format describing the chaincode parameters
 * @param {String} inputPeerNames the peers to use
 * @param {String} orderer the orderer to use
 * @param {String} network_config_path the network configuration file path
 * @param {String} options string in JSON format containing additional test parameters
 */
function invoke(username, org, cc, inputPeerNames, orderer, network_config_path, options) {

    const chaincode = JSON.parse(cc);
    let opts;

    if (options){
        opts = JSON.parse(options);
    }

    const temptext = '\n\n Username : '+ username +
                    '\n\n Org: '+ org +
                    '\n\n chaincode : '+ util.format(chaincode) +
                    '\n\n peerNames : '+ inputPeerNames +
                    '\n\n orderer: '+ orderer +
                    '\n\n network_config_path: '+ network_config_path +
                    '\n\n opts: '+ opts;

    // Read Network JSON PATH from behave
    let network_config;
    try {
        network_config = JSON.parse(fs.readFileSync(network_config_path));
    } catch(err) {
        throw new Error('network_config error: ' + err.message);
    }

    // Node SDK implements transaction as well as invoke, disambiguate on the passed opts
    if(opts && opts['network-model'] && opts['network-model'].localeCompare("true") === 0){
        return _submitTransaction(org, chaincode, network_config)
    } else {
        // inputPeerNames is a string representation of an array of peers "[peer,peer,...,peer]"
        // need to convert to an actual array [peer,peer,...,peer]
        const peerList = inputPeerNames.slice(1, -1);
        let peerNames = peerList.split(",");
        return _invoke(username, org, chaincode, peerNames, orderer, network_config)
    }
};

/**
 * Perform an invoke using the NodeSDK
 * @param {Strinrg} username the user name to perform the action under
 * @param {String} org the organisation to use
 * @param {JSON} chaincode the chaincode descriptor
 * @param {[String]} peerNames string array of peers
 * @param {String} orderer the orderer
 * @param {JSON} network_config the network configuration
 */
function _invoke(username, org, chaincode, peerNames, orderer, network_config) {
    let channel;

    let targets = (peerNames) ? common.newPeers(peerNames, org, network_config['network-config'], client) : undefined;

    let tx_id = null;
    return common.getRegisteredUsers(client, username, username.split('@')[1], network_config['networkID'], network_config['network-config'][org]['mspid']).then((user) => {
        tx_id = client.newTransactionID();

        channel = client.newChannel(chaincode.channelId);
        channel.addOrderer(common.newOrderer(client, network_config['network-config'], orderer, network_config['tls']));
        common.setupPeers(peerNames, channel, org, client, network_config['network-config'], network_config['tls']);

        // send proposal to endorser
        let request = {
            chaincodeId: chaincode.chaincodeId,
            fcn: chaincode.fcn,
            args: chaincode.args,
            chainId: chaincode.channelId,
            txId: tx_id
        };

        if (targets) {
            request.targets = targets;
        }

        console.info(JSON.stringify(["ok", "request is set"]));
        return channel.sendTransactionProposal(request, 120000);
    }, (err) => {
        console.error('Failed to enroll user \'' + username + '\'. ' + err);
    throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
    }).then((results) => {
        console.info(JSON.stringify(["ok", "proposal sent"]));
        let proposalResponses = results[0];
        let proposal = results[1];
        let all_good = true;
        for (var i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[i].response &&
                    proposalResponses[i].response.status === 200) {
                one_good = true;
            } else {
                console.error('transaction proposal was bad');
            }
            all_good = all_good & one_good;
        }
        if (all_good) {
            var request = {
                proposalResponses: proposalResponses,
                proposal: proposal
            };
            // set the transaction listener and set a timeout of 30sec
            // if the transaction did not get committed within the timeout period,
            // fail the test
            let eventPromises = [];

            if (!peerNames) {
                peerNames = channel.getPeers().map(function(peer) {
                    return peer.getName();
                });
            }

            let sendPromise = channel.sendTransaction(request);
            return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
                return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
            }).catch((err) => {
                console.error(JSON.stringify(
                    ["error", 'Failed to send transaction and get notifications within the timeout period.']
		    )
                );
                return 'Failed to send transaction and get notifications within the timeout period.';
            });
        } else {
            console.error(
                'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
            );
            return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
        }
    }, (err) => {
        console.error('Failed to send proposal due to error: ' + err.stack ? err.stack :
                err);
        return 'Failed to send proposal due to error: ' + err.stack ? err.stack :
                err;
    }).then((response) => {
        if (response.status === 'SUCCESS') {
            var jsonResponse = ["ok", tx_id.getTransactionID().toString()];
            console.info(JSON.stringify(jsonResponse));
            return JSON.stringify(jsonResponse);
        } else {
            console.error(JSON.stringify(["ok", 'Failed to order the transaction. Error code: ' + response]));
            return 'Failed to order the transaction. Error code: ' + response.status;
        }
    }, (err) => {
        console.error('Failed to send transaction due to error: ' + err.stack ? err
            .stack : err);
        return 'Failed to send transaction due to error: ' + err.stack ? err.stack :
            err;
    });
}

/**
 * Perform a transaction invoke using the network APIs
 * @param {String} org the organisation to use
 * @param {JSON} chaincode the chaincode descriptor
 * @param {JSON} network_config the network configuration
 */
async function _submitTransaction(org, chaincode, network_config){
    const ccp = network_config['common-connection-profile'];
    const orgConfig = ccp.organizations[org];
    const cert = common.readAllFiles(orgConfig.signedCertPEM)[0];
    const key = common.readAllFiles(orgConfig.adminPrivateKeyPEM)[0];
    const inMemoryWallet = new InMemoryWallet();

    const gateway = new Gateway();

    try {
        await inMemoryWallet.import('admin', X509WalletMixin.createIdentity(orgConfig.mspid, cert, key));

        const opts = {
            wallet: inMemoryWallet,
            identity: 'admin',
            discovery: { enabled: false }
        };

        await gateway.connect(ccp, opts);

        const network = await gateway.getNetwork(chaincode.channelId)
        const contract = await network.getContract(chaincode.chaincodeId);

        const args = [chaincode.fcn, ...chaincode.args];
        const result = await contract.submitTransaction(...args);

        gateway.disconnect();
        return result;
    } catch(err) {
        throw new Error(err);
    };
}

exports.invoke = invoke;
require('make-runnable');

// Example test calls
// node invoke.js invoke User1@org1.example.com Org1ExampleCom '{"channelId": "behavesystest", "args": ["a", "b", "10"], "chaincodeId": "mycc", "name": "mycc", "fcn": "invoke"}' ['peer0.org1.example.com'] orderer0.example.com /Users/nkl/go/src/github.com/hyperledger/fabric-test/feature/configs/0be5908ac30011e88d70acbc32c08695/network-config.json '{"transaction": "true"}'
// node invoke.js invoke User1@org1.example.com Org1ExampleCom '{"channelId": "behavesystest", "args": ["a", "b", "10"], "chaincodeId": "mycc", "name": "mycc", "fcn": "invoke"}' ['peer0.org1.example.com'] orderer0.example.com /Users/nkl/go/src/github.com/hyperledger/fabric-test/feature/configs/4fe4f54cc62411e8977eacbc32c08695/network-config.json '{"transaction": "true"}'