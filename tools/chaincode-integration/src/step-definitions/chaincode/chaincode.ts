/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow';

import { given, when } from '../../decorators/steps';
import { getClientProxy } from '../../infrastructure/clientsdkproxy';
import { jsonResponseEqual } from '../utils/functions';
import { Workspace } from '../utils/workspace';

// sometimes creating cloud resources takes a long time
const TIMEOUT = 30 * 60 * 1000;
type TransactionType = 'submit' | 'evaluate';

@binding([Workspace])
export class Chaincode {
    public constructor(private workspace: Workspace) {
        // construct
    }

    @given(/I have retrieved the metadata for chaincode ['"](.*)['"] on channel ['"](.*)['"]$/)
    public async getMetadata(chaincodeName: string, channelName: string): Promise<void> {
        const clientSDK = await getClientProxy(this.workspace.actingSDK, this, TIMEOUT);
        this.workspace.actingChannel = channelName;
        this.workspace.actingChaincode = chaincodeName;
        const tx = {
            txname: 'org.hyperledger.fabric:GetMetadata',
            user: this.workspace.actingUser,
            args: undefined,
            org: this.workspace.actingOrg,
            shouldSubmit: false,
        };
        const metadata = await clientSDK.sendTransaction(this.workspace, tx);

        this.workspace.resultData = metadata;
    }

    @when(/Connecting to network ['"](.*)['"]$/, '', TIMEOUT)
    public async setNetworkName(networkName: string): Promise<void> {
        this.workspace.networkName = networkName;
    }

    @when(/Acting as Organization ['"](.*)['"] user ['"](.*)['"]$/, '', TIMEOUT)
    public async setOrgUser(org: string, user: string): Promise<void> {
        this.workspace.actingUser = user;
        this.workspace.actingOrg = this.workspace.namespaceOrg(org);
    }

    @when(/Using chaincode ['"](.*)['"] on channel ['"](.*)['"]$/, '', TIMEOUT)
    public async setActingChaincodeChannel(chaincode: string, channel: string): Promise<void> {
        this.workspace.actingChannel = channel;
        this.workspace.actingChaincode = chaincode;
    }

    @when(/Using chaincode-as-a-service ['"](.*)['"] on channel ['"](.*)['"]$/, '', TIMEOUT)
    public async setActingChaincodeAASChannel(chaincode: string, channel: string): Promise<void> {
        this.workspace.actingChannel = channel;
        this.workspace.actingChaincode = `${chaincode}-ccaas`;
    }

    @when(/Connecting via SDK ['"](.*)['"]$/, '', TIMEOUT)
    public async setActingSDK(sdk: string): Promise<void> {
        this.workspace.actingSDK = sdk;
    }

    @when(/(Submit|Evaluate)s a transaction ['"](.*)['"]$/, '', TIMEOUT)
    public async sendsTxNoArgs(type: TransactionType, functionName: string): Promise<void> {
        const clientSDK = await getClientProxy(this.workspace.actingSDK, this, TIMEOUT);

        const tx = {
            txname: functionName,
            user: this.workspace.actingUser,
            args: undefined,
            org: this.workspace.actingOrg,
            shouldSubmit: type.toLowerCase() === 'submit',
        };
        this.workspace.resultData = await clientSDK.sendTransaction(this.workspace, tx);
    }

    @when(/(Submit|Evaluate)s a transaction ['"](.*)['"] with args:$/, '', TIMEOUT)
    public async sendsTxArgs(type: TransactionType, functionName: string, args: TableDefinition): Promise<void> {
        const clientSDK = await getClientProxy(this.workspace.actingSDK, this, TIMEOUT);

        const tx = {
            txname: functionName,
            user: this.workspace.actingUser,
            args: this.generateArgs(args),
            org: this.workspace.actingOrg,
            shouldSubmit: type.toLowerCase() === 'submit',
        };
        this.workspace.resultData = await clientSDK.sendTransaction(this.workspace, tx);
    }

    @when(/The result should be ['"](.*)['"]$/, '', TIMEOUT)
    public async checkResult(expected: string): Promise<void> {
        if (this.workspace.resultData !== expected) {
            throw new Error(`Result of ${this.workspace.resultData} does not match expected ${expected}`);
        }
    }

    @when(/The JSON result should be ['"](.*)['"]$/, '', TIMEOUT)
    public async checkJSONResult(expected: string): Promise<void> {
        if (!jsonResponseEqual(this.workspace.resultData, expected)) {
            throw new Error(`Result of ${this.workspace.resultData} does not match expected ${expected}`);
        }
    }

    @when(/Transaction ['"](getState|existsState)['"] should return ['"](.*)['"] for key ['"](.*)['"]$/, '', TIMEOUT)
    public async checkState(checkFn: string, expected: string, key: string): Promise<void> {
        const clientSDK = await getClientProxy(this.workspace.actingSDK, this, TIMEOUT);

        const tx = {
            txname: checkFn,
            user: this.workspace.actingUser,
            args: [key],
            org: this.workspace.actingOrg,
            shouldSubmit: false,
        };

        this.workspace.resultData = await clientSDK.sendTransaction(this.workspace, tx);
        if (this.workspace.resultData !== expected) {
            throw new Error(`Result of ${this.workspace.resultData} does not match expected ${expected}`);
        }
    }

    // Parse the cucumber tablet definition to an array
    private generateArgs(args: TableDefinition): string[] {
        const txArgs = args
            ? args.raw()[0].map((arg) => {
                  return arg;
              })
            : [];

        return txArgs;
    }
}
