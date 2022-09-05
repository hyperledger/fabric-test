/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import { Network } from '../network/network';
import { Workspace } from '../step-definitions/utils/workspace';
import { shellcmds } from '../utils/shell';

import { Infrastructure } from './infrastructure';

/** This Infrasfructure provider uses the testnetwork as defined in the fabric-samples repo.
 * The `use-existing` flag is useful when developing to reuse the deployed network, channels
 * and chaincodes.
 */

export default class TestNetworkProvider implements Infrastructure {
    private cfg: any;

    public constructor(cfg: any) {
        this.cfg = cfg;
    }

    async setup(workspace: Workspace, profileName: string, channelName: string): Promise<void> {
        const testNetworkPath = this.cfg.rootDir!;
        const useExisting = process.env.TEST_NETWORK_EXISTING || this.cfg.useExisting || workspace.network;
        if (!useExisting) {
            const cmds = [
                `${this.cfg.env} ./network.sh down`,
                `${this.cfg.env} ./network.sh up createChannel -c ${channelName} -ca`,
            ];

            const r = await shellcmds(cmds, testNetworkPath);
        }

        if (!workspace.network) {
            workspace.network = new Network(profileName);
            workspace.network.addChannel(channelName);
        } else if (!workspace.network.channelExists(channelName)) {
            const cmds = [`${this.cfg.env} ./network.sh createChannel -c ${channelName}`];

            const r = await shellcmds(cmds, testNetworkPath);

            workspace.network.addChannel(channelName);
        }
    }

    async clean(workspace: Workspace, profileName: string): Promise<void> {
        const useExisting = process.env.TEST_NETWORK_EXISTING || this.cfg.useExisting;
        if (!useExisting) {
            const testNetworkPath = this.cfg.rootDir!;

            const cmds = [`${this.cfg.env} ./network.sh down`];

            const r = await shellcmds(cmds, testNetworkPath);
        }
    }

    async deployCC(workspace: Workspace, channelName: string, chaincodeName: string): Promise<void> {
        //  network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
        const useExisting =
            process.env.TEST_NETWORK_EXISTING ||
            this.cfg.useExisting ||
            workspace.network.hasChaincode(chaincodeName, channelName);
        const ccCfg = this.cfg.chaincodes[chaincodeName];
        if (!useExisting) {
            if (ccCfg.lang == 'ccaas') {
                const cmds = [
                    `./network.sh deployCCAAS -ccn ${chaincodeName} -c ${channelName} -ccp ${ccCfg.path} -ccl ${
                        ccCfg.lang == 'golang' ? 'go' : ccCfg.lang
                    }`,
                ];

                const r = await shellcmds(cmds, this.cfg.rootDir!);
            } else {
                const cmds = [
                    `./network.sh deployCC -ccn ${chaincodeName} -c ${channelName} -ccp ${ccCfg.path} -ccl ${
                        ccCfg.lang == 'golang' ? 'go' : ccCfg.lang
                    }`,
                ];

                const r = await shellcmds(cmds, this.cfg.rootDir!);
            }
        }
        workspace.network.addChaincode(
            chaincodeName,
            {
                policy: '',
                collection: undefined,
                metadata: {},
                language: ccCfg.lang,
            },
            channelName,
        );
    }

    async registerUser(workspace: Workspace, identityName: string, orgName: string): Promise<void> {
        if (identityName !== 'User1') {
            throw new Error('Method not implemented.');
        }

        // otherwise it's already there
    }

    getName(): string {
        return 'TestNetwork';
    }
}
