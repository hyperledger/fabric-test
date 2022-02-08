/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as grpc from '@grpc/grpc-js';
import { connect } from '@hyperledger/fabric-gateway';
import { Transaction, Gateway } from '@hyperledger/fabric-gateway';
import { Feature, Global, Org } from '../../interfaces/interfaces';
import { Network } from '../../network/network';
import { Logger } from '../../utils/logger';
import { Infrastructure } from '../../infrastructure/infrastructure';
import TestNetworkProvider from '../../infrastructure/testNetworkProvider';

const logger = Logger.getLogger('./src/step-definitions/utils/workspace.ts');

declare const global: Global;

export class Workspace {
    [x: string]: any;

    public network: Network;
    public language: string;

    public feature!: Feature;
    public transactions: Map<string, Transaction>;
    public connections: Map<string, Map<string, Gateway>>;

    public actingUser!: string;
    private _actingOrg!: string;
    public resultData!: string;
    public actingChannel!: string;
    public actingChaincode!: string;
    public networkName!: string;
    public actingSDK!: string;
    public infrastructureProvider!: Infrastructure;
    public rootDir!: string;

    private _runuid!: string;

    get actingOrg(): string {
        return this._actingOrg;
    }

    set actingOrg(org: string) {
        this._actingOrg = org.replace('{UID}', this._runuid);
    }

    public grpcClient!: grpc.Client;

    public constructor() {
        this.network = global.CURRENT_NETWORK;
        this.language = global.CHAINCODE_LANGUAGE;
        this.transactions = new Map(); // Don't bother with global txns should be used in same scenario
        this.connections = global.CONNECTIONS || new Map();

        this.infrastructureProvider = global.INFRASTRUCTURE;
    }

    public async getConnection(org: Org, identityName: string): Promise<Gateway> {
        if (!this.grpcClient) {
            this.grpcClient = await this.newGrpcConnection();
        }

        if (!this.connections.has(org.name) || !this.connections.get(org.name)!.has(identityName)) {
            logger.debug(`Creating new gateway for organisation ${org.name} identity ${identityName}`);

            const gateway = connect({
                client: this.grpcClient,
                identity: await this.newIdentity(org.name, identityName),
                signer: await this.newSigner(),
                // Default timeouts for different gRPC calls
                evaluateOptions: () => {
                    return { deadline: Date.now() + 5000 }; // 5 seconds
                },
                endorseOptions: () => {
                    return { deadline: Date.now() + 15000 }; // 15 seconds
                },
                submitOptions: () => {
                    return { deadline: Date.now() + 5000 }; // 5 seconds
                },
                commitStatusOptions: () => {
                    return { deadline: Date.now() + 60000 }; // 1 minute
                },
            });
        }

        logger.debug(`Using existing gateway for organisation ${org.name} identity ${identityName}`);

        return this.connections.get(org.name)!.get(identityName)!;
    }

    public namespaceOrg(org: string): string {
        const rid = this._runuid ? this._runuid : '';
        return org.replace('{UID}', rid);
    }

    public setInfrastuctureProvider(name: string, ctx?: any): void {
        // if there's no provider already set, then create a new one
        if (!this.infrastructureProvider) {
            const config = (ctx as any)._worldObj!.parameters!;
            switch (name) {
                // case 'ansible':
                //     return new AnsibleProvider();
                // case 'microfab':
                //     return new MicrofabProvider();
                case 'TestNetwork':
                    this.infrastructureProvider = new TestNetworkProvider(config['TestNetwork']);
                    break;
                default:
                    throw new Error('Unknown Infrastructure Provider ' + name);
            }
        }
    }
}
