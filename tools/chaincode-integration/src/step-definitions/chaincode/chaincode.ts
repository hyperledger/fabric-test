/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as assert from 'assert';
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import { TransientMap } from 'fabric-client';
import { Contract, Transaction } from 'fabric-network';
import * as path from 'path';
import { given, then, when } from '../../decorators/steps';
import { Policy } from '../../policy/policy';
import { Docker } from '../../utils/docker';
import { Logger } from '../../utils/logger';
import { getEnvVarsForCli, jsonResponseEqual, sleep } from '../utils/functions';
import { Workspace } from '../utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/chaincode/chaincode.ts');

type TransactionType = 'submit' | 'evaluate';

@binding([Workspace])
export class Chaincode {

    public constructor(private workspace: Workspace) {
        // construct
    }

    @given(/All peers on channel ['"](.*)['"] have installed the chaincode ['"](.*)['"]$/)
    public async installAll(channelName: string, chaincodeName: string) {
        const channel = this.workspace.network.getChannel(channelName);

        let prefix = '';

        if (this.workspace.language !== 'golang') {
            prefix = '/opt/gopath/src/';
        } else {
            await Docker.exec(channel.organisations[0].cli, `bash -c 'cd /opt/gopath/src/github.com/hyperledger/fabric-chaincode-integration/${chaincodeName} && go mod vendor'`);
        }

        for (const org of channel.organisations) {
            for (const peer of org.peers) {
                await Docker.exec(org.cli, `bash -c '${getEnvVarsForCli(peer)} peer chaincode install -l ${this.workspace.language} -n ${chaincodeName} -v 0 -p "${prefix}github.com/hyperledger/fabric-chaincode-integration/${chaincodeName}"'`);
            }
        }
    }

    @given(/Chaincode ['"](.*)['"] when instantiated on channel ['"](.*)['"] will use endorsement policy ['"](.*)['"]$/)
    public async configureEndorsementPolicy(chaincodeName: string, channelName: string, policyName: string) {
        const policy = Policy.build(policyName, this.workspace.network.getChannel(channelName));

        this.workspace.updateChaincodePolicy(chaincodeName, policy);
    }

    @given(/Chaincode ['"](.*)['"] when instantiated on channel ['"](.*)['"] will use private data collection config ['"](.*)['"]$/)
    public async configurePrivateCollection(chaincodeName: string, __: string, collectionFile: string) {
        const collection = path.join(__dirname, '../../..', 'resources/private-collections', collectionFile);

        this.workspace.updateChaincodeCollection(chaincodeName, collection);
    }

    @given(/Organisation ['"](.*)['"] has instantiated the chaincode ['"](.*)['"] on channel ['"](.*)['"]$/)
    public async instantiateNoArgs(orgName: string, chaincodeName: string, channelName: string) {
        await this.instantiate(orgName, chaincodeName, channelName, null, null);
    }

    @given(/Organisation ['"](.*)['"] has instantiated the chaincode ['"](.*)['"] on channel ['"](.*)['"] calling ['"](.*)['"] with args:$/)
    public async instantiateWithArgs(orgName: string, chaincodeName: string, channelName: string, functionName: string, args: TableDefinition) {
        await this.instantiate(orgName, chaincodeName, channelName, functionName, args);
    }

    @given(/Organisation ['"](.*)['"] has created transaction ['"](.*)['"] for chaincode ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]/)
    public async createTransaction(orgName: string, functionName: string, chaincodeName: string, channelName: string, identityName: string) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);

        this.workspace.transactions.set(functionName, tx);
    }

    @given(/Transaction ['"](.*)['"] has transient data:$/)
    public async setTransient(functionName: string, transientDataTbl: TableDefinition) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const txn = await this.workspace.transactions.get(functionName);

        const transDataRaw = transientDataTbl.raw();

        const transientData: TransientMap = {};

        for (const row of transDataRaw) {
            transientData[row[0]] = Buffer.from(row[1]);
        }

        logger.debug(`Set transient data for transaction ${functionName}`, transientData);

        txn.setTransient(transientData);
    }

    @when(/Organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async whenSubmitNoArgs(
        orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.handleTransaction(tx, type, this.generateArgs(null));
    }

    @when(/Organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async whenSubmit(
        orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.handleTransaction(tx, type, this.generateArgs(args));
    }

    @when(/Transaction ['"](.*)['"] is (submit|evaluate)(te)?d$/)
    public async whenSubmitCreated(functionName: string, type: TransactionType, _: string) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.handleTransaction(tx, type, this.generateArgs(null));

        this.workspace.transactions.delete(functionName);
    }

    @when(/Transaction ['"](.*)['"] is (submit|evaluate)(te)?d with args:$/)
    public async whenSubmitCreatedwithArgs(functionName: string, type: TransactionType, _: string, args: TableDefinition) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.handleTransaction(tx, type, this.generateArgs(args));
    }

    @then(/Expecting an error organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async whenSubmitError(
        orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.submitExpectError(tx, type, null);
    }

    @then(/Expecting an error organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async whenSubmitErrorWithArgs(
        orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.submitExpectError(tx, type, args);
    }

    @then(/Expecting an error transaction ['"](.*)['"] is (submit|evaluate)(te)?d$/)
    public async thenSubmitErrorCreatedTx(functionName: string, type: TransactionType, _: string) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.submitExpectError(tx, type, null);

        this.workspace.transactions.delete(functionName);
    }

    @then(/Expecting an error transaction ['"](.*)['"] is (submit|evaluate)(te)?d with args:$/)
    public async thenSubmitErrorwithArgsCreatedTx(functionName: string, type: TransactionType, _: string, args: TableDefinition) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.submitExpectError(tx, type, args);

        this.workspace.transactions.delete(functionName);
    }

    @then(/Expecting the error ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async whenSubmitSpecificError(
        errMsg: string, orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.submitAndCheckError(tx, errMsg, type, null);
    }

    @then(/Expecting the error ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async whenSubmitSpecificErrorWithArgs(
        errMsg: string, orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.submitAndCheckError(tx, errMsg, type, args);
    }

    @then(/Expecting the error ['"](.*)['"] transaction ['"](.*)['"] is (submit|evaluate)(te)?d$/)
    public async thenSubmitSpecificErrorCreatedTx(errMsg: string, functionName: string, type: TransactionType, _: string) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.submitAndCheckError(tx, errMsg, type, null);

        this.workspace.transactions.delete(functionName);
    }

    @then(/Expecting the error ['"](.*)['"] transaction ['"](.*)['"] is (submit|evaluate)(te)?d with args:$/)
    public async thenSubmitSpecificErrorWithArgsCreatedTx(errMsg: string, functionName: string, type: TransactionType, _: string, args: TableDefinition) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.submitAndCheckError(tx, errMsg, type, args);

        this.workspace.transactions.delete(functionName);
    }

    @then(/Expecting result ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async thenSubmit(
        result: string, orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.submitAndCheck(tx, result, type, null);
    }

    @then(/Expecting result ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async thenSubmitWithArgs(
        result: string, orgName: string, type: TransactionType, chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        const tx = await this.buildTransaction(orgName, chaincodeName, functionName, channelName, identityName);
        await this.submitAndCheck(tx, result, type, args);
    }

    @then(/Expecting result ['"](.*)['"] transaction ['"](.*)['"] is (submit|evaluate)(te)?d$/)
    public async thenSubmitCreatedTx(result: string, functionName: string, type: TransactionType, _: string) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.submitAndCheck(tx, result, type, null);

        this.workspace.transactions.delete(functionName);
    }

    @then(/Expecting result ['"](.*)['"] transaction ['"](.*)['"] is (submit|evaluate)(te)?d with args:$/)
    public async thenSubmitCreatedTxWithArgs(result: string, functionName: string, type: TransactionType, _: string, args: TableDefinition) {
        if (!this.workspace.transactions.has(functionName)) {
            throw new Error(`Transaction "${functionName}" has not been created`);
        }

        const tx = this.workspace.transactions.get(functionName);
        await this.submitAndCheck(tx, result, type, args);

        this.workspace.transactions.delete(functionName);
    }

    private async instantiate(orgName: string, chaincodeName: string, channelName: string, functionName: string, args: TableDefinition) {
        const org = this.workspace.network.getOrganisation(orgName);
        const peer = org.peers[0];

        const orderer = this.workspace.network.getDefaultOrderer();
        const parsedArgs = this.generateCLIArgs(functionName, args);

        let policy = '';
        let collection = '';

        if (this.workspace.chaincodes.has(chaincodeName)) {
            const chaincode = this.workspace.chaincodes.get(chaincodeName);
            if (chaincode.policy) {
                policy = `-P "${chaincode.policy.split('"').join('\\"')}"`;
            }
            if (chaincode.collection) {
                collection = `--collections-config ${chaincode.collection.docker}`;
            }
        }

        await Docker.exec(org.cli, `bash -c '${getEnvVarsForCli(peer)} peer chaincode instantiate -o ${orderer.name}:${orderer.port} -l ${this.workspace.language} -C ${channelName} -n ${chaincodeName} -v 0 --tls true --cafile /etc/hyperledger/config/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem -c "{\\"Args\\": ${parsedArgs}}" ${policy} ${collection}'`);

        const attempts = 10;

        await sleep(2000);

        for (let i = 0; i < attempts; i++) {
            try {
                const tx = await this.buildTransaction(orgName, chaincodeName, 'org.hyperledger.fabric:GetMetadata', channelName, 'admin');
                await this.handleTransaction(tx, 'evaluate', []);
                break;
            } catch (err) {
                if (i === attempts - 1) {
                    console.log(err);
                    throw new Error('Waiting for chaincode to instantiate timed out');
                }
                await sleep(2000);
            }
        }
    }

    private async submitAndCheck(tx: Transaction, result: string, type: TransactionType, args: TableDefinition) {
        const data = await this.handleTransaction(tx, type, this.generateArgs(args));

        if (data !== result && !jsonResponseEqual(data, result)) {
            throw new Error(`Result did not match expected. Wanted ${result} got ${data}`);
        }
    }

    private async submitExpectError(tx: Transaction, type: TransactionType, args: TableDefinition) {
        try {
            await this.handleTransaction(tx, type, this.generateArgs(args), true);
            throw new Error('Expected transaction to fail but was successful');
        } catch (err) {
            if (err.message === 'Expected transaction to fail but was successful') {
                throw err;
            }
            return;
        }
    }

    private async submitAndCheckError(tx: Transaction, errMsg: string, type: TransactionType, args: TableDefinition) {
        try {
            await this.handleTransaction(tx, type, this.generateArgs(args), true);
            throw new Error('Expected transaction to fail but was successful');
        } catch (err) {
            assert.equal(err.message, errMsg);
        }
    }

    private async handleTransaction(tx: Transaction, type: TransactionType, args: string[], hideError: boolean = false): Promise<string> {
        logger.debug(`Handling transaction of type ${type}`);
        try {
            const data = await tx[type](...args);

            logger.debug('Got response', data.toString());

            return data.toString();
        } catch (err) {
            if (!hideError) {
                logger.error('Transaction failed', err);
            }
            throw err;
        }
    }

    private async buildTransaction(
        orgName: string, chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ): Promise<Transaction> {
        logger.debug(`Building transaction ${functionName} for chaincode ${chaincodeName} on channel ${chaincodeName} as organisation ${orgName} identity ${identityName}`);

        const contract = await this.getContract(orgName, identityName, chaincodeName, channelName);

        return contract.createTransaction(functionName);
    }

    private async getContract(orgName: string, identityName: string, chaincodeName: string, channelName: string): Promise<Contract> {
        const org = this.workspace.network.getOrganisation(orgName);
        const gateway = await this.workspace.getConnection(org, identityName);

        const channel = await gateway.getNetwork(channelName);

        logger.debug('Got channel', channelName);

        const contract = await channel.getContract(chaincodeName);

        logger.debug('Got chaincode', chaincodeName);

        return contract;
    }

    private generateArgs(args: TableDefinition): string[] {
        const txArgs = args ? args.raw()[0].map((arg) => {
            return arg;
        }) : [];

        return txArgs;
    }

    private generateCLIArgs(functionName: string, args: TableDefinition): string {
        if (!functionName || !args || args.raw().length === 0) {
            return '[]';
        }

        let data = `[\\"${functionName}\\", `;

        args.raw()[0].forEach((item) => {
            try {
                JSON.parse(item);
                data += `${JSON.stringify(item)}, `; // TODO check this works
            } catch (err) {
                data += `\\"${item}\\", `;
            }
        });

        data = data.substring(0, data.length - 2) + ']';

        return data;
    }
}
