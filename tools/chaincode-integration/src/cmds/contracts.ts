/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Argv } from 'yargs';
import { CommandModule } from '../interfaces/interfaces';
import { addExports } from './utils';

const cmd: CommandModule = {
    builder: (yargs: Argv): Argv => {
        yargs.demandCommand(1, 'Incorrect command. Please see list of commands above, or use --help');
        yargs.commandDir('contracts');

        return yargs;
    },
    command: 'contracts <subcommand>',
    desc: 'Command for getting information about the required chaincodes for this tool',
    handler: () => null,
};

addExports(exports, cmd);
