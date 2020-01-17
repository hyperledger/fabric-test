/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import { Gateway, X509Identity } from 'fabric-network';
import { given } from '../../decorators/steps';
import { Logger } from '../../utils/logger';
import { Workspace } from '../utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/identity/identity.ts');

@binding([Workspace])
export class Identity {
    public constructor(private workspace: Workspace) {
        // construct
    }

    @given(/Organisation ['"](.*)['"] has registered the identity ['"](.*)['"]$/)
    public async registerUserNoAttr(orgName: string, identityName: string) {
        await this.registerUser(orgName, identityName, null);
    }

    @given(/Organisation ['"](.*)['"] has registered the identity ['"](.*)['"] with attributes:/)
    public async registerUserWithAttr(orgName: string, identityName: string, attributesTbl: TableDefinition) {
        await this.registerUser(orgName, identityName, attributesTbl);
    }

    private async registerUser(orgName: string, identityName: string, attributesTbl: TableDefinition) {
        const org = this.workspace.network.getOrganisation(orgName);

        const wallet = org.wallet;

        const identity = await wallet.get(identityName);

        if (identity) {
            logger.debug(`Identity "${identityName}" already exists for organisation "${orgName}"`);
            return;
        }

        const attrs = [];

        if (attributesTbl) {
            for (const row of attributesTbl.rows()) {
                if (row.length !== 2) {
                    throw new Error('Attributes table invalid');
                }

                attrs.push({name: row[0], value: row[1], ecert: true});
            }
        }

        const admin = await wallet.get('admin');

        if (!admin) {
            throw new Error(`Missing admin for organisation "${orgName}"`);
        }

        const gateway = new Gateway();
        await gateway.connect(org.ccp, {wallet: org.wallet, identity: 'admin', discovery: {enabled: true, asLocalhost: true}});

        const client = gateway.getClient();
        const ca = client.getCertificateAuthority();
        const adminIdentity = await client.getUserContext('admin', false);

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({ affiliation: '', enrollmentID: identityName, role: 'client', attrs }, adminIdentity);
        const enrollment = await ca.enroll({ enrollmentID: identityName, enrollmentSecret: secret });
        const userIdentity: X509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: org.mspid,
            type: 'X.509',
        };

        await wallet.put(identityName, userIdentity);
    }
}
