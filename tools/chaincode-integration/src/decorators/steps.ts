/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as chalk from 'chalk';
import { given as tsFlowGiven, then as tsFlowThen, when as tsFlowWhen } from 'cucumber-tsflow/dist';
import { Workspace } from '../step-definitions/utils/workspace';
import { Logger } from '../utils/logger';

const logger = Logger.getLogger('./src/decorators.ts');

function addLogging(type: 'given' | 'then' | 'when', stepPattern: RegExp | string, func: MethodDecorator): MethodDecorator {
    // need to use keyword this
    // tslint:disable-next-line: only-arrow-functions
    return function(target: any, key: string, descriptor: any) {
        const orginalMethod = descriptor.value;

        descriptor.value = function(...args: any[]) {
            const scenarios = (this.workspace as Workspace).feature.scenarios;
            const scenario = scenarios[scenarios.length - 1];

            const step = scenario.steps.find((scenarioStep) => {
                return (stepPattern as RegExp).test(scenarioStep.text) && !scenarioStep.complete;
            });

            step.complete = true;

            if (logger.level === 'debug') {
                logger.debug(chalk.yellow(`[${type}] ${step.text}`));
            }

            return orginalMethod.apply(this, args);
        };

        return func(target, key, descriptor);
    };
}

export function given(stepPattern: RegExp | string, tag?: string, timeout?: number): MethodDecorator {
    const func = tsFlowGiven(stepPattern, tag, timeout);
    return addLogging('given', stepPattern, func);
}

export function then(stepPattern: RegExp | string, tag?: string, timeout?: number): MethodDecorator {
    const func = tsFlowThen(stepPattern, tag, timeout);
    return addLogging('then', stepPattern, func);
}

export function when(stepPattern: RegExp | string, tag?: string, timeout?: number): MethodDecorator {
    const func = tsFlowWhen(stepPattern, tag, timeout);
    return addLogging('when', stepPattern, func);
}
