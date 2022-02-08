/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import { Workspace } from '../step-definitions/utils/workspace';
import { Logger } from '../utils/logger';
import DefaultGateway from './defaultgateway';

/**
 * A ClientSDK proxy is the interface used by the tests to send transactions.
 * The proxy is here so that multiple clients can be run from the same set of tests.
 *
 * For example by running the clients as separate rest servers, different versions
 * and implications can be tested.
 */

/** Defines the transaction that should be sent
 */
export interface Transaction {
    txname: string;
    user: string;
    args: string[] | undefined;
    // transientArgs: any; // TODO
    shouldSubmit: boolean;
}

export interface ClientSDKProxy {
    setup(config: any, workspace: Workspace): Promise<ClientSDKProxy>;
    sendTransaction(workspace: Workspace, tx: Transaction): Promise<string>;
}

export async function getClientProxy(name: string, ctx: any, timeout?: number): Promise<ClientSDKProxy> {
    const config = (ctx as any)._worldObj!.parameters!;
    let sdkProxy;
    switch (name) {
        // case 'ansible':
        //     return new AnsibleProvider();
        // case 'microfab':
        //     return new MicrofabProvider();
        case 'defaultgateway':
            sdkProxy = new DefaultGateway();
            break;
        default:
            throw new Error('Unknown Infrastructure Provider');
    }
    Logger.getLogger('clientproxy').info(`Returning ClientProxy=${name}`);
    return await sdkProxy.setup(config, ctx.workspace);
}
