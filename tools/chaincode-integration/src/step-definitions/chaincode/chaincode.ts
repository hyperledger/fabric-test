/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as assert from 'assert';
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import { Gateway } from 'fabric-network';
import * as path from 'path';
import { given, then, when } from '../../decorators/steps';
import { Policy } from '../../policy/policy';
import { Docker } from '../../utils/docker';
import { Logger } from '../../utils/logger';
import { getEnvVarsForCli, jsonResponseEqual, sleep } from '../utils/functions';
import { Workspace } from '../utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/chaincode/chaincode.ts');

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

    @when(/Organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async whenSubmitNoArgs(
        orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(null));
    }

    @when(/Organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async whenSubmit(
        orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(args));
    }

    @then(/Expecting an error organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async whenSubmitError(
        orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        try {
            await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(null), true);
            throw new Error('Expected transaction to fail but was successful');
        } catch (err) {
            if (err.message === 'Expected transaction to fail but was successful') {
                throw err;
            }
            return;
        }
    }

    @then(/Expecting an error organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async whenSubmitErrorWithArgs(
        orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        try {
            await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(args), true);
            throw new Error('Expected transaction to fail but was successful');
        } catch (err) {
            if (err.message === 'Expected transaction to fail but was successful') {
                throw err;
            }
            return;
        }
    }

    @then(/Expecting the error ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async whenSubmitSpecificError(
        errMsg: string, orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        try {
            await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(null), true);
            throw new Error('Expected transaction to fail but was successful');
        } catch (err) {
            assert.equal(err.message, errMsg);
        }
    }

    @then(/Expecting the error ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async whenSubmitSpecificErrorWithArgs(
        errMsg: string, orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        try {
            await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(args), true);
            throw new Error('Expected transaction to fail but was successful');
        } catch (err) {
            assert.equal(err.message, errMsg);
        }
    }

    @then(/Expecting result ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"]$/)
    public async thenSubmit(
        result: string, orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
    ) {
        await this.submitAndCheck(result, orgName, type, chaincodeName, functionName, channelName, identityName, null);
    }

    @then(/Expecting result ['"](.*)['"] organisation ['"](.*)['"] (submit|evaluate)s against the chaincode ['"](.*)['"] the transaction ['"](.*)['"] on channel ['"](.*)['"] as ['"](.*)['"] with args:$/)
    public async thenSubmitWithArgs(
        result: string, orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        await this.submitAndCheck(result, orgName, type, chaincodeName, functionName, channelName, identityName, args);
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
                await this.handleTransaction(org.name, 'evaluate', chaincodeName, 'org.hyperledger.fabric:GetMetadata', channelName, 'admin', []);
                break;
            } catch (err) {
                if (i === attempts - 1) {
                    console.log(err);
                    throw new Error('Waiting for chaincode to insantiate timedout');
                }
                await sleep(2000);
            }
        }
    }

    private async submitAndCheck(
        result: string, orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string,
        args: TableDefinition,
    ) {
        const data = await this.handleTransaction(orgName, type, chaincodeName, functionName, channelName, identityName, this.generateArgs(args));

        if (data !== result && !jsonResponseEqual(data, result)) {
            throw new Error(`Result did not match expected. Wanted ${result} got ${data}`);
        }
    }

    private async handleTransaction(
        orgName: string, type: 'submit' | 'evaluate', chaincodeName: string, functionName: string, channelName: string, identityName: string, args: string[],
        hideError: boolean = false,
    ): Promise<string> {
        logger.debug(`Handling transaction of type ${type}`);

        const org = this.workspace.network.getOrganisation(orgName);

        const gateway = new Gateway();
        await gateway.connect(org.ccp, { wallet: org.wallet, identity: identityName, discovery: { enabled: true, asLocalhost: true } });

        logger.debug('Gateway connected');

        const channel = await gateway.getNetwork(channelName);

        logger.debug('Got channel', channelName);

        const contract = await channel.getContract(chaincodeName);

        logger.debug('Got chaincode', chaincodeName);

        const tx = contract.createTransaction(functionName);

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
