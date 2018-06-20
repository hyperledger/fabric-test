/**
 * Copyright IBM Corp All Rights Reserved
 *
 * SPDX-License-Identifier: Apache-2.0
 */
var path = require('path');
var fs = require('fs');
var util = require('util');
var hfc = require('fabric-client');
var Peer = require('fabric-client/lib/Peer.js');
var EventHub = require('fabric-client/lib/EventHub.js');
// const common = require('./common.js');
const common = require('./sdk/node/common.js');

let client = new hfc();

var query = function(user, userOrg, chaincode, peer, network_config_path) {
    var temptext = '\n\n Username : '+user+
                    '\n\n Org: '+userOrg+
                    '\n\n chaincode : '+util.format(chaincode)+
                    '\n\n peerNames : '+peer+
                    '\n\n network_config_path: '+network_config_path;

    let username = user.split('@')[0];
    let network_config
    try {
        network_config_path = JSON.parse(fs.readFileSync(network_config_path));
        network_config = network_config_path['network-config'];
    } catch(err) {
        console.error(err);
        return {"error": err};
    }

    let channel = client.newChannel(chaincode.channelId);

    var target = buildTarget(peer, userOrg, network_config);
    return common.getRegisteredUsers(client, user, user.split('@')[1], network_config_path['networkID'], network_config[userOrg]['mspid']).then((user) => {
        tx_id = client.newTransactionID();
        // send query
        var request = {
            targets: [target],
            chaincodeId: chaincode.chaincodeId,
            txId: tx_id,
            fcn: chaincode.fcn,
            args: chaincode.args
        };
        return channel.queryByChaincode(request);
    }, (err) => {
        console.error('Failed to get submitter \''+username+'\'');
        return 'Failed to get submitter \''+username+'\'. Error: ' + err.stack ? err.stack :
            err;
    }).then((response_payloads) => {
        if (response_payloads) {
        var jsonResponse = {'response': response_payloads.toString()};
        if (response_payloads.toString().indexOf('Error') !== -1) {
            console.info(JSON.stringify(["ok", response_payloads.toString() + '\n']));
            return JSON.stringify(jsonResponse);
        }
        console.info(JSON.stringify(["ok", "Query Result: " + response_payloads.toString() + '\n']));
        return JSON.stringify(jsonResponse);
        } else {
            console.error('response_payloads is null');
            return {'error': 'response_payloads is null'};
        }
    }, (err) => {
        console.error(['error', 'Failed to send query due to error: ' + err.stack ? err.stack : err]);
        return {'Error': 'Failed to send query due to error: ' + err.stack ? err.stack : err};
    }).catch((err) => {
        console.error(['error', 'Failed to end to end test with error:' + err.stack ? err.stack : err]);
        return {'Error': 'Failed to end to end test with error:' + err.stack ? err.stack :
            err};
    });
};

function buildTarget(peer, org, network_config) {
    var target = null;
    if (typeof peer !== 'undefined') {
        let targets = common.newPeers([peer], org, network_config, client);
        if (targets && targets.length > 0) target = targets[0];
    }
    return target;
}

// query('User1@org1.example.com', 'Org1ExampleCom', {"args": ["m"], "fcn":"get", "channelId": "behavesystest", "chaincodeId": "mycc"}, ["peer0.org1.example.com"], "/opt/gopath/src/github.com/hyperledger/fabric-test/feature/configs/704c56a4b5c711e79e510214683e8447/network-config.json");
// query('User1@org2.example.com', 'Org2ExampleCom', {"args": ["a"], "fcn":"query", "channelId": "behavesystest", "chaincodeId": "mycc"}, ["peer1.org2.example.com"], "/opt/gopath/src/github.com/hyperledger/fabric-test/feature/configs/3f09636eb35811e79e510214683e8447/network-config.json");

exports.query = query;
