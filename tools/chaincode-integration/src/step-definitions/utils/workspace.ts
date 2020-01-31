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
    public chaincodes: Map<string, Map<string, ChaincodeConfig>>;
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

    public addChaincode(channelName: string, chaincodeName: string) {
        const channel = this.getChannelChaincodes(channelName);

        if (channel.has(chaincodeName)) {
            throw new Error(`Chaincode with name ${chaincodeName} already exists on channel ${channelName}`);
        }

        channel.set(chaincodeName, {
            collection: null,
            metadata: null,
            policy: null,
        });

        this.chaincodes.set(channelName, channel);
    }

    public updateChaincodePolicy(channelName: string, chaincodeName: string, policy: string) {
        logger.debug(`Setting endorsement policy for ${chaincodeName} on channel ${channelName} to:`, policy);

        const channel = this.getChannelChaincodes(channelName);

        const config = this.getChaincodeConfig(channel, chaincodeName);
        config.policy = policy;

        channel.set(chaincodeName, config);

        this.chaincodes.set(channelName, channel);
    }

    public updateChaincodeMetadata(channelName: string, chaincodeName: string, metadata: string) {
        logger.debug(`Setting metadata for ${chaincodeName} on channel ${channelName} to:`, metadata);

        const channel = this.getChannelChaincodes(channelName);

        const config = this.getChaincodeConfig(channel, chaincodeName);
        config.metadata = JSON.parse(metadata);

        channel.set(chaincodeName, config);

        this.chaincodes.set(channelName, channel);
    }

    public updateChaincodeCollection(channelName: string, chaincodeName: string, collection: string) {
        logger.debug(`Setting private collection for ${chaincodeName} on channel ${channelName} to:`, collection);

        const channel = this.getChannelChaincodes(channelName);

        const config = this.getChaincodeConfig(channel, chaincodeName);
        config.collection = {
            docker: '/etc/hyperledger/private-collections' + collection.split('private-collections')[1],
            local: collection,
        };

        channel.set(chaincodeName, config);

        this.chaincodes.set(channelName, channel);
    }

    public getChannelChaincodes(channelName: string) {
        let chaincodes = new Map<string, ChaincodeConfig>();

        if (this.chaincodes.has(channelName)) {
            chaincodes = this.chaincodes.get(channelName);
        }

        return chaincodes;
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

    private getChaincodeConfig(channelChaincodes: Map<string, ChaincodeConfig>, chaincodeName: string) {
        let config: ChaincodeConfig = {
            collection: null,
            metadata: null,
            policy: null,
        };

        if (channelChaincodes.has(chaincodeName)) {
            config = channelChaincodes.get(chaincodeName);
        }

        return config;
    }
}
