/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import * as FabricCAServices from 'fabric-ca-client';
import { User } from 'fabric-common';
import { Identity as NetworkIdentity, IdentityProvider, Wallet, X509Identity } from 'fabric-network';
import * as fs from 'fs-extra';
import { given } from '../../decorators/steps';
import { Org } from '../../interfaces/interfaces';
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

        const org: Org = this.workspace.network.getOrganisation(orgName);
        const wallet: Wallet = org.wallet;

        // Check to see if we've already enrolled the identity
        const identity: NetworkIdentity = await wallet.get(identityName);
        if (identity) {
            logger.debug(`Identity "${identityName}" already exists for organisation "${orgName}"`);
            return;
        }

        // Create array of attributes
        const attrs: any[] = [];
        if (attributesTbl) {
            for (const row of attributesTbl.rows()) {
                if (row.length !== 2) {
                    throw new Error('Attributes table invalid');
                }

                attrs.push({name: row[0], value: row[1], ecert: true});
            }
        }  
        
        // Check to see if we've already enrolled the admin user
        const admin: NetworkIdentity = await wallet.get('admin');
        if (!admin) {
            logger.debug(`Missing admin for organisation "${orgName}"`);
            throw new Error(`Missing admin for organisation "${orgName}"`);
        }

        // load the network configuration
        const commonConnectionProfilePath: string = org.ccp;
        let commonConnectionProfile: any = JSON.parse(fs.readFileSync(commonConnectionProfilePath, 'utf8'));

        // Create a new CA client for interacting with the CA
        const caURL: string = commonConnectionProfile.certificateAuthorities['ca.org1.example.com'].url;
        const ca: FabricCAServices = new FabricCAServices(caURL);

        // build a user object for authenticating with the CA
       const provider: IdentityProvider = wallet.getProviderRegistry().getProvider(admin.type);
       const adminUser: User = await provider.getUserContext(admin, 'admin');

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret: string = await ca.register({ affiliation: '', enrollmentID: identityName, role: 'client', attrs }, adminUser);
        const enrollment: FabricCAServices.IEnrollResponse = await ca.enroll({ enrollmentID: identityName, enrollmentSecret: secret });
        const x509Identity: X509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: org.mspid,
            type: 'X.509',
        };
        await wallet.put(identityName, x509Identity);
    }
}
