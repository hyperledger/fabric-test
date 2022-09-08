/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import { ChaincodeConfig, Channel, Languages, Orderer, Org, Profile } from '../interfaces/interfaces';
import { Logger } from '../utils/logger';

const logger = Logger.getLogger('network.ts');

export interface NetworkDetails {
    resourceFolder: string;
    tag: string;
}

export interface NetworkConfiguration {
    organisations: Org[];
    orderers: Orderer[];
    profiles: Map<string, Profile>;
}

export class Network {
    private name: string;
    private channels: Map<string, Channel>;

    public constructor(type: string) {
        this.name = type;
        this.channels = new Map<string, Channel>();
    }

    public getOrganisations(): Org[] {
        // TODO: Implemenet this fully
        return []; // return this.config.organisations;
    }

    public addChannel(name: string): Channel {
        const c: Channel = { name, organisations: [], chaincodes: new Map() };
        this.channels.set(name, c);
        return c;
    }

    public getChannel(name: string): Channel {
        const c = this.channels.get(name);
        if (!c) {
            throw new Error(`Unable to find channel '${name}'`);
        }
        return this.channels.get(name)!;
    }

    public channelExists(name: string): boolean {
        return this.channels.has(name);
    }

    public addChaincode(name: string, chaincodeCfg: ChaincodeConfig, channelName: string): void {
        const c = this.channels.get(channelName);
        c?.chaincodes.set(name, chaincodeCfg);

        // is this needed?
        this.channels.set(channelName, c!);
    }

    public getChaincode(contract: string, channelName: string): ChaincodeConfig {
        const c = this.channels.get(channelName);
        if (!c) {
            throw new Error(`Unable to find channel '${channelName}'`);
        }

        const chaincodeCfg = c?.chaincodes.get(contract);
        if (!chaincodeCfg) {
            throw new Error(`Unable to find chaincodeCfg for contract '${contract}'`);
        }
        return chaincodeCfg;
    }

    public hasChaincode(name: string, channelName: string): boolean {
        const c = this.channels.get(channelName);
        if (c) {
            return c.chaincodes.has(name);
        } else {
            return false;
        }
    }
}
