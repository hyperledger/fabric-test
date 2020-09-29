/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { TableDefinition } from 'cucumber';
import { binding } from 'cucumber-tsflow/dist';
import * as FabricCAServices from 'fabric-ca-client';
import { Client, User } from 'fabric-common';
import { Gateway, Identity as NetworkIdentity, Wallet, X509WalletMixin } from 'fabric-network';
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
        const identityExists = await wallet.exists(identityName);
        if (identityExists) {
            logger.debug(`Identity "${identityName}" already exists for organisation "${orgName}"`);
            return;
        } else {
            logger.debug(`Enrolling identity "${identityName}" for organisation "${orgName}"`);
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

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            logger.debug(`Missing admin for organisation "${orgName}"`);
            throw new Error(`Missing admin for organisation "${orgName}"`);
        }

        // load the network configuration
        const commonConnectionProfilePath: string = org.ccp;

        try {
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(commonConnectionProfilePath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

            // Get the CA client object from the gateway for interacting with the CA.
            const ca = gateway.getClient().getCertificateAuthority();
            const adminIdentity = gateway.getCurrentIdentity();

            // Register the user, enroll the user, and import the new identity into the wallet.
            const secret = await ca.register({ affiliation: '', enrollmentID: identityName, role: 'client', attrs }, adminIdentity);
            const enrollment = await ca.enroll({ enrollmentID: identityName, enrollmentSecret: secret });
            const userIdentity = X509WalletMixin.createIdentity(org.mspid, enrollment.certificate, enrollment.key.toBytes());
            await wallet.import(identityName, userIdentity);
        } catch (error) {
            logger.debug(`Error putting identity "${identityName}" into wallet:`, error.message);
            throw error;
        }
    }
}
