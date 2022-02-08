/* eslint-disable @typescript-eslint/no-unused-vars */
/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as assert from 'assert';
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import * as fs from 'fs-extra';
import nano from 'nano';
import { then } from '../../decorators/steps';
import { Org } from '../../interfaces/interfaces';
import { Logger } from '../../utils/logger';
import { jsonResponseEqual } from '../utils/functions';
import { Workspace } from '../utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/couchdb/couchdb.ts');

// NOTE these functions where originally used to validate updates to the world state; in the rework
// the current feature tests don't use these functions, but the skelton has been kept for potential
// future use

@binding([Workspace])
export class CouchDB {
    public constructor(private workspace: Workspace) {
        // construct
    }

    @then(
        /The world state for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain ['"](.*)['"] for key ['"](.*)['"]/,
    )
    public async readWorldState(chaincodeName: string, channelName: string, value: string, key: string): Promise<void> {
        throw new Error('Not implemented');
    }

    @then(
        /The world state for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain ['"](.*)['"] for composite key composed of:$/,
    )
    public async readWorldStateCompositeKey(
        chaincodeName: string,
        channelName: string,
        value: string,
        keyParts: TableDefinition,
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    @then(/The world state for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should not have key ['"](.*)['"]/)
    public async isDeletedFromWorldState(chaincodeName: string, channelName: string, key: string): Promise<void> {
        throw new Error('Not implemented');
    }

    @then(
        /The private data collection ['"](.*)['"] for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should not have key ['"](.*)['"]/,
    )
    public async isDeletedFromPrivateCollection(
        collectionName: string,
        chaincodeName: string,
        channelName: string,
        key: string,
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    @then(
        /The private data collection ['"](.*)['"] for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain ['"](.*)['"] for key ['"](.*)['"]/,
    )
    public async readPrivateCollectionState(
        collectionName: string,
        chaincodeName: string,
        channelName: string,
        value: string,
        key: string,
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    @then(
        /The private data collection ['"](.*)['"] for the chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain ['"](.*)['"] for composite key composed of:$/,
    )
    public async readPrivateCollectionStateCompositeKey(
        collectionName: string,
        chaincodeName: string,
        channelName: string,
        value: string,
        keyParts: TableDefinition,
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    private buildKey(keyParts: TableDefinition) {
        if (keyParts.raw().length === 0) {
            throw new Error('Missing parts for composite key');
        }

        const objectType = keyParts.raw()[0][0];
        const attrs = keyParts.raw()[0].slice(1);

        return this.createCompositeKey(objectType, attrs);
    }

    createCompositeKey(objectType: string, attrs: string[]): string {
        throw new Error('Method not implemented.');
    }

    private async checkWorldState(chaincodeName: string, channelName: string, value: string, key: string) {
        for (const org of this.workspace.network.getOrganisations()) {
            if (!org.db) {
                continue;
            }

            logger.debug(`Reading world state for ${org.name}`);

            await this.checkKeyInCollection(org, this.buildWorldStateName(channelName, chaincodeName), key, value);
        }
    }

    private async checkPrivateCollectionState(
        collectionName: string,
        chaincodeName: string,
        channelName: string,
        value: string,
        key: string,
    ) {
        const collection = await this.getCollection(channelName, chaincodeName, collectionName);
        const orgs = this.getOrgsInCollection(collection);

        for (const org of orgs) {
            if ((collection.policy as string).includes(org.name)) {
                logger.debug(`Reading private collection ${collectionName} for ${org.name}`);

                await this.checkKeyInCollection(
                    org,
                    this.buildPrivateCollectionName(channelName, chaincodeName, collectionName),
                    key,
                    value,
                );
            }
        }
    }

    private async checkKeyInCollection(org: Org, dbName: string, key: string, value: string) {
        const collection = nano(`http://127.0.0.1:${org.db.externalPort}`).db.use(dbName);
        let response: any;
        try {
            response = await collection.attachment.get(key, 'valueBytes'); // Basic puts seem to end up here - objects in the other
            response = response.toString() as string;
            logger.debug(`response is a string:`, response);
        } catch (err) {
            response = await collection.get(key);
            logger.debug(`response is an object:`, JSON.stringify(response));
        }

        if (typeof response === 'string') {
            assert.equal(value, response);
        } else {
            // response is an object
            for (const responseKey in response) {
                if (responseKey.startsWith('_') || responseKey.startsWith('~')) {
                    delete response[responseKey];
                }
            }
            if (!jsonResponseEqual(JSON.stringify(response), value)) {
                throw new Error(`Objects not equal expected ${value} got ${JSON.stringify(response)}`);
            }
        }
    }

    private async checkKeyDeletedFromCollection(org: Org, dbName: string, key: string) {
        const worldState = nano(`http://127.0.0.1:${org.db.externalPort}`).db.use(dbName);

        try {
            await worldState.get(key);
            throw new Error('Key still exists in world state');
        } catch (err) {
            if ((err as any).reason && (err! as any).reason === 'deleted') {
                return;
            }

            throw err;
        }
    }

    private async getCollection(channelName: string, chaincodeName: string, collectionName: string) {
        const collectionFile = this.workspace.getChannelChaincodes(channelName).get(chaincodeName).collection.local;

        if (!collectionFile) {
            throw new Error(`Chaincode ${chaincodeName} was not instantiated using a collections config.`);
        }

        const config: any[] = await fs.readJSON(collectionFile);

        const collection = config.find((el) => {
            return (collectionName = el.name);
        });

        if (!collection) {
            throw new Error(`Collection ${collectionName} does not exist in collections config ${collectionFile}`);
        }

        return collection;
    }

    private getOrgsInCollection(collection: any) {
        const orgs: Org[] = [];

        for (const org of this.workspace.network.getOrganisations()) {
            if ((collection.policy as string).includes(org.name)) {
                orgs.push(org);
            }
        }

        return orgs;
    }

    private buildWorldStateName(channelName: string, chaincodeName: string): string {
        return `${channelName}_${chaincodeName}`;
    }

    private buildPrivateCollectionName(channelName: string, chaincodeName: string, collectionName: string): string {
        return `${channelName}_${chaincodeName}$$p$${collectionName
            .split(/(?=[A-Z])/)
            .join('$')
            .toLowerCase()}`;
    }
}
