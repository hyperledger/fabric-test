/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { exec as nodeExec } from 'child_process';
import { EOL } from 'os';
import { Logger } from './logger';

const logger = Logger.getLogger('./src/utils/docker.ts');

async function exec(command: string, allowError: boolean = false): Promise<string> {
    logger.debug(`[Allow error: ${allowError}] Executing: ${command}`);

    return new Promise((resolve, reject) => {
        nodeExec(command, (err, stdout) => {
            if (err !== null && !allowError) {
                reject(err);
            }
            resolve(stdout.trim());
        });
     });
}

export class Docker {
    // returns an array of the project names sent which are up networks
    public static async projectsUp(...projectNames: string[]): Promise<string[]> {
        const projDashMap = new Map<string, string>();
        let query = '"';

        projectNames.forEach((projectName) => {
            projDashMap.set(projectName.split('-').join(''), projectName);
            query += `${projectName.split('-').join('-\\?')}|`;
        });

        query = query.split('|').slice(0, -1).join('\\|') + '"';

        try {
            const matches = await exec(`docker network ls | grep -oh ${query}`);
            return matches.split(EOL).filter((el, idx) => matches.indexOf(el) === idx).map((el) => {
                return projDashMap.get(el.split('-').join('')); // handle that in linux dashes are lost from network name
            });
        } catch (err) {
            return [];
        }
    }

    public static async composeUp(file: string, projectName?: string) {
        let project = '';

        if (projectName) {
           project = `-p ${projectName} `;
        }

        await exec(`docker-compose -f ${file} ${project}up -d`);
    }

    public static async composeDown(file: string, projectName?: string, allowError: boolean = false) {
        let project = '';

        if (projectName) {
           project = `-p ${projectName} `;
        }

        await exec(`docker-compose -f ${file} ${project}down`, allowError);
    }

    public static async exec(container: string, command: string): Promise<string> {
        return await exec(`docker exec ${container} ${command}`);
    }

    public static async removeContainers(partialName: string) {
        return await exec(`docker rm -f $(docker ps -a | grep "${partialName}" | awk '{print $1}')`, true);
    }

    public static async removeImages(partialName: string) {
        return await exec(`docker rmi $(docker images | grep "^${partialName}" | awk '{print $3}')`, true);
    }
}
