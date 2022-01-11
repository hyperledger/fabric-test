/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChaincodeEvent, ChaincodeEventsOptions, CloseableAsyncIterable, Network } from '@hyperledger/fabric-gateway';
import { Logger } from './utils/logger';
import * as config from './utils/config'

export class EventHandler {

    private txnMap = new Map<string, (value: unknown) => void>();

    private blockTxns = new Map<BigInt, string[]>();

    startBlock! : bigint;

    listeningtoEvents = false;

    constructor(private readonly network: Network, private readonly chaincodeName: string) {
    }

    async startListening(): Promise<void> {
        const options :ChaincodeEventsOptions = { startBlock: this.startBlock };
        if (!this.startBlock){
            options.startBlock = undefined;
        }
        const events =  await this.network.getChaincodeEvents(this.chaincodeName,
            options
        );
        this.listeningtoEvents = true;

        this.getEvents(events);
    }

    async getEvents(events:CloseableAsyncIterable<ChaincodeEvent>):Promise<void>{
        try {
            for await (const event of events) {
                const listener = this.txnMap.get(event.transactionId);
                if (this.startBlock && this.startBlock !== event.blockNumber){
                    this.blockTxns.delete(this.startBlock);
                }

                this.startBlock = event.blockNumber;
                let txns = this.blockTxns.get(event.blockNumber);
                if (!listener) {
                    if (txns !== undefined){
                        if (!txns.includes(event.transactionId)){
                            const logger = new Logger(event.transactionId, config.logLevel);
                            logger.logPoint('Failed', 'Event fired, but no listener registered');
                        }
                    }
                } else {
                    listener(event);
                    txns = (txns === undefined) ? [] : txns;
                    txns.push(event.transactionId);
                    this.blockTxns.set(event.blockNumber, txns);
                    this.txnMap.delete(event.transactionId);
                }
            }

        } catch (e){
            events.close();
            this.listeningtoEvents = false;

        }
    }

    registerForEvent(txnId: string): Promise<unknown> {

        const eventPromise = new Promise((resolve) => {
            this.txnMap.set(txnId, resolve);
        });
        return eventPromise;
    }

    unregisterEvent(txnId: string): void {
        this.txnMap.delete(txnId);
    }
}