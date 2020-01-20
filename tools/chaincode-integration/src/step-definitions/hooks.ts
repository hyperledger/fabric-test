/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as chalk from 'chalk';
import { HookScenarioResult, pickle, SourceLocation } from 'cucumber';
import { after, before, binding } from 'cucumber-tsflow/dist';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Global, Step } from '../interfaces/interfaces';
import { Logger } from '../utils/logger';
import { Workspace } from './utils/workspace';

declare const global: Global;

const logger = Logger.getLogger('./src/step-definitions/hooks.ts');

interface HookScenario {
    sourceLocation: SourceLocation;
    pickle: pickle.Pickle;
}

@binding([Workspace])
export class Hooks {
    private feature = null;

    public constructor(private workspace: Workspace) {
        // constructor
    }

    @before()
    public beforeScenario(scenario: HookScenario) {
        if (this.feature !== scenario.sourceLocation.uri) {
            this.feature = scenario.sourceLocation.uri;
            this.workspace.feature = {
                name: this.feature,
                scenarios: [],
            };

            logger.info(chalk.yellow(`Running feature ${formatFeature(this.feature)}`));
        }
        logger.info(chalk.yellow(`Running scenario ${scenario.pickle.name}`));

        this.workspace.feature.scenarios.push({
            name: scenario.pickle.name,
            steps: scenario.pickle.steps.map((step) => {
                const stepDef: Step = {
                    complete: false,
                    text: step.text,
                };

                return stepDef;
            }) as Step[],
        });
    }

    @after()
    public afterScenario(scenarioResult: HookScenarioResult) {
        const prefix = `[${scenarioResult.pickle.name}]`;

        logger.info(`${prefix} Status: ${scenarioResult.result.status}`);
        logger.info(`${prefix} Duration: ${formatDuration(scenarioResult.result.duration)}`);

        if (scenarioResult.result.status !== 'passed') {
            if (scenarioResult.result.status === 'failed') {
                logger.error(scenarioResult.result.exception.name);
                logger.error(scenarioResult.result.exception.message);
                logger.error(scenarioResult.result.exception.stack);
            } else if (scenarioResult.result.status === 'undefined') {
                logger.error('Step(s) found with text that does not match any known step defintion');

                this.workspace.feature.scenarios[this.workspace.feature.scenarios.length - 1].steps.forEach((step) => {
                    if (!step.complete) {
                        logger.error(`Could not find definition for step: ${chalk.red(step.text)}`);
                    }
                });
            }

            logger.error(`Scenario failed ${scenarioResult.pickle.name}`);
        }

        // Workspace is per scenario so save for other scenarios
        global.CURRENT_NETWORK = this.workspace.network;
        global.CHAINCODES = this.workspace.chaincodes;

        logger.info(chalk.yellow(`Finished scenario ${scenarioResult.pickle.name}`));
    }
}

function formatDuration(nanoseconds: number) {
    const millseconds = nanoseconds / 1000 / 1000;

    const remainder = millseconds % (60 * 1000);
    let seconds: any = remainder / 1000;
    let mins: any = (millseconds - remainder) / (60 * 1000);

    seconds = (mins < 10) ? '0' + mins : mins;
    mins = (mins < 10) ? '0' + mins : mins;

    return mins + 'm' + seconds + 's';
}

function formatFeature(file: string) {
    let feature = 'Unknown';
    const fullPath = path.resolve(__dirname, '../..', file);

    try {
        const fileContents = fs.readFileSync(fullPath, 'utf-8');
        const match = /Feature: (.*)/.exec(fileContents);
        feature = match[1];
    } catch (err) {
        logger.error(`Could not get feature from file ${fullPath}`);
    }

    return feature;
}
