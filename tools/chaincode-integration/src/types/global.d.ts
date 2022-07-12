/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable no-var */

import { Gateway } from '@hyperledger/fabric-gateway';
import { Infrastructure } from '../infrastructure/infrastructure';
import { Languages, LogLevels } from '../interfaces/interfaces';
import { Network } from '../network/network';

declare global {
    var CHAINCODE_LANGUAGE: Languages;
    var CURRENT_NETWORK: Network;
    var LOGGING_LEVEL: LogLevels;
    var CONNECTIONS: Map<string, Map<string, Gateway>>;
    var INFRASTRUCTURE: Infrastructure;
}

export {};
