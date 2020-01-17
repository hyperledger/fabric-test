/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as _ from 'lodash';
import { Peer } from '../../interfaces/interfaces';

export function getEnvVarsForCli(peer: Peer) {
    const peerFolder = `/etc/hyperledger/config/crypto-config/peerOrganizations/${peer.name.split('.').slice(1).join('.')}/peers/${peer.name}`;

    const addr = `CORE_PEER_ADDRESS="${peer.name}:${peer.port}"`;
    const tlsKey = `CORE_PEER_TLS_KEY_FILE="${peerFolder}/tls/server.key"`;
    const tlsCert = `CORE_PEER_TLS_CERT_FILE="${peerFolder}/tls/server.crt"`;
    const tlsRootCert = `CORE_PEER_TLS_ROOTCERT_FILE="${peerFolder}/tls/ca.crt"`;

    return `${addr} ${tlsKey} ${tlsCert} ${tlsRootCert}`;
}

export async function sleep(time: number) {
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
