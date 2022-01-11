/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {getRandomNumber} from './utils/helper';
export interface TransactionDescriptor {
  type: 'submit' | 'eval';
  name:
    | 'readChaosAsset'
    | 'longRunningQuery'
    | 'longRunningEvaluate'
    | 'addUpdateAssets'
    | 'createUpdateChaosAsset';
  params: string[];
}

export class TransactionData {
    txnsToRun: TransactionDescriptor[] = [
        { type: 'submit', name: 'addUpdateAssets', params: ['1', '2000'] },        // add or update 1 - 2000 assets
        { type: 'eval', name: 'longRunningEvaluate', params: ['1', '2000'] },      // get state for 1 - 2000 ids
        { type: 'eval', name: 'longRunningQuery', params: ['1000'] },              // 1000 = repeat getting all the assets (1-2000) via query
        { type: 'submit', name: 'createUpdateChaosAsset', params: ['cd1', '99'] }, // create a single asset
        { type: 'eval', name: 'readChaosAsset', params: ['cd1'] },                 // read a single asset
    ];

    getTransactionDetails(type: string): TransactionDescriptor {
        if (type === 'random'){
            return this.txnsToRun[getRandomNumber(this.txnsToRun.length )];
        }
        else {
            const transData = this.txnsToRun.filter(data => data.type === type)
            return transData[getRandomNumber(transData.length)]
        }
    }
}
