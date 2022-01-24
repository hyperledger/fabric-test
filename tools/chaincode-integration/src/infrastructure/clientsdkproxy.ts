import { Workspace } from "../step-definitions/utils/workspace";
import { Logger } from "../utils/logger";
import DefaultGateway from "./defaultgateway";


export interface Transaction {
    txname: string;
    user: string;
    args: string[] | undefined;
    shouldSubmit: boolean;
}


export interface ClientSDKProxy {
    // submitTransaction(workspace:Workspace,infra: Infrastructure, network: string, org: string, channel: string, contract: string, tx: Transaction): Promise<string>;
    // evaluateTransaction(workspace:Workspace,infra: Infrastructure, network: string, org: string, channel: string, contract: string, tx: Transaction): Promise<string>;
    setup(config: any,workspace:Workspace): Promise<ClientSDKProxy>;
    sendTransaction(workspace:Workspace, tx: Transaction): Promise<string>;
}

export async function getClientProxy(name: string, ctx: any, timeout?: number): Promise<ClientSDKProxy>{
        
    let config = (ctx as any)._worldObj!.parameters!;
    let sdkProxy;
    switch (name) {
        // case 'ansible':
        //     return new AnsibleProvider();
        // case 'microfab':
        //     return new MicrofabProvider();
        case 'defaultgateway':
            sdkProxy= new DefaultGateway();
            break;
        default:
            throw new Error('Unknown Infrastructure Provider');

    }
    Logger.getLogger('clientproxy').info(`Returning ClientProxy=${name}`)
    return await sdkProxy.setup(config, ctx.workspace);

}