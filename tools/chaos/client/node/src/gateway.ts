/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    connect,
    Identity,
    Signer,
    signers,
    Gateway,
} from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as config from './utils/config';
import { defaultTimeout } from './utils/helper';

export interface OrgProfile {
    keyPath: string;
    certPath: string;
    tlsCertPath: string;
    mspID: string;
}

export type  ClientConnectionState = 'Ready' | 'NotStarted' | 'NotConnected';

export class GatewayHelper{

    gateway!: Gateway;

    client!: grpc.Client;

    org: OrgProfile;

    constructor(org: OrgProfile) {
        this.org = org
    }

    async configureGateway():Promise<Gateway>{
        this.client = await this.newGrpcConnection(this.org.tlsCertPath);
        this.gateway = connect({
            client:this.client,
            identity: await this.newIdentity(this.org.certPath, this.org.mspID),
            signer: await this.newSigner(this.org.keyPath),
            commitStatusOptions: () => defaultTimeout(config.statusTimeout),
            evaluateOptions:  () => defaultTimeout(config.evaluateTimeout),
            endorseOptions: () =>  defaultTimeout(config.endorseTimeout),
            submitOptions:  () => defaultTimeout(config.submitTimeout),
        });
        return this.gateway;
    }

    private async newGrpcConnection(tlsCertPath: string): Promise<grpc.Client> {
        const tlsRootCert = await fs.readFile(
            tlsCertPath
        );
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        const GrpcClient = grpc.makeGenericClientConstructor({}, '');
        return new GrpcClient(config.peerEndPoint, tlsCredentials, {
            'grpc.ssl_target_name_override': config.gatewayPeer
        });
    }

    private async newIdentity(certPath: string, mspId:string): Promise<Identity> {
        const credentials = await fs.readFile(
            certPath
        );
        return {
            mspId,
            credentials,
        };
    }

    private async newSigner(keyPath: string): Promise<Signer> {
        const privateKeyPem = await fs.readFile(
            keyPath
        );
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }

    async waitForReady(): Promise<ClientConnectionState> {

        return new Promise((resolve) => {

            if (!this.client){
                resolve('NotStarted');
            }

            const timeout = new Date().getTime() + config.grpcTimeout;
            this.client.waitForReady(timeout, (err) => {
                if (err){
                    resolve('NotConnected');
                }
                else {
                    resolve('Ready');
                }

            })
        })
    }
}
