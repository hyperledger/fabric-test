/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { ChaincodeConfig, Feature, Global } from '../../interfaces/interfaces';
import { Network } from '../../network/network';
import { Logger } from '../../utils/logger';

const logger = Logger.getLogger('./src/step-definitions/utils/workspace.ts');

declare const global: Global;

export class Workspace {

    public network: Network;
    public language: string;
    public chaincodes: Map<string, ChaincodeConfig>;
    public feature: Feature;

    public constructor() {
        this.network = global.CURRENT_NETWORK;
        this.language = global.CHAINCODE_LANGUAGE;
        this.chaincodes = global.CHAINCODES || new Map();
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
