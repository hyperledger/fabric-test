/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import { Network } from "../network/network";
import { Workspace } from "../step-definitions/utils/workspace";
import { shellcmds } from "../utils/shell";

import { Infrastructure } from "./infrastructure";

export default class TestNetworkProvider implements Infrastructure {
  private cfg: any;

  public constructor(cfg: any) {
    this.cfg = cfg;
  }

  async setup(
    workspace: Workspace,
    profileName: string,
    channelName: string
  ): Promise<void> {
    let useExisting = process.env.TEST_NETWORK_EXISTING || workspace.network;
    if (!useExisting) {
      let testNetworkPath = this.cfg.rootDir!;

      let cmds = [
        `./network.sh down`,
        `./network.sh up createChannel -c ${channelName} -ca`,
      ];

      const r = await shellcmds(cmds, testNetworkPath);
      workspace.network = new Network(profileName);
      workspace.network.addChannel(channelName);
    }
  }

  async clean(workspace: Workspace, profileName: string): Promise<void> {
    let useExisting = process.env.TEST_NETWORK_EXISTING;
    if (!useExisting) {
      let testNetworkPath = process.env["TEST_NETWORK_PATH"];

      let cmds = [`./network.sh down`];

      const r = await shellcmds(cmds, testNetworkPath);
    }
  }

  async deployCC(
    workspace: Workspace,
    channelName: string,
    chaincodeName: string
  ): Promise<void> {
    //  network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
    let useExisting =
      process.env.TEST_NETWORK_EXISTING ||
      workspace.network.hasChaincode(chaincodeName, channelName);
    if (!useExisting) {
      let ccCfg = this.cfg.chaincodes[chaincodeName];
      let cmds = [
        `./network.sh deployCC -ccn ${chaincodeName} -c ${channelName} -ccp ${ccCfg.path} -ccl ${ccCfg.lang}`,
      ];

      const r = await shellcmds(cmds, this.cfg.rootDir!);

      workspace.network.addChaincode(
        chaincodeName,
        {
          policy: "",
          collection: undefined,
          metadata: {},
        },
        channelName
      );
    }
  }

  registerUser(
    workspace: Workspace,
    identityName: string,
    orgName: string
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getName(): string {
    return "TestNetwork";
  }

  startCCAAS(workspace: Workspace, chaincodeName: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
