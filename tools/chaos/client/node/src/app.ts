/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import 'source-map-support/register';

import { Gateway } from '@hyperledger/fabric-gateway';

import * as config from './utils/config';
import { TransactionRunner, TransactionStats } from './transactionRunner';

import { GatewayHelper, OrgProfile } from './gateway';
import { TransactionData } from './transactionData';
import { sleep } from './utils/helper';
import chalk = require('chalk');

interface Orgs {
    [key: string]: OrgProfile;
}

interface StatsMessage {
    component: string;
    timestamp: string;
    stage: string;
    message: string;
}

type StatsStatus = 'stalled' | 'allfailures' | 'working';

type ExitStatus = 0 | 1 | 2;

class App {
    keepRunning = true;

    gateway!: Gateway;

    transactionRunner!: TransactionRunner;

    previousStats: TransactionStats | undefined;

    currentStatsStatus: StatsStatus = 'working';

    async main(): Promise<void> {
        this.displayConfig();
        const gwHelper = new GatewayHelper((config.orgs as Orgs)[config.org]);
        await this.configure(gwHelper);

        const transactionData: TransactionData = new TransactionData();

        const statsTimer = this.enableStatsOutput();
        while (this.keepRunning) {
            const clientConnectionState = await gwHelper.waitForReady();
            if (clientConnectionState === 'NotConnected') {

                await sleep(config.grpcSleepMax, config.grpcSleepMin);

            } else if (clientConnectionState === 'Ready') {

                if (this.transactionRunner.getUnfinishedTransactions() < config.maxUnfinishedTransactionCount) {
                    this.transactionRunner.runTransaction(
                        transactionData.getTransactionDetails(config.transactionType)
                    );
                } else {
                    await sleep(config.maxLimit, config.minLimit);
                }
            }

            if (!this.keepRunning) {
                if (statsTimer) {
                    clearInterval(statsTimer);
                }
                const rc = this.finalStatsAndExitRc();
                console.log('Exiting process...', rc);
                process.exit(rc);
            }
        }
    }

    private finalStatsAndExitRc(): ExitStatus {
        const finalTxnStats = this.transactionRunner.getTransactionStats();
        const statMessage: StatsMessage = {
            component: 'CLIENT',
            timestamp: new Date().toISOString(),
            stage: 'FINAL-STATS',
            message: ''
        }
        this.outputStatFigures(statMessage, finalTxnStats);

        if (finalTxnStats.unsuccessfulEval === 0 && finalTxnStats.unsuccessfulSubmits === 0) {
            return 0;
        }

        if (this.currentStatsStatus === 'allfailures') {
            return 2;
        }

        return 1;
    }

    private displayConfig() {
        console.log('App running with Configuration:\n', config);
    }

    private enableStatsOutput(): NodeJS.Timer | null {
        if (!this.keepRunning || config.txStatsTimer === 0) {
            return null;
        }

        const intervalId = setInterval(() => this.outputStatInformation(), config.txStatsTimer);
        return intervalId;
    }

    private outputStatFigures(statMessage: StatsMessage, txStats: TransactionStats) {
        statMessage.message = `Submit: good=${txStats.successfulSubmits}, bad=${txStats.unsuccessfulSubmits}. Evals: good=${txStats.successfulEval}, bad=${txStats.unsuccessfulEval}`
        const output = config.colourLogs ? chalk.cyan(JSON.stringify(statMessage)) : JSON.stringify(statMessage);
        console.error(output);

    }

    private outputStatInformation(): void {

        const txStats = this.transactionRunner.getTransactionStats();
        const statMessage: StatsMessage = {
            component: 'CLIENT',
            timestamp: new Date().toISOString(),
            stage: 'STATS',
            message: ''
        }

        const statsStatus = this.checkStatsHaveChanged(txStats);

        if (statsStatus === 'stalled' && (config.txStatsMode != 'Stopped')) {
            statMessage.message = 'WARNING: Client/Network may have stalled, no new transactions are being evaluated or endorsed';
            const output = config.colourLogs ? chalk.yellow(JSON.stringify(statMessage)) : JSON.stringify(statMessage);
            console.error(output);
            return;
        }

        if (statsStatus === 'allfailures' && (config.txStatsMode != 'Stalled')) {
            statMessage.message = 'WARNING: Client/Network may have stopped, all transactions are failing';
            const output = config.colourLogs ? chalk.yellow(JSON.stringify(statMessage)) : JSON.stringify(statMessage);
            console.error(output);
            return;
        }

        if (config.txStatsMode === 'All') {
            this.outputStatFigures(statMessage, txStats);
        }
    }

    private checkStatsHaveChanged(currentStats: TransactionStats): StatsStatus {
        let statsStatus: StatsStatus = 'working';

        try {
            if (!this.previousStats) {
                return 'working';
            }

            if (currentStats.successfulEval == this.previousStats.successfulEval &&
                currentStats.successfulSubmits == this.previousStats.successfulSubmits &&
                (currentStats.unsuccessfulEval != this.previousStats.unsuccessfulEval ||
                currentStats.unsuccessfulSubmits != this.previousStats.unsuccessfulSubmits)) {

                statsStatus = 'allfailures';
                return statsStatus;
            }

            if (currentStats.successfulEval != this.previousStats.successfulEval ||
                currentStats.successfulSubmits != this.previousStats.successfulSubmits ||
                currentStats.unsuccessfulEval != this.previousStats.unsuccessfulEval ||
                currentStats.unsuccessfulSubmits != this.previousStats.unsuccessfulSubmits) {

                return 'working';
            }

            return 'stalled';
        } finally {
            this.previousStats = currentStats;
            this.currentStatsStatus = statsStatus;
        }
    }


    private async configure(gwHelper: GatewayHelper) {
        this.gateway = await gwHelper.configureGateway();
        this.transactionRunner = new TransactionRunner(
            this.gateway,
            config.channelName,
            config.chaincodeName
        );
    }
}

const app = new App();
app
    .main()
    .catch((error) =>
        console.log('******** FAILED to run the application:', error)
    );

process.on('SIGINT', () => {
    console.log('request to terminate received, stopping......');
    app.keepRunning = false;
});
