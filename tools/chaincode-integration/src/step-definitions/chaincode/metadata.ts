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
import { Global } from '../../interfaces/interfaces';
import { Logger } from '../../utils/logger';
import { Workspace } from '../utils/workspace';

declare const global: Global;

const TIMEOUT = 30 * 60 * 1000;

const logger = Logger.getLogger('metadata.ts');

@binding([Workspace])
export class Metadata {

    public constructor(private workspace: Workspace) {
        // construct
    }

    @then(/The metadata for the chaincode must meet the schema/)
    public async resultMeetsSchema(){
        const schema = fs.readJSONSync(path.resolve(__dirname, '../../..', 'resources/schemas/contract-schema.json'));
        const ajv = new Ajv({schemaId: 'id'});
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

        let metadata = this.workspace.resultData;
        const valid = ajv.validate(schema, JSON.parse(metadata));

        if (!valid) {
            throw new Error('Chaincode metadata does not match schema: ' + JSON.stringify(ajv.errors));
        }
    }


    @then(/The metadata should contain the contracts:$/)
    public async hasContracts(contracts: TableDefinition) {
        const metadata = JSON.parse(this.workspace.resultData);

        const contractNames = contracts.raw()[0];

        const actual = Object.keys(metadata.contracts).filter((name) => name !== 'org.hyperledger.fabric' );

        if (!_.isEqual(actual,contractNames)) {
            throw new Error(`Listed contracts did not match those found in metadata. Expected ${JSON.stringify(contractNames)} got ${JSON.stringify(actual)}`);
        }
    }

    @then(/The metadata for contract ['"](.*)['"] should contain the transactions:$/)
    public async hasTransactions(contract:string, txns: TableDefinition) {
        const metadata = JSON.parse(this.workspace.resultData);
        const transactionNames = txns.raw()[0];
        const actual = metadata['contracts'][contract].transactions.map((txn:any) => this.formatTransactionName(txn.name));
 
        if (!_.isEqual(actual,transactionNames)){
            throw new Error(`Listed transactions did not match those found in metadata. Expected ${JSON.stringify(transactionNames)} got ${JSON.stringify(actual)}`);
        }
    }

    @then(/The metadata for the transaction ['"](.*)['"] in contract ['"](.*)['"] should contain the parameters:$/)
    public async hasParameters(txnName: string, contract: string, paramsTbl: TableDefinition) {
        const metadata = JSON.parse(this.workspace.resultData);
        const transaction = metadata['contracts'][contract]['transactions'].filter((e:any)=>e.name===txnName)[0];
    
        const params = paramsTbl.rows();

        if (params.length !== transaction.parameters.length) {
            throw new Error(`Invalid number of parameters expected ${params.length} got ${transaction.parameters.length}`);
        }


         params.forEach((paramDef, idx) => {
             const metadataParam = transaction.parameters[idx];

        //     if (global.CHAINCODE_LANGUAGE !== 'golang' && paramDef[0] !== metadataParam.name) {
        //         throw new Error(`Invalid parameter name expected ${paramDef[0]} got ${metadataParam.name}`);
        //     }

             if (!_.isEqual(metadataParam.schema, JSON.parse(paramDef[1]))) {
               throw new Error(`Parameter schema mismatch for ${metadataParam.name}. Expected ${paramDef[1]} got ${JSON.stringify(metadataParam.schema)}`);
             }
        });
    }

    @then(/The metadata for the transaction ['"](.*)['"] in contract ['"](.*)['"] should contain the return schema ['"](.*)['"]$/)
    public async hasReturnSchema(txnName: string, contractName: string,  returnSchema: string) {
        const metadata = JSON.parse(this.workspace.resultData);

        const transaction = metadata['contracts'][contractName]['transactions'].filter((e:any)=>e.name===txnName)[0];

        if (!transaction.returns) {
            throw new Error(`Transaction ${txnName} does not have a return schema`);
        }

        if (!_.isEqual(transaction.returns, JSON.parse(returnSchema))) {
            throw new Error(`Return schema mismatch. Expected ${returnSchema} got ${JSON.stringify(transaction.returns)}`);
        }
    }

    @then(/The metadata for the component ['"](.*)['"] should have the properties:$/)
    public async componentHasProperty(componentName: string, propertiesTbl: TableDefinition) {
        const metadata = JSON.parse(this.workspace.resultData);
        const component = metadata['components']['schemas'][componentName];
 
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

            if (!_.isEqual(componentProperty, JSON.parse(property[1]))){
                throw new Error( `Expected component property ${property[0]} to have schema ${property[1]} got ${JSON.stringify(componentProperty)}`);
            }

            if (property[2] === 'true') {
                required.push(property[0]);
            }
        }
  

        if (!_.isEqual(component.required, required)){
            throw new Error(`Expected required properties ${JSON.stringify(required)} got ${JSON.stringify(component.required)}`);
        }
      
    }

    private formatTransactionName(txnName: string) {
        if (global.CHAINCODE_LANGUAGE !== 'golang') {
            return txnName;
        }

        return txnName.charAt(0).toLowerCase() + txnName.substring(1);
    }
}
