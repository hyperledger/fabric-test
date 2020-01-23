/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Gateway, Transaction } from 'fabric-network';
import { ChaincodeConfig, Feature, Global, Org } from '../../interfaces/interfaces';
import { Network } from '../../network/network';
import { Logger } from '../../utils/logger';

const logger = Logger.getLogger('./src/step-definitions/utils/workspace.ts');

declare const global: Global;

export class Workspace {

    public network: Network;
    public language: string;
    public chaincodes: Map<string, ChaincodeConfig>;
    public feature: Feature;
    public transactions: Map<string, Transaction>;
    public connections: Map<string, Map<string, Gateway>>;

    public constructor() {
        this.network = global.CURRENT_NETWORK;
        this.language = global.CHAINCODE_LANGUAGE;
        this.chaincodes = global.CHAINCODES || new Map();
        this.transactions = new Map(); // Don't bother with global txns should be used in same scenario
        this.connections = global.CONNECTIONS || new Map();
    }

    public updateChaincodePolicy(chaincode: string, policy: string) {
        logger.debug(`Setting endorsement policy for ${chaincode} to:`, policy);

        const config = this.getConfig(chaincode);
        config.policy = policy;

        this.chaincodes.set(chaincode, config);
    }

    public updateChaincodeCollection(chaincode: string, collection: string) {
        logger.debug(`Setting private collection for ${chaincode} to:`, collection);

        const config = this.getConfig(chaincode);
        config.collection = {
            docker: '/etc/hyperledger/private-collections' + collection.split('private-collections')[1],
            local: collection,
        };

        this.chaincodes.set(chaincode, config);
    }

    public async getConnection(org: Org, identityName: string): Promise<Gateway> {
        if (!this.connections.has(org.name) || !this.connections.get(org.name).has(identityName)) {
            logger.debug(`Creating new gateway for organisation ${org.name} identity ${identityName}`);

            const gateway = new Gateway();
            await gateway.connect(org.ccp, {wallet: org.wallet, identity: identityName, discovery: {enabled: true, asLocalhost: true}});

            if (!this.connections.has(org.name)) {
                this.connections.set(org.name, new Map());
            }

            this.connections.get(org.name).set(identityName, gateway);

            logger.debug(`Gateway connected`);

            return gateway;
        }

        logger.debug(`Using existing gateway for organisation ${org.name} identity ${identityName}`);

        return this.connections.get(org.name).get(identityName);
    }

    private getConfig(chaincodeName: string) {
        let config: ChaincodeConfig = {
            collection: null,
            policy: null,
        };

        if (this.chaincodes.has(chaincodeName)) {
            config = this.chaincodes.get(chaincodeName);
        }

        return config;
    }
}
