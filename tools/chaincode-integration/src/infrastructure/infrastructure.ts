/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import { Workspace } from '../step-definitions/utils/workspace';
// import AnsibleProvider from './ansible_provider';
// import MicrofabProvider from './microfab_provider';

export interface Infrastructure {
    setup(workspace: Workspace, profileName: string, channelName: string): Promise<void>;
    clean(workspace: Workspace, profileName: string): Promise<void>;
    deployCC(workspace: Workspace, channelName: string, chaincodeName: string): Promise<void>;
    registerUser(workspace: Workspace, identityName: string, orgName: string): Promise<void>;
    getName(): string;
    startCCAAS(workspace: Workspace, chaincodeName: string): Promise<void>;
}
