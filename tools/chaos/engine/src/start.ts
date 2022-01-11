/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'source-map-support/register';

import {ScenarioRunner} from './scenariorunner'

const INTERVAL_SCENARIO = '_interval';

type ChaosMode = 'random' | 'cycle' | 'single';
type RunConstraintType = 'seconds' | 'count' | 'none';

interface ScenarioStats {
    startTime: number;
    endTime: number;
    scenariosRun: number;
    cyclesCompleted: number;
}

interface ModeAndConstraint {
    mode: ChaosMode;
    singleScenario: string;
    runConstraintType: RunConstraintType;
    runConstraint: number;
}

let keepRunning = true;
process.on('SIGINT', () => {
    console.log('request to terminate received, will stop when current scenario ends');
    keepRunning = false;
});

const determineModeAndConstraint = (modeOrScenario: string, constraint: string): ModeAndConstraint => {

    if (!modeOrScenario) {
        return {mode: 'random', singleScenario: '', runConstraintType: 'none', runConstraint: 0};
    }

    if (modeOrScenario as ChaosMode !== 'random' && modeOrScenario as ChaosMode !== 'cycle') {
        return {mode: 'single', singleScenario: modeOrScenario, runConstraintType: 'none', runConstraint: 0};
    }

    const mode = modeOrScenario.toLowerCase() as ChaosMode;
    let runConstraintType: RunConstraintType = 'none';
    let runConstraint = 0;

    if (constraint) {
        if (constraint.endsWith('s')) {
            runConstraintType = 'seconds';
            runConstraint = parseInt(process.argv[5].slice(0, -1));
        } else {
            runConstraintType = 'count';
            runConstraint = parseInt(process.argv[5]);
        }

        // if they set the time or count to 0, then it turns off the contraint
        if (runConstraint === 0) {
            runConstraintType = 'none';
        }
    }

    return {mode, singleScenario: '', runConstraintType, runConstraint}
}

const runSingleScenario = async (scenarioRunner: ScenarioRunner, scenarioNames: string[], singleScenario: string): Promise<ScenarioStats> => {
    if (!scenarioNames.includes(singleScenario)) {
        throw new Error(`No scenario with name ${singleScenario} exists`);
    }

    const startTime = Date.now();
    await scenarioRunner.runScenario(singleScenario);
    const endTime = Date.now();
    return {startTime, endTime, scenariosRun:1, cyclesCompleted:0}
}

const runScenarioLoop = async (scenarioRunner: ScenarioRunner, scenarioNames: string[], mode: ChaosMode, runConstraintType: RunConstraintType, runConstraint: number): Promise<ScenarioStats> => {
    const startTime = Date.now();
    let endTime = startTime;
    let scenariosRun = 0;
    let cyclesCompleted = 0;

    let scenarioIndex = 0;

    while (keepRunning) {
        // find a randon scenario to run if random
        if (mode === 'random') {
            scenarioIndex = Math.round(Math.random() * (scenarioNames.length - 1));
        }

        // run the next scenario
        await scenarioRunner.runScenario(scenarioNames[scenarioIndex]);
        scenariosRun++;
        endTime = Date.now();

        // check to see if need to stop running due to time for random and cycle (will never be single mode)
        if (keepRunning && runConstraintType === 'seconds' && (endTime - startTime) >= (runConstraint * 1000)) {
            break;
        }

        // if mode is random, then check to see if we need to stop due to count of scenarios
        if (keepRunning && mode === 'random' && runConstraintType === 'count' && scenariosRun === runConstraint) {
            break;
        }

        // if mode is cycle and not stopped due to time then move to next scenario and check to see if we should stop based on completed cycles
        if (keepRunning && mode === 'cycle') {
            scenarioIndex++;
            if (scenarioIndex >= scenarioNames.length) {
                scenarioIndex = 0;
                cyclesCompleted++;
                if (runConstraintType === 'count' && cyclesCompleted === runConstraint) {
                    break;
                }
            }
        }

        // run the interval scenario if there is one and we are still running
        if (keepRunning && scenarioRunner.scenarioExists(INTERVAL_SCENARIO)) {
            await scenarioRunner.runScenario(INTERVAL_SCENARIO);
        }
    }

    return {startTime, endTime, scenariosRun, cyclesCompleted};
}

// Arguments are
// path to scenarios
// name of gateway peer
// mode (defaults to random if not specified)
// run limiter. If it ends with 's' then limit the run to that number of seconds otherwise limit it either to number of scenarios (random) or number of cycles

(async (): Promise<void> => {

    try {
        const scenarioDirectory = process.argv[2];
        const gatewayPeer = process.argv[3];
        const {mode, singleScenario, runConstraintType, runConstraint} = determineModeAndConstraint(process.argv[4], process.argv[5]);

        console.log('Scenario Directory: ', scenarioDirectory);
        console.log('Gateway Peer      : ', gatewayPeer);
        console.log('Mode              : ', mode);

        if (mode === 'single') {
            console.log('Single Scenario   : ', singleScenario);
        } else {
            console.log('ConstraintType    : ', runConstraintType);
            console.log('Constraint        : ', runConstraint);
        }
        console.log();

        const scenarioRunner = new ScenarioRunner(scenarioDirectory, gatewayPeer);
        await scenarioRunner.loadScenarios(INTERVAL_SCENARIO);
        const scenarioNames = scenarioRunner.getScenarioNames();

        if (scenarioNames.length === 0) {
            throw new Error(`No scenarios found in ${process.argv[2]}`);
        }

        let scenarioStats: ScenarioStats;

        if (mode === 'single') {
            scenarioStats = await runSingleScenario(scenarioRunner, scenarioNames, singleScenario);
        } else {
            scenarioStats = await runScenarioLoop(scenarioRunner, scenarioNames, mode, runConstraintType, runConstraint);
        }

        // Output statistics: time duration, scenarios run, cycles run (summarise all orderers and peers in the future)
        const cycleMessage = mode === 'cycle' ? `Total cycles completed: ${scenarioStats.cyclesCompleted}` : '';
        console.log(`\nChaos ran in ${mode} Mode for ${(scenarioStats.endTime - scenarioStats.startTime)/1000} seconds. Total scenarios run: ${scenarioStats.scenariosRun}. ${cycleMessage}`);

    } catch(error) {
        console.log(error);
        console.log('Terminating due to error');
    }

})().catch(error => console.log('******** FAILED to run the application:', error));
