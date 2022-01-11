/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract } from 'fabric-contract-api';
import { chown } from 'fs';
import { ChaosAsset } from './chaos-asset';
import {Logger} from './logger';

export class ChaosAssetContract extends Contract {

    public async beforeTransaction(ctx: Context) {
        Logger.logPoint(ctx);
    }

    public async afterTransaction(ctx: Context) {
        Logger.logPoint(ctx, true);
    }

    public async chaosAssetExists(ctx: Context, chaosAssetId: string): Promise<boolean> {
        const data = await ctx.stub.getState(chaosAssetId);
        return (!!data && data.length > 0);
    }

    public async readChaosAsset(ctx: Context, chaosAssetId: string): Promise<ChaosAsset> {
        const exists = await this.chaosAssetExists(ctx, chaosAssetId);
        if (!exists) {
            const noChaosAsset = new ChaosAsset();
            noChaosAsset.value = `The chaos asset ${chaosAssetId} does not exist`;
            return noChaosAsset;
        }
        const data = await ctx.stub.getState(chaosAssetId);
        const chaosAsset = JSON.parse(data.toString()) as ChaosAsset;
        return chaosAsset;
    }

    public async createUpdateChaosAsset(ctx: Context, chaosAssetId: string, newValue: string): Promise<void> {
        // Don't check for existence otherwise it could result in MVCC_READ_CONFLICT
        const chaosAsset = new ChaosAsset();
        chaosAsset.value = newValue;
        const buffer = Buffer.from(JSON.stringify(chaosAsset));
        ctx.stub.setEvent('updateAsset', buffer);
        await ctx.stub.putState(chaosAssetId, buffer);
    }

    public async deleteChaosAsset(ctx: Context, chaosAssetId: string): Promise<void> {
        // Don't check for existence otherwise it could result in MVCC_READ_CONFLICT
        await ctx.stub.deleteState(chaosAssetId);
    }

    public async longRunningQuery(ctx: Context, repeat: number) : Promise<void> {
        for (let i = 0; i < repeat; i++) {
            await ctx.stub.getStateByRange(null, null);
        }
    }
    public async longRunningEvaluate(ctx: Context, startChaosAssetId: number, endChaosAssetId: number) : Promise<void> {
        for (let id = startChaosAssetId; id <= endChaosAssetId; id++) {
            await ctx.stub.getState('' + id);
        }
    }

    public async addUpdateAssets(ctx: Context, startChaosAssetId: number, endChaosAssetId: number): Promise<void> {
        for (let id = startChaosAssetId; id <= endChaosAssetId; id++) {
            const chaosAsset = new ChaosAsset();
            chaosAsset.value = '' + id;
            const buffer = Buffer.from(JSON.stringify(chaosAsset));
            ctx.stub.setEvent('addUpdateAssets', buffer);
            await ctx.stub.putState('' + id, buffer);
        }
    }

    // could use logspout or CORE_VM_DOCKER_ATTACHSTDOUT=true to capture this crash in chaincode logs
    public async crash() {
        process.exit(99);
    }

    public async nonDeterministic(ctx: Context) {
        const rd = Math.random() * 100000;
        await ctx.stub.putState('random', Buffer.from(rd.toString()));
    }

}
