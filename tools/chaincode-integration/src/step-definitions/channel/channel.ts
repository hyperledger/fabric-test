/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { binding } from 'cucumber-tsflow/dist';
import { given } from '../../decorators/steps';
import { Workspace } from '../utils/workspace';

const TIMEOUT = 30 * 60 * 1000;

@binding([Workspace])
export class Channel {
    public constructor(private workspace: Workspace) {
        // constructor
    }

    @given(/Channel ['"](.*)['"] has been created using the profile ['"](.*)['"]$/, '', TIMEOUT)
    public async channel(channelName: string, profile: string): Promise<void> {
        // TODO implement, not currently needed
    }

    @given(/Infrastructure provider is ['"](.*)['"]$/, '', TIMEOUT)
    public async infrastructureProvider(provider: string): Promise<void> {
        this.workspace.setInfrastuctureProvider(provider, this);
    }

    @given(/Clean Infrastructure for network ['"](.*)['"]$/, '', TIMEOUT)
    public async clean(profileName: string): Promise<void> {
        this.workspace.infrastructureProvider.clean(this.workspace, profileName);
    }

    @given(/Infrastructure created for network ['"](.*)['"] with channel ['"](.*)['"]$/, '', TIMEOUT)
    public async setup(profileName: string, channelName: string): Promise<void> {
        await this.workspace.infrastructureProvider.setup(this.workspace, profileName, channelName);
    }

    @given(/All peers on channel ['"](.*)['"] have deployed the chaincode ['"](.*)['"]$/, '', TIMEOUT)
    public async deployCC(channelName: string, chaincodeName: string): Promise<void> {
        await this.workspace.infrastructureProvider.deployCC(this.workspace, channelName, chaincodeName);
    }

    @given(/Chaincode ['"](.*)['"] has been started in server mode$/, '', TIMEOUT)
    public async startCCAAS(chaincodeName: string): Promise<void> {
        await this.workspace.infrastructureProvider.startCCAAS(this.workspace, chaincodeName);
    }

    @given(/All peers on channel ['"](.*)['"] have deployed the chaincode-as-a-service ['"](.*)['"]$/, '', TIMEOUT)
    public async deployCCAAS(channelName: string, chaincodeName: string): Promise<void> {
        await this.workspace.infrastructureProvider.deployCC(this.workspace, channelName, `${chaincodeName}-ccaas`);
    }
}
