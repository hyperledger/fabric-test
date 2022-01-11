/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stage } from './logger';
import * as grpc from '@grpc/grpc-js';

export function resetDelay(min:number, max:number):number{
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function sleep(max:number, min:number):Promise<void>{
    return new Promise((resolve)=>{
        setTimeout(()=>{
            resolve();
        }, resetDelay(min, max)
        );
    });
}

export function timeout(timeout:number, message:string, stage:Stage):Promise<void>{
    return new Promise((_resolve, reject)=>{
        setTimeout(()=>{
            reject(new Error(`${message} after ${timeout} ms during stage ${stage}`));
        }, timeout
        );
    });
}

export function getRandomNumber(length:number):number{
    return Math.round(Math.random() * (length - 1));
}

export function defaultTimeout(timeout:number): grpc.CallOptions | Record<string, unknown> {
    if (timeout === 0){
        return {};
    }
    return {
        deadline: Date.now() + timeout
    };
}