/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as fs from 'fs-extra';
import * as path from 'path';
import { Arguments } from 'yargs';
import { CommandModule } from '../../interfaces/interfaces';
import { addExports } from '../utils';

const cmd: CommandModule = {
    command: 'list',
    desc: 'Lists names of chaincodes that are required to run this tool in its entirety',
    handler: (args: Arguments) => {
        return args.thePromise = new Promise(async (resolve, reject) => {
            try {
                const contents = await fs.readdir(path.join(__dirname, '../../../docs/schemas'));

                contents.forEach((file) => {
                    console.log(file.replace('.json', ''));
                });

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    },
};

addExports(exports, cmd);
