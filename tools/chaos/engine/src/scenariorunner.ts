/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {NodeManager, NodeManagerActions} from './nodemanager'
import {Logger} from './logger';
import { promises as fs } from 'fs';
import * as path from 'path'
import * as yaml from 'js-yaml'

class Scenario {
    name = ''
    description = ''
    steps: string[] = []
}

type GatewaySteps = 'stopgateway' | 'restartgateway' | 'pausegateway' | 'unpausegateway' | 'killgateway';
type PeerSteps = 'unpausepeer' | 'restartpeer' | 'pausepeer' | 'stoppeer' | 'stopallpeers' | 'pauseallpeers' | 'restartallpeers' | 'unpauseallpeers' | 'killpeer' | 'killallpeers';
type OrdererSteps = 'pauseorderer' | 'stoporderer' | 'restartorderer' | 'unpauseorderer' | 'stopallorderers' | 'pauseallorderers' | 'restartallorderers' | 'unpauseallorderers'| 'killorderer' | 'killallorderers';
type GenericSteps =  'delay' | 'sleep';
type Steps = GatewaySteps | PeerSteps | OrdererSteps | GenericSteps;

const stepMapper: Map<Steps, keyof NodeManager> = new Map<Steps, keyof NodeManager>();
stepMapper.set('stopgateway', 'stopGatewayPeer');
stepMapper.set('killgateway', 'killGatewayPeer');
stepMapper.set('pausegateway', 'pauseGatewayPeer');
stepMapper.set('restartgateway', 'restartGatewayPeer');
stepMapper.set('unpausegateway', 'unpauseGatewayPeer');

stepMapper.set('stoppeer', 'stopNonGatewayPeer');
stepMapper.set('killpeer', 'killNonGatewayPeer');
stepMapper.set('pausepeer', 'pauseNonGatewayPeer');
stepMapper.set('unpausepeer', 'unpauseNonGatewayPeer');
stepMapper.set('restartpeer', 'restartNonGatewayPeer');

stepMapper.set('stopallpeers', 'stopAllOrgPeers');
stepMapper.set('killallpeers', 'killAllOrgPeers');
stepMapper.set('pauseallpeers', 'pauseAllOrgPeers');
stepMapper.set('restartallpeers', 'restartAllOrgPeers');
stepMapper.set('unpauseallpeers', 'unpauseAllOrgPeers');

stepMapper.set('stoporderer', 'stopOrderer');
stepMapper.set('killorderer', 'killOrderer');
stepMapper.set('pauseorderer', 'pauseOrderer');
stepMapper.set('restartorderer', 'restartOrderer');
stepMapper.set('unpauseorderer', 'unpauseOrderer');

stepMapper.set('stopallorderers', 'stopAllOrderers');
stepMapper.set('killallorderers', 'killAllOrderers');
stepMapper.set('pauseallorderers', 'pauseAllOrderers');
stepMapper.set('restartallorderers', 'restartAllOrderers');
stepMapper.set('unpauseallorderers', 'unpauseAllOrderers');

stepMapper.set('delay', 'sleep');
stepMapper.set('sleep', 'sleep');

export class ScenarioRunner {

    private loadedScenarios: Map<string, Scenario> = new Map<string, Scenario>();
    private scenarioNames: string[] = [];

    constructor(private readonly scenariodir: string,
                private readonly gatewayPeer: string) {
    }

    async loadScenarios(intervalName: string): Promise<void> {
        const scenarioFiles = await fs.readdir(this.scenariodir);
        for (const scenarioFile of scenarioFiles) {
            if (scenarioFile.toLowerCase().endsWith('.yaml')) {
                const scenarioPath = path.join(this.scenariodir, scenarioFile)
                const scenarioContents = (await fs.readFile(scenarioPath)).toString();
                const scenario = yaml.load(scenarioContents) as Scenario;
                this.valiateSenario(scenario, scenarioPath);
                this.loadedScenarios.set(scenario.name, scenario);
            }
        }
        this.scenarioNames = Array.from(this.loadedScenarios.keys());

        console.log('---- Loaded Scenarios ----');
        for (const scenarioName of this.scenarioNames) {
            console.log(scenarioName);
        }
        console.log('--------------------------');

        const indexOfInterval = this.scenarioNames.indexOf(intervalName);
        if (indexOfInterval !== -1) {
            this.scenarioNames.splice(indexOfInterval, 1);
        }
    }

    getScenarioNames(): string[] {
        return this.scenarioNames;
    }

    async runScenario(scenarioName: string): Promise<void> {
        const scenario = this.loadedScenarios.get(scenarioName);
        if (!scenario) {
            throw new Error(`No scenario with the name ${scenarioName} can be found`);
        }

        const nodeManager = new NodeManager(this.gatewayPeer, scenarioName);
        Logger.logPoint('Start', scenarioName, `running scenario ${scenario.description}`);

        for (const step of scenario.steps) {
            const actionAndParameters = step.split(' ');
            const stepMethod = stepMapper.get(actionAndParameters[0].toLowerCase() as Steps);
            if (!stepMethod) {
                throw new Error(`No step called ${actionAndParameters[0]} exists`);
            }

            const toInvoke = nodeManager[stepMethod] as NodeManagerActions;
            actionAndParameters.shift();
            await toInvoke.call(nodeManager, actionAndParameters);
        }

        Logger.logPoint('End', scenarioName, `scenario ${scenario.description} completed successfully`);
    }

    private valiateSenario(scenario: Scenario, scenarioPath: string) {
        if (!scenario.name) {
            throw new Error(`${scenarioPath} has no 'name' defined`);
        }

        if (!scenario.steps || !Array.isArray(scenario.steps)) {
            throw new Error(`${scenarioPath} has no 'steps' defined or steps is not an array`);
        }

        for (const step of scenario.steps) {
            const actionAndParameters = step.split(' ');
            const stepMethod = stepMapper.get(actionAndParameters[0].toLowerCase() as Steps);
            if (!stepMethod) {
                throw new Error(`${scenarioPath} has unknown step called ${actionAndParameters[0]} defined`);
            } else {
                NodeManager.validateStep(stepMethod, actionAndParameters);
            }
        }
    }

    scenarioExists(scenarioName: string): boolean {
        return this.loadedScenarios.get(scenarioName) !== undefined;
    }
}