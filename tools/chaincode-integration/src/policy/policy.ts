/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Channel } from '../interfaces/interfaces';

const outOfRegex = /Any([0-9])Orgs?(Admin|Client|Member|Peer)/;

export class Policy {
    public static build(identifier: string, channel: Channel): string {
        switch (true) {
            case outOfRegex.test(identifier):
                return this.outOfBuilder(identifier, channel);
            default:
                throw new Error(`Policy "${identifier}" not found`);
        }
    }

    private static outOfBuilder(identifier: string, channel: Channel): string {
        const num = identifier.match(outOfRegex)[1];
        const type = identifier.match(outOfRegex)[2];

        let policy = `OutOf(${num}, `;

        for (const org of channel.organisations) {
            policy += `"${org.mspid}.${type.toLowerCase()}", `;
        }

        policy = policy.substring(0, policy.length - 2) + ')';

        return policy;
    }
}
