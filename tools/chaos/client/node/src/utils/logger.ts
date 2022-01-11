/*
 * SPDX-License-Identifier: Apache-2.0
 */

import chalk = require('chalk');
import * as config from './config';

export type Stage = 'Endorsing' | 'Submitting' | 'Submitted' | 'Committed' | 'Failed' | 'Evaluating' | 'Evaluated' | 'EventReceived';

interface ClientLogMessage {
    component: string;
    timestamp: string;
    txnId: string;
    stage: Stage;
    message: string;
}

export type logLevels = 'Failure' | 'All' | 'Failure&Success';
export class Logger {
    private logEntries: ClientLogMessage[] = [];

    txnId: string;

    constructor(txnId: string, private readonly logLevel: logLevels = 'Failure') {
        this.txnId = txnId
    }

    private flushOnFailure(stage: Stage): void {
        if (stage === 'Failed') {
            for (const logEntry of this.logEntries) {
                (config.colourLogs === true) ? console.log(chalk.red(JSON.stringify(logEntry))) : console.log(JSON.stringify(logEntry))
            }
            this.logEntries = [];
        }
    }

    logPoint(stage: Stage, message = ''): void {
        const timestamp = new Date().toISOString();
        const logMessage: ClientLogMessage = {
            component: 'CLIENT',
            timestamp,
            txnId: this.txnId,
            stage,
            message
        };

        switch (this.logLevel) {
        case 'Failure': {
            this.logEntries.push(logMessage);
            this.flushOnFailure(stage);
            break;
        }

        case 'Failure&Success' : {
            this.logEntries.push(logMessage);
            this.flushOnFailure(stage);
            if (stage === 'EventReceived' || stage === 'Evaluated') {
                (config.colourLogs === true) ? console.log(chalk.green(JSON.stringify(logMessage))) : console.log(JSON.stringify(logMessage));
                this.logEntries = [];
            }
            break;
        }

        default: {  // 'All' case
            switch (stage) {
            case 'Failed': {
                (config.colourLogs === true) ? console.log(chalk.red(JSON.stringify(logMessage))) : console.log(JSON.stringify(logMessage));
                break;
            }

            case 'EventReceived':
            case 'Evaluated':
                (config.colourLogs === true) ? console.log(chalk.green(JSON.stringify(logMessage))) : console.log(JSON.stringify(logMessage));
                break;

            default: {
                console.log(JSON.stringify(logMessage));
            }}
            break;
        }}
    }
}
