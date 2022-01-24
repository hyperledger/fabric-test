/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import { binding } from 'cucumber-tsflow/dist';
import { given } from '../../decorators/steps';
import { Workspace } from '../utils/workspace';

const TIMEOUT = 30 * 60 * 1000;

@binding([Workspace])
export class Identity {

    public constructor(private workspace: Workspace) {
        // constructor
    }

    @given(/Organi[s|z]ation ['"](.*)['"] has registered the identity ['"](.*)['"]$/, '', TIMEOUT)
    public async registerUserNoAttr(orgName: string, identityName: string) {
    //    await this.workspace.infrastructureProvider.registerUser(this.workspace, identityName, this.workspace.namespaceOrg(orgName));
    }
}
