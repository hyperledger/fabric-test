/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { binding } from 'cucumber-tsflow/dist';
import { given } from '../../decorators/steps';
import { Channel as ChannelIface, Org } from '../../interfaces/interfaces';
import { Docker } from '../../utils/docker';
import { Logger } from '../../utils/logger';
import { getEnvVarsForCli } from '../utils/functions';
import { Workspace } from '../utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/channel/channel.ts');

@binding([Workspace])
export class Channel {

    public constructor(private workspace: Workspace) {
        // construct
    }

    @given(/Channel ['"](.*)['"] has been created using the profile ['"](.*)['"]$/)
    public async createAndJoin(channelName: string, profileName: string) {
        if (this.workspace.network === null) {
            throw new Error('Cannot create channel. No network deployed');
        }

        const profile = this.workspace.network.getProfile(profileName);

        await this.generateCrypto(channelName, profileName, profile.organisations);
        await this.createChannel(channelName, profile.organisations[0]);
        await this.joinChannel(channelName, profile.organisations);

        const channel: ChannelIface = {
            name: channelName,
            organisations: profile.organisations,
        };

        this.workspace.network.addChannel(channel);
    }

    private async generateCrypto(channelName: string, profile: string, orgs: Org[]) {
        logger.debug('Generating channel crypto');

        await Docker.exec(orgs[0].cli, `configtxgen -profile ${profile} -outputCreateChannelTx /etc/hyperledger/config/${channelName}.tx -channelID ${channelName}`);

        for (const org of orgs) {
            await Docker.exec(org.cli, `configtxgen -profile ${profile} -outputAnchorPeersUpdate /etc/hyperledger/config/${org.mspid}_channel_anchors.tx -channelID ${channelName} -asOrg ${org.mspid}`);
        }
    }

    private async createChannel(channelName: string, org: Org) {
        const orderer = this.workspace.network.getDefaultOrderer();

        await Docker.exec(org.cli, `peer channel create -o ${orderer.name}:${orderer.port} -c ${channelName} -f /etc/hyperledger/config/${channelName}.tx --outputBlock /etc/hyperledger/config/${channelName}.block --tls true --cafile /etc/hyperledger/config/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem`);
    }

    private async joinChannel(channelName: string, orgs: Org[]) {
        const orderer = this.workspace.network.getDefaultOrderer();

        for (const org of orgs) {
            for (const peer of org.peers) {
                await Docker.exec(org.cli, `bash -c '${getEnvVarsForCli(peer)} peer channel join -b /etc/hyperledger/config/${channelName}.block'`);
                await Docker.exec(org.cli, `bash -c '${getEnvVarsForCli(peer)} peer channel update -o ${orderer.name}:${orderer.port} -c ${channelName} -f /etc/hyperledger/config/${org.mspid}_channel_anchors.tx --tls true --cafile /etc/hyperledger/config/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem'`);
            }
        }
    }
}
