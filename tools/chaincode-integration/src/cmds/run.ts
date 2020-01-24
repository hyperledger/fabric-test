/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as chalk from 'chalk';
import * as cucumber from 'cucumber';
import * as events from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Arguments, Argv } from 'yargs';
import { CommandModule, Global, Languages, LogLevels } from '../interfaces/interfaces';
import { DEFINED_NETWORKS, Network } from '../network/network';
import { Logger } from '../utils/logger';
import { addExports } from './utils';

declare const global: Global;

const cucumberArgs = [
    'features/*.feature',
    '--require', path.resolve(__dirname, '../step-definitions/**/*.js'),
];

const dockerChaincodeFolder = path.join(__dirname, '../../resources/chaincode');
const logger = Logger.getLogger('./src/cmds/run.ts');

const options = {
    'chaincode-dir': {
        alias: 'd',
        description: 'Directory containing the chaincodes for testing',
        required: true,
        type: 'string',
    },
    'chaincode-override': {
        description: 'Override the default folder for a given chaincode format {<NAME>: <FOLDER>}',
        type: 'object',
    },
    language: {
        alias: 'l',
        choices: ['golang', 'java', 'javascript', 'typescript'],
        description: 'Language of chaincodes that will be used',
        required: true,
        type: 'string',
    },
    'logging-level': {
        choices: ['info', 'debug'],
        default: 'info',
        description: 'Set logging level',
    },
    network: {
        alias: 'n',
        choices: DEFINED_NETWORKS,
        description: 'Specific network to run',
    },
    tags: {
        alias: 't',
        description: 'Specific tags to run',
        type: 'string',
    },
};

const cmd: CommandModule = {
    builder: (yargs: Argv): Argv => {
        yargs.options(options as any);

        return yargs;
    },
    command: 'run [options]',
    desc: 'Run the integration tests',
    handler: (args: Arguments): Arguments => {
        const chaincodeFolder = path.resolve(process.cwd(), args.chaincodeDir as string);
        global.CHAINCODE_LANGUAGE = (args.language === 'javascript' || args.language === 'typescript') ? 'node' : args.language as Languages;
        global.LOGGING_LEVEL = args.loggingLevel as LogLevels;

        Logger.refreshLoggers();

        return args.thePromise = new Promise(async (resolve, reject) => {
            const cucumberErrors = [];

            const networks = args.network ? [args.network as string] : DEFINED_NETWORKS;

            for (const name of networks) {
                let argv = process.argv.slice(0, 2).concat(cucumberArgs).concat('--tags', `@${name}`).concat('--tags', `not @not-${args.language}`);

                if (global.CHAINCODE_LANGUAGE === 'node') {
                    argv = argv.concat('--tags', 'not @not-node');
                }

                if (args.tags) {
                    argv = argv.concat('--tags', args.tags as string);
                }

                const cli = new (cucumber as any).Cli({
                    argv,
                    cwd: path.resolve(__dirname, '../..'),
                    stdout: {write: () => null},
                });

                logger.debug('Calculating test cases to run');
                const config = await cli.getConfiguration();
                const testCases = await (cucumber as any).getTestCasesFromFilesystem({
                    cwd: cli.cwd,
                    eventBroadcaster: new events(),
                    featureDefaultLanguage: config.featureDefaultLanguage,
                    featurePaths: config.featurePaths,
                    order: config.order,
                    pickleFilter: new (cucumber as any).PickleFilter(config.pickleFilterOptions),
                });
                logger.debug(`Found ${testCases} test cases`);

                if (testCases.length === 0) {
                    logger.info('No features to run for network', name);
                    continue;
                }

                logger.info(chalk.cyan(`Creating network ${name}`));

                const network = new Network(name);
                await network.setupConfig();
                global.CURRENT_NETWORK = network;

                try {
                    logger.debug(`Copying chaincode (${chaincodeFolder}) to docker chaincode folder`);

                    await fs.copy(chaincodeFolder, dockerChaincodeFolder);

                    if (args.chaincodeOverride) {
                        let overrides;
                        try {
                            overrides = JSON.parse(args.chaincodeOverride as string);
                        } catch (err) {
                            throw new Error('Option chaincode-override must be JSON');
                        }

                        for (const key in overrides) {
                            if (overrides.hasOwnProperty(key)) {
                                await fs.copy(path.resolve(process.cwd(), overrides[key]), path.join(dockerChaincodeFolder, key));
                            }
                        }
                    }

                    await network.build();
                } catch (err) {
                    reject(err);
                    return;
                }

                logger.info(chalk.magenta('Running cucumber tests'));

                const requireKeys = Object.keys(require.cache);

                requireKeys.forEach((key) => {
                    if (key.includes('cucumber-tsflow') || key.includes('step-definitions')) {
                        delete require.cache[require.resolve(key)];
                    }
                });

                const resp = await cli.run();

                if (!resp.success) {
                    cucumberErrors.push(name);
                }

                logger.info(chalk.cyan(`Tearing down network ${name}`));

                await network.teardown();
                await fs.emptyDir(dockerChaincodeFolder);
                await fs.ensureFile(path.join(dockerChaincodeFolder, '.gitkeep'));
            }

            if (cucumberErrors.length > 0) {
                reject(new Error('Cucumber tests failed for networks: ' + cucumberErrors.join('\n')));
                return;
            }

            resolve();
        }) as any;
    },
};

addExports(exports, cmd);
