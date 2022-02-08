/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import * as path from 'path';
import { connect, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as fs from 'fs-extra';
import { Workspace } from '../step-definitions/utils/workspace';
import { ClientSDKProxy, Transaction } from './clientsdkproxy';
import { TextDecoder } from 'util';
import { Logger } from '../utils/logger';

const utf8Decoder = new TextDecoder();
export default class DefaultGateway implements ClientSDKProxy {
    private cryptoPath!: string;

    async setup(config: any, workspace: Workspace): Promise<ClientSDKProxy> {
        const LOG = Logger.getLogger('clientproxy');

        this.cryptoPath = config[workspace.infrastructureProvider.getName()]['cryptoPath'];
        LOG.info(`crypto path = ${this.cryptoPath}`);

        workspace.grpcClient = await this.newGrpcConnection(config[workspace.infrastructureProvider.getName()]);
        return this;
    }

    async sendTransaction(workspace: Workspace, tx: Transaction): Promise<string> {
        const LOG = Logger.getLogger('clientproxy');
        LOG.info(`Submitting transaction ${tx.txname}`);
        const orgMSPID = `${workspace.actingOrg}MSP`;

        const gateway = connect({
            client: workspace.grpcClient,
            identity: await this.newIdentity(workspace.actingOrg, orgMSPID, workspace.actingUser),
            signer: await this.newSigner(workspace.actingOrg, workspace.actingUser),

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
        try {
            // Get a network instance representing the channel where the smart contract is deployed.
            const network = gateway.getNetwork(workspace.actingChannel);

            // Get the smart contract from the network.
            const contractInstance = network.getContract(workspace.actingChaincode);

            let resultBytes;
            if (tx.args === undefined) {
                if (tx.shouldSubmit) {
                    resultBytes = await contractInstance.submitTransaction(tx.txname);
                } else {
                    resultBytes = await contractInstance.evaluateTransaction(tx.txname);
                }
            } else {
                if (tx.shouldSubmit) {
                    resultBytes = await contractInstance.submitTransaction(tx.txname, ...tx.args);
                } else {
                    resultBytes = await contractInstance.evaluateTransaction(tx.txname, ...tx.args);
                }
            }

            const result = utf8Decoder.decode(resultBytes);
            return result;
        } catch (e) {
            LOG.error((e as Error).toString());
            throw e;
        } finally {
            gateway.close();
        }
    }

    private async newGrpcConnection(config: any): Promise<grpc.Client> {
        const tlsCertPath = path.resolve(this.cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
        const peerEndpoint = config['peerEndpoint'];
        const tlsRootCert = await fs.readFile(tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        return new grpc.Client(peerEndpoint, tlsCredentials, {
            'grpc.ssl_target_name_override': 'peer0.org1.example.com',
        });
    }

    async newIdentity(org: string, orgMSP: string, identity: string): Promise<Identity> {
        // Path to user certificate.
        const certPath = path.resolve(
            this.cryptoPath,
            'users',
            `${identity}@${org.toLowerCase()}.example.com`,
            'msp',
            'signcerts',
            'cert.pem',
        );
        const credentials = await fs.readFile(certPath);
        return { mspId: orgMSP, credentials };
    }

    async newSigner(org: string, identity: string): Promise<Signer> {
        // Path to user private key directory.
        const keyDirectoryPath = path.resolve(
            this.cryptoPath,
            'users',
            `${identity}@${org.toLowerCase()}.example.com`,
            'msp',
            'keystore',
        );

        const files = await fs.readdir(keyDirectoryPath);
        const keyPath = path.resolve(keyDirectoryPath, files[0]);
        const privateKeyPem = await fs.readFile(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }
}
