/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as assert from 'assert';
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import { ChaincodeStub } from 'fabric-shim';
import * as nano from 'nano';
import { then } from '../../decorators/steps';
import { Logger } from '../../utils/logger';
import { jsonResponseEqual } from '../utils/functions';
import { Workspace } from '../utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/couchdb/couchdb.ts');

@binding([Workspace])
export class CouchDB {

    public constructor(private workspace: Workspace) {
        // construct
    }

    @then(/The world state for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain ['"](.*)['"] for key ['"](.*)['"]/)
    public async readWorldState(chaincodeName: string, channelName: string, value: string, key: string) {
        await this.checkWorldState(chaincodeName, channelName, value, key);
    }

    @then(/The world state for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain ['"](.*)['"] for composite key composed of:$/)
    public async readWorldStateCompositeKey(chaincodeName: string, channelName: string, value: string, keyParts: TableDefinition) {
        if (keyParts.raw().length === 0) {
            throw new Error('Missing parts for composite key');
        }

        const objectType = keyParts.raw()[0][0];
        const attrs = keyParts.raw()[0].slice(1);

        const key = ChaincodeStub.prototype.createCompositeKey(objectType, attrs);

        await this.checkWorldState(chaincodeName, channelName, value, key);
    }

    @then(/The world state for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should not have key ['"](.*)['"]/)
    public async isDeletedFromWorldState(chaincodeName: string, channelName: string, key: string) {
        for (const org of this.workspace.network.getOrganisations()) {
            if (!org.db) {
                continue;
            }

            const worldState = nano(`http://127.0.0.1:${org.db.externalPort}`).db.use(`${channelName}_${chaincodeName}`);

            try {
                await worldState.get(key);
                throw new Error('Key still exists in world state');
            } catch (err) {
                if (err.reason && err.reason === 'deleted') {
                    return;
                }

                throw err;
            }
        }
    }

    private async checkWorldState(chaincodeName: string, channelName: string, value: string, key: string) {
        for (const org of this.workspace.network.getOrganisations()) {
            logger.info(`Reading world state for ${org.name}`);

            if (!org.db) {
                continue;
            }

            const worldState = nano(`http://127.0.0.1:${org.db.externalPort}`).db.use(`${channelName}_${chaincodeName}`);

            let resp;
            try {
                resp = await worldState.attachment.get(key, 'valueBytes'); // Basic puts seem to end up here - objects in the other
            } catch (err) {
                resp = await worldState.get(key);
            }

            if (typeof resp === 'string') {
                assert.equal(value, resp);
            } else {
                for (const respKey in resp) {
                    if (respKey.startsWith('_') || respKey.startsWith('~')) {
                        delete resp[respKey];
                    }
                }

                if (!jsonResponseEqual(JSON.stringify(resp), value)) {
                    throw new Error(`Objects not equal expected ${value} got ${JSON.stringify(resp)}`);
                }
            }
        }
    }
}
