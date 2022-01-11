/*
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScenarioStatus = 'Start' | 'Running' | 'End' | '';

interface ChaosLogMessage {
    component: string;
    timestamp: string;
    scenarioName: string;
    scenarioStatus: ScenarioStatus;
    message: string;
}

export class Logger {
    static logPoint(scenarioStatus: ScenarioStatus, scenarioName: string, message: string): void
    {
        const timestamp = new Date().toISOString();
        const logMessage: ChaosLogMessage = {
            component: 'CHAOS',
            timestamp,
            scenarioName,
            scenarioStatus,
            message
        }

        console.log(JSON.stringify(logMessage));
    }
}