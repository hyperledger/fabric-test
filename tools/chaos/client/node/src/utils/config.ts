/*
 * SPDX-License-Identifier: Apache-2.0
 */

import * as env from 'env-var';

export const logLevel = env.get('LOG_LEVEL')
    .default('Failure')
    .asEnum(['Failure', 'All', 'Failure&Success']);

export const orgs = env.get('ORGS')
    .required()
    .asJson();

export const org = env.get('ORG')
    .required()
    .default('Org1MSP')
    .asString();

export const maxUnfinishedTransactionCount = env.get('MAX_TRANSACTION_COUNT')
    .required()
    .default(30)
    .asIntPositive();

export const peerEndPoint = env.get('PEER_ENDPOINT')
    .required()
    .default('')
    .asString();

export const channelName = env.get('CHANNEL_NAME')
    .required()
    .default('mychannel')
    .asString();

export const chaincodeName = env.get('CHAINCODE_NAME')
    .required()
    .default('basic')
    .asString();

export const gatewayPeer = env.get('GATEWAY_PEER')
    .asString();

export const maxLimit = env.get('MAXLIMIT')
    .default(1000)
    .asIntPositive();

export const minLimit = env.get('MINLIMIT')
    .default(500)
    .asIntPositive();

export const grpcSleepMax = env.get('GRPCSLEEPMAX')
    .default(1000)
    .asIntPositive();

export const grpcSleepMin = env.get('GRPCSLEEPMIN')
    .default(500)
    .asIntPositive();

export const eventTimeout = env.get('EVENT_TIMEOUT')
    .default(5000)
    .asIntPositive();

export const statusTimeout = env.get('STATUS_TIMEOUT')
    .default(60000)
    .asIntPositive();

export const grpcTimeout = env.get('GRPC_TIMEOUT')
    .default(20000)
    .asIntPositive();

export const endorseTimeout = env.get('ENDORSE_TIMEOUT')
    .default(30000)
    .asIntPositive();

export const submitTimeout = env.get('SUBMIT_TIMEOUT')
    .default(10000)
    .asIntPositive();

export const evaluateTimeout = env.get('EVALUATE_TIMEOUT')
    .default(30000)
    .asIntPositive();

export const transactionType = env.get('TRANSACTION_TYPE')
    .default('random')
    .asEnum(['random', 'submit', 'eval']);

export const colourLogs = env.get('COLOUR_LOGS')
    .default('true')
    .asBool();

export const txStatsTimer = env.get('TXSTATS_TIMER')
    .default(5000)
    .asIntPositive();

export const txStatsMode = env.get('TXSTATS_MODE')
    .default('All')
    .asEnum(['Stalled', 'Stopped', 'Stalled&Stopped', 'All']);
