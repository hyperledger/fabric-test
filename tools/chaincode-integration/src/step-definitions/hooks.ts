/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

import chalk from 'chalk';
import { HookScenarioResult, pickle, SourceLocation } from 'cucumber';
import { after, before, binding } from 'cucumber-tsflow';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Step } from '../interfaces/interfaces';
import { Logger } from '../utils/logger';
import { Workspace } from './utils/workspace';

const logger = Logger.getLogger('./src/step-definitions/hooks.ts');

interface HookScenario {
    sourceLocation: SourceLocation;
    pickle: pickle.Pickle;
}

// Note the API changed for the cucumber/gherkin interface. This code was originally written to the old
// interface and has been updated to the new one; however it may not be most efficient way of
// doing it with the new interface.

// These hooks were added to give more informative debug information that cucumber-js provides by default
// such they could be removed and the tests still test.
@binding([Workspace])
export class Hooks {
    private feature: string | undefined;

    public constructor(private workspace: Workspace) {
        // constructor
    }

    @before()
    public beforeScenario(scenario: HookScenario): void {
        const feature = (scenario as any).gherkinDocument.uri;
        this.workspace.feature = {
            name: feature,
            scenarios: [],
        };

        logger.info(chalk.yellow(`Running feature ${formatFeature(feature)}`));
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
    public afterScenario(scenarioResult: HookScenarioResult): void {
        const prefix = `[${scenarioResult.pickle.name}]`;

        logger.info(`${prefix} Status: ${scenarioResult.result.status}`);
        logger.info(`${prefix} Duration: ${formatDuration((scenarioResult.result as any).duration)}`);

        if (scenarioResult.result.status.toLowerCase() !== 'passed') {
            if (scenarioResult.result.status.toLowerCase() === 'failed') {
                if (scenarioResult.result.exception) {
                    logger.error(scenarioResult.result.exception.name ?? '');
                    logger.error(scenarioResult.result.exception.message ?? '');
                    logger.error(scenarioResult.result.exception.stack ?? '');
                } else {
                    logger.error('No exception defined in the scenario result');
                }
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
        global.CONNECTIONS = this.workspace.connections;
        global.INFRASTRUCTURE = this.workspace.infrastructureProvider;

        logger.info(chalk.yellow(`Finished scenario ${scenarioResult.pickle.name}`));
    }
}

function formatDuration(duration: { seconds: number; nanos: number }): string {
    const millseconds = duration.nanos / 1000 / 1000;

    const remainder = millseconds % (60 * 1000);
    let seconds: any = remainder / 1000;
    let mins: any = (millseconds - remainder) / (60 * 1000);

    seconds = mins < 10 ? '0' + mins : mins;
    mins = mins < 10 ? '0' + mins : mins;

    return mins + 'm' + seconds + 's';
}

function formatFeature(file: string): string {
    let feature = 'Unknown';
    const fullPath = path.resolve(__dirname, '../..', file);

    try {
        const fileContents = fs.readFileSync(fullPath, 'utf-8');
        const match = /Feature: (.*)/.exec(fileContents);
        feature = match![1];
    } catch (err) {
        logger.error(`Could not get feature from file ${fullPath}`);
    }

    return feature;
}
