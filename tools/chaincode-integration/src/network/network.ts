/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import {
  ChaincodeConfig,
  Channel,
  Orderer,
  Org,
  Profile,
} from "../interfaces/interfaces";
import { Logger } from "../utils/logger";

const logger = Logger.getLogger("network.ts");

export interface NetworkDetails {
  resourceFolder: string;
  tag: string;
}

export interface NetworkConfiguration {
  organisations: Org[];
  orderers: Orderer[];
  profiles: Map<string, Profile>;
}
export class Network {
  private name: string;
  private channels: Map<string, Channel>;

  public constructor(type: string) {
    this.name = type;
    this.channels = new Map<string, Channel>();
  }

  public getOrganisations(): Org[] {
    return []; // return this.config.organisations;
  }



  public addChannel(name: string): Channel {
    let c: Channel = { name, organisations: [], chaincodes: new Map() };
    this.channels.set(name,c);
    return c;
  }

  public getChannel(name: string): Channel {
      return this.channels.get(name)!;
  }

  public addChaincode(name: string,chaincodeCfg:ChaincodeConfig, channelName: string){
      let c = this.channels.get(channelName);
      c?.chaincodes.set(name,chaincodeCfg);
      this.channels.set(channelName,c!);
  }

  public hasChaincode(name:string, channelName:string): boolean {
      let c = this.channels.get(channelName);
      return c?.chaincodes.has(name)!
  }

}

function orgToSmall(orgName: string) {
  if (orgName.toUpperCase() === orgName) {
    return orgName.toLowerCase();
  }

  return orgName
    .replace(/(?:^|\.?)([A-Z])/g, (x, y: string) => "-" + y.toLowerCase())
    .replace(/^-/, "");
}
