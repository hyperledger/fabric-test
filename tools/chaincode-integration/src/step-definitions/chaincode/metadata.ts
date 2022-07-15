/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import Ajv from 'ajv';
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'path';
import { then } from '../../decorators/steps';
import { Languages } from '../../interfaces/interfaces';

import { Workspace } from '../utils/workspace';

@binding([Workspace])
export class Metadata {
    public constructor(private workspace: Workspace) {
        // construct
    }

    @then(/The metadata for the chaincode must meet the schema/)
    public async resultMeetsSchema(): Promise<void> {
        const schema = fs.readJSONSync(path.resolve(__dirname, '../../..', 'resources/schemas/contract-schema.json'));
        const ajv = new Ajv({ schemaId: 'id' });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

        const metadata = this.workspace.resultData;
        const valid = ajv.validate(schema, JSON.parse(metadata));

        if (!valid) {
            throw new Error('Chaincode metadata does not match schema: ' + JSON.stringify(ajv.errors));
        }
    }

    @then(/The metadata should contain the contracts:$/)
    public async hasContracts(contracts: TableDefinition): Promise<void> {
        const metadata = JSON.parse(this.workspace.resultData);

        const contractNames = contracts.raw()[0];

        const actual = Object.keys(metadata.contracts).filter((name) => name !== 'org.hyperledger.fabric');

        if (!_.isEqual(actual, contractNames)) {
            throw new Error(
                `Listed contracts did not match those found in metadata. Expected ${JSON.stringify(
                    contractNames,
                )} got ${JSON.stringify(actual)}`,
            );
        }
    }

    @then(/The metadata for contract ['"](.*)['"] should contain the transactions:$/)
    public async hasTransactions(contract: string, txns: TableDefinition): Promise<void> {
        const metadata = JSON.parse(this.workspace.resultData);
        const transactionNames = txns.raw()[0].sort();

        const chaincodeCfg = this.workspace.network.getChaincode(
            this.workspace.actingChaincode,
            this.workspace.actingChannel,
        );

        const actual = metadata['contracts'][contract].transactions
            .map((txn: any) => this.formatTransactionName(txn.name, chaincodeCfg.language))
            .sort();

        if (!_.isEqual(actual, transactionNames)) {
            throw new Error(
                `Listed transactions did not match those found in metadata. Expected ${JSON.stringify(
                    transactionNames,
                )} got ${JSON.stringify(actual)}`,
            );
        }
    }

    @then(/The metadata for the transaction ['"](.*)['"] in contract ['"](.*)['"] should contain the parameters:$/)
    public async hasParameters(txnName: string, contract: string, paramsTbl: TableDefinition): Promise<void> {
        const metadata = JSON.parse(this.workspace.resultData);
        const transaction = metadata['contracts'][contract]['transactions'].filter(
            (e: any) => e.name.toLowerCase() === txnName.toLowerCase(),
        )[0];

        const params = paramsTbl.rows();

        if (params.length !== transaction.parameters.length) {
            throw new Error(
                `Invalid number of parameters expected ${params.length} got ${transaction.parameters.length}`,
            );
        }

        params.forEach((paramDef, idx) => {
            const metadataParam = transaction.parameters[idx];

            if (!_.isEqual(metadataParam.schema, JSON.parse(paramDef[1]))) {
                throw new Error(
                    `Parameter schema mismatch for ${metadataParam.name}. Expected ${paramDef[1]} got ${JSON.stringify(
                        metadataParam.schema,
                    )}`,
                );
            }
        });
    }

    @then(
        /The metadata for the transaction ['"](.*)['"] in contract ['"](.*)['"] should contain the return schema ['"](.*)['"]$/,
    )
    public async hasReturnSchema(txnName: string, contractName: string, returnSchema: string): Promise<void> {
        const metadata = JSON.parse(this.workspace.resultData);

        const transaction = metadata['contracts'][contractName]['transactions'].filter(
            (e: any) => e.name.toLowerCase() === txnName.toLowerCase(),
        )[0];

        if (!transaction.returns) {
            throw new Error(`Transaction ${txnName} does not have a return schema`);
        }

        if (!_.isEqual(transaction.returns, JSON.parse(returnSchema))) {
            throw new Error(
                `Return schema mismatch. Expected ${returnSchema} got ${JSON.stringify(transaction.returns)}`,
            );
        }
    }

    @then(/The metadata for the component ['"](.*)['"] should have the properties:$/)
    public async componentHasProperty(componentName: string, propertiesTbl: TableDefinition): Promise<void> {
        const metadata = JSON.parse(this.workspace.resultData);
        const component = metadata['components']['schemas'][componentName];

        const properties = propertiesTbl.rows();

        const actualLength = Object.keys(component.properties).length;

        if (properties.length !== actualLength) {
            throw new Error(
                `Incorrect number of properties supplied for component ${componentName}. Expected ${properties.length} got ${actualLength}`,
            );
        }

        const required = [];

        for (const property of properties) {
            if (!component.properties.hasOwnProperty(property[0])) {
                throw new Error(`Expected to find property with name ${property[0]} in component ${componentName}`);
            }

            const componentProperty = component.properties[property[0]];

            if (!_.isEqual(componentProperty, JSON.parse(property[1]))) {
                throw new Error(
                    `Expected component property ${property[0]} to have schema ${property[1]} got ${JSON.stringify(
                        componentProperty,
                    )}`,
                );
            }

            if (property[2] === 'true') {
                required.push(property[0]);
            }
        }

        if (!_.isEqual(component.required, required)) {
            throw new Error(
                `Expected required properties ${JSON.stringify(required)} got ${JSON.stringify(component.required)}`,
            );
        }
    }

    private formatTransactionName(txnName: string, lang: Languages) {
        if (lang !== 'golang') {
            return txnName;
        }

        return txnName.charAt(0).toLowerCase() + txnName.substring(1);
    }
}
