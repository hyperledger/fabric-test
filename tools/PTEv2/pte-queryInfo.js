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


'use strict';

// fabric-sdk-node requires
const networkGateway = require('fabric-network/lib/gateway.js');
const fabricCAServices = require('fabric-ca-client');
const fabricProtos = require('fabric-protos');

const pteUtil = require('./pte-util.js');

let loggerMsg = `PTE queryInfo`;
let logger = new pteUtil.PTELogger({ "prefix": loggerMsg, "level": "info" });

/**
 * get the block heoght
 *
 * @param {string} channelName The channel name
 * @param {string} network The network object
 * @returns {object} The object of channelInfo
 **/
async function getBlockHeight(channelName, network) {
    const contractInfo = network.getContract('qscc');
    const transInfo = contractInfo.createTransaction('GetChainInfo');
    const result = await transInfo.evaluate(channelName);
    // the result is a gRPC serialized message
    const channelInfo = fabricProtos.common.BlockchainInfo.decode(result);
    return channelInfo;
}

/**
 * query block info
 *
 * @param {string} org The organization
 * @param {string} channelName The channel name
 * @param {string} cpf The connection profile that contains the org
 * @returns {object} network The network object
 **/
async function queryInfo(org, channelName, cpf) {
    try {
        // set gateway
        let orgCA = cpf.organizations[org].certificateAuthorities[0];
        const caInfo = cpf.certificateAuthorities[orgCA];
        const caTLSCACerts = caInfo.tlsCACerts['pem'];
        const ca = new fabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // create identity
        let username = pteUtil.getOrgEnrollId(cpf, org);
        let secret = pteUtil.getOrgEnrollSecret(cpf, org);

        const enrollment = await ca.enroll({
                                     enrollmentID: username,
                                     enrollmentSecret: secret
                                 });

        const x509Identity = {
                  credentials: {
                      certificate: enrollment.certificate,
                      privateKey: enrollment.key.toBytes(),
                  },
                  mspId: cpf.organizations[org].mspid,
                  type: 'X.509',
              };

        const gateway = new networkGateway.Gateway();

        // connect gateway to connection profile
        await gateway.connect(cpf, {
                  identity: x509Identity
              });

        const network = await gateway.getNetwork(channelName);
        return network;

    } catch (err) {
        logger.error(err);
        return null;
    }
}

/**
 * query block info handler
 *
 * @param {string} org The organization
 * @param {string} channelName The channel name
 * @param {string} cpf The connection profile that contains the org
 * @returns {Promise<void>}
 **/
async function QIHandler(org, channelName, cpf) {
    let network = await queryInfo(org, channelName, cpf);
    if ( network ) {
        let channelInfo = await getBlockHeight(channelName, network);
        logger.info(`[QIHandler] queryInfo channel: ${channelName}`);
        logger.info(`[QIHandler]            height: ${channelInfo.height.toString()}`);
    } else {
        logger.info('[QIHandler] invalid network');
    }
}

// module exports
module.exports.queryInfo = queryInfo;
module.exports.QIHandler = QIHandler;
