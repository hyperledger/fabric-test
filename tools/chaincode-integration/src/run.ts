#!/usr/bin/env node
/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as yargs from 'yargs';

import { Cli } from '@cucumber/cucumber';

import { resolve, join } from 'path';
import { copyFileSync, existsSync } from 'fs-extra';

yargs
    .command(
        'init',
        'Creates a template cucumber.js configuration file',
        (yargs) => {
            return yargs.option('d', {
                alias: 'dir',
                describe: 'Directory to write files, default is cwd',
                default: process.cwd(),
            });
        },
        (argv: any) => {
            const configFile = resolve(__dirname, '..', 'cucumber.js');
            const destDir = resolve(argv['dir']);
            if (!existsSync(destDir)) {
                console.log(`Unable to copy cucumber.js, directory "${destDir}" does not exist`);
                process.exit(1);
            }
            copyFileSync(configFile, join(destDir, 'cucumber.js'));
        },
    )
    .command(
        ['run', '*'], // * means this is the default command
        'Runs the tests',
        (yargs) => {
            return yargs
                .option('p', {
                    alias: 'profile',
                    describe: 'profile defined in the cucumber.js',
                    default: 'prod',
                })
                .option('t', {
                    alias: 'tags',
                    describe: 'tags defined in the feature files',
                    default: '@basic-checks or @advanced-types or @metadata-checks',
                });
        },
        async (argv: any) => {
            const runArgs = ['-p', argv['profile'], '--tags', argv['tags'], '--fail-fast'];
            const cliArgs = { argv: runArgs, cwd: process.cwd(), stdout: process.stdout };
            const cli = new Cli(cliArgs);
            const result = await cli.run();
            if (result.shouldExitImmediately || !result.success) {
                process.exit(1);
            }
        },
    )
    .help()
    .strict().argv;
