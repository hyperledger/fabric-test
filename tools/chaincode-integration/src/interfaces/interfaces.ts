/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Wallet } from 'fabric-network';
import { CommandModule as YargsCommandModule } from 'yargs';
import { Network } from '../network/network';

export interface CommandModule extends YargsCommandModule {
    desc: string;
}

export interface Org {
    name: string;
    cli: string;
    mspid: string;
    peers: Peer[];
    cas: CA[];
    wallet: Wallet;
    ccp: string;
    db: DB;
}

export interface BaseComponent {
    name: string;
    port: number;
    externalPort: number;
}

// tslint:disable-next-line: no-empty-interface
export interface Orderer extends BaseComponent {
}

export interface Profile {
    organisations: Org[];
}

export type LogLevels = 'info' | 'debug';
export type Languages = 'golang' | 'java' | 'node';

export interface CollectionConfig {
    docker: string;
    local: string;
}

export interface ChaincodeConfig {
    policy: string;
    collection: CollectionConfig;
}

export interface Global extends NodeJS.Global {
    CHAINCODE_LANGUAGE: Languages;
    CURRENT_NETWORK: Network;
    LOGGING_LEVEL: LogLevels;
    CHAINCODES: Map<string, ChaincodeConfig>;
}

export interface Channel {
    name: string;
    organisations: Org[];
}

// tslint:disable-next-line: no-empty-interface
export interface Peer extends BaseComponent {
    eventPort: number;
    externalEventPort: number;
}

// tslint:disable-next-line: no-empty-interface
export interface CA extends BaseComponent {
    trustedRootCert: string;
}

export interface DB extends BaseComponent {
    type: 'level' | 'couch';
}

export interface Step {
    text: string;
    complete: boolean;
}

export interface Scenario {
    name: string;
    steps: Step[];
}

export interface Feature {
    name: string;
    scenarios: Scenario[];
}
