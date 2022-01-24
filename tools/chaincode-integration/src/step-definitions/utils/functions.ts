/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as _ from 'lodash';

export async function sleep(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

export function jsonResponseEqual(actual: string, expected: string): boolean {
    let actualJSON;
    let expectedJSON;

    try {
        actualJSON = JSON.parse(actual);
        expectedJSON = JSON.parse(expected);
    } catch (err) {
        return false;
    }

    return _.isEqual(actualJSON, expectedJSON);
}
