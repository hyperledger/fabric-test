/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as Ajv from 'ajv';
import * as assert from 'assert';
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import * as fs from 'fs-extra';
import * as path from 'path';
import { then } from '../../decorators/steps';
import { Global } from '../../interfaces/interfaces';
import { Logger } from '../../utils/logger';
import { Workspace } from '../utils/workspace';

declare const global: Global;

const logger = Logger.getLogger('./src/step-definitions/chaincode/metadata.ts');

@binding([Workspace])
export class Metadata {

    public constructor(private workspace: Workspace) {
        // construct
    }

    @then(/The metadata for chaincode ['"](.*)['"] on channel ['"](.*)['"] should meet the schema/)
    public async meetsSchema(chaincodeName: string, channelName: string) {
        const schema = fs.readJSONSync(path.resolve(__dirname, '../../..', 'resources/schemas/contract-schema.json'));
        const ajv = new Ajv({schemaId: 'id'});
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

        const metadata = this.getMetadata(chaincodeName, channelName);

        const valid = ajv.validate(schema, metadata);

        if (!valid) {
            throw new Error('Chaincode metadata does not match schema: ' + JSON.stringify(ajv.errors));
        }
    }

    @then(/The metadata for chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain the contracts:$/)
    public async hasContracts(chaincodeName: string, channelName: string, contracts: TableDefinition) {
        const metadata = this.getMetadata(chaincodeName, channelName);

        const contractNames = contracts.raw()[0];

        const actual = Object.keys(metadata.contracts).filter((name) => name !== 'org.hyperledger.fabric' );

        assert.deepEqual(actual, contractNames, `Listed contracts did not match those found in metadata. Expected ${JSON.stringify(contractNames)} got ${JSON.stringify(actual)}`);
    }

    @then(/The metadata for contract ['"](.*)['"] in chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain the transactions:$/)
    public async hasTransactions(contractName: string, chaincodeName: string, channelName: string, txns: TableDefinition) {
        const metadata = this.getMetadata(chaincodeName, channelName);

        const transactionNames = txns.raw()[0];

        const contract = this.getContractMetadata(metadata, contractName);

        const actual = contract.transactions.map((txn) => this.formatTransactionName(txn.name));

        assert.deepEqual(actual, transactionNames, `Listed transactions did not match those found in metadata. Expected ${JSON.stringify(transactionNames)} got ${JSON.stringify(actual)}`);
    }

    @then(/The metadata for the transaction ['"](.*)['"] in contract ['"](.*)['"] in chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain the parameters:$/)
    public async hasParameters(txnName: string, contractName: string, chaincodeName: string, channelName: string, paramsTbl: TableDefinition) {
        const metadata = this.getMetadata(chaincodeName, channelName);
        const contract = this.getContractMetadata(metadata, contractName);
        const transaction = this.getTransactionMetadata(contract, txnName);

        const params = paramsTbl.rows();

        if (params.length !== transaction.parameters.length) {
            throw new Error(`Invalid number of parameters expected ${params.length} got ${transaction.parameters.length}`);
        }

        params.forEach((paramDef, idx) => {
            const metadataParam = transaction.parameters[idx];

            if (global.CHAINCODE_LANGUAGE !== 'golang' && paramDef[0] !== metadataParam.name) {
                throw new Error(`Invalid parameter name expected ${paramDef[0]} got ${metadataParam.name}`);
            }

            assert.deepEqual(metadataParam.schema, JSON.parse(paramDef[1]), `Parameter schema mismatch for ${metadataParam.name}. Expected ${paramDef[1]} got ${JSON.stringify(metadataParam.schema)}`);
        });
    }

    @then(/The metadata for the transaction ['"](.*)['"] in contract ['"](.*)['"] in chaincode ['"](.*)['"] on channel ['"](.*)['"] should contain the return schema ['"](.*)['"]$/)
    public async hasReturnSchema(txnName: string, contractName: string, chaincodeName: string, channelName: string, returnSchema: string) {
        const metadata = this.getMetadata(chaincodeName, channelName);
        const contract = this.getContractMetadata(metadata, contractName);
        const transaction = this.getTransactionMetadata(contract, txnName);

        if (!transaction.returns) {
            throw new Error(`Transaction ${txnName} does not have a return schema`);
        }

        assert.deepEqual(transaction.returns, JSON.parse(returnSchema), `Return schema mismatch. Expected ${returnSchema} got ${JSON.stringify(transaction.returns)}`);
    }

    @then(/The metadata for the component ['"](.*)['"] in chaincode ['"](.*)['"] on channel ['"](.*)['"] should have the properties:$/)
    public async componentHasProperty(componentName: string, chaincodeName: string, channelName: string, propertiesTbl: TableDefinition) {
        const metadata = this.getMetadata(chaincodeName, channelName);
        const component = this.getComponentMetadata(metadata, componentName);

        const properties = propertiesTbl.rows();

        const actualLength = Object.keys(component.properties).length;

        if (properties.length !== actualLength) {
            throw new Error(`Incorrect number of properties supplied for component ${componentName}. Expected ${properties.length} got ${actualLength}`);
        }

        const required = [];

        for (const property of properties) {
            if (!component.properties.hasOwnProperty(property[0])) {
                throw new Error(`Expected to find property with name ${property[0]} in component ${componentName}`);
            }

            const componentProperty = component.properties[property[0]];

            assert.deepEqual(componentProperty, JSON.parse(property[1]), `Expected component property ${property[0]} to have schema ${property[1]} got ${JSON.stringify(componentProperty)}`);

            if (property[2] === 'true') {
                required.push(property[0]);
            }
        }

        assert.deepEqual(component.required, required, `Expected required properties ${JSON.stringify(required)} got ${JSON.stringify(component.required)}`);
    }

    private getMetadata(chaincodeName: string, channelName: string) {
        const channel = this.workspace.getChannelChaincodes(channelName);
        const chaincode = channel.get(chaincodeName);

        if (!chaincode) {
            throw new Error(`Chaincode ${chaincodeName} not yet instantiated on channel ${channelName}`);
        } else if (!chaincode.metadata) {
            throw new Error(`Metadata not retrieved for ${chaincodeName} on channel ${channelName}`);
        }

        return chaincode.metadata;
    }

    private getComponentMetadata(metadata: any, componentName: string) {
        const component = metadata.components.schemas[componentName];

        if (!component) {
            throw new Error(`Could not find component ${componentName} in chaincode ${metadata.info.title}`);
        }

        return component;
    }

    private getContractMetadata(metadata: any, contractName: string) {
        const contract = metadata.contracts[contractName];

        if (!contract) {
            throw new Error(`Could not find contract ${contractName} in chaincode ${metadata.info.title}`);
        }

        return contract;
    }

    private getTransactionMetadata(contractMetadata: any, transactionName: string) {
        const transaction = contractMetadata.transactions.find((txn) => this.formatTransactionName(txn.name) === transactionName);

        if (!transaction) {
            throw new Error(`Transaction not found ${transactionName} in contract ${contractMetadata.name}`);
        }

        return transaction;
    }

    private formatTransactionName(txnName: string) {
        if (global.CHAINCODE_LANGUAGE !== 'golang') {
            return txnName;
        }

        return txnName.charAt(0).toLowerCase() + txnName.substring(1);
    }
}
