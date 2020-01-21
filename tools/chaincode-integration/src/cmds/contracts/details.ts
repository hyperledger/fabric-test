/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import * as path from 'path';
import { Arguments, Argv } from 'yargs';
import { CommandModule } from '../../interfaces/interfaces';
import { addExports } from '../utils';

const options = {
    chaincode: {
        alias: 'c',
        description: 'Name of chaincode to get details about',
        required: true,
    },
    output: {
        alias: 'o',
        description: 'Location of file to output details to',
        required: true,
    },
};

const cmd: CommandModule = {
    builder: (yargs: Argv): Argv => {
        yargs.options(options);

        return yargs;
    },
    command: 'details [options]',
    desc: 'Writes markdown describing chaincode to filepath given',
    handler: (args: Arguments) => {
        return args.thePromise = new Promise(async (resolve, reject) => {
            try {
                let contents;

                try {
                    contents = await fs.readFile(path.join(__dirname, '../../../docs/schemas', `${args.chaincode}.json`), 'utf-8');
                } catch (err) {
                    throw new Error(`No such chaincode ${args.chaincode}`);
                }

                const schema = JSON.parse(contents);

                const tmpl = `# {{info.title}}
{{#each contracts}}
## {{name}}
{{#each transactions}}

### {{name}}
> {{description}}

{{#if parameters}}
Parameters:
| Name | Type |
| ---- | ---- |
{{#each parameters}}
| {{name}} | {{manageTypeSchemas schema}} |
{{/each}}
{{else}}
Parameters: None
{{/if}}

{{#if returns}}
Returns: {{manageTypeSchemas returns}}
{{else}}
Returns: None
{{/if}}

Submit type: {{#if tag.length }}Submit{{else}}Evaluate{{/if}}
{{/each}}
{{/each}}

## Components
{{#each components.schemas}}
### {{$id}}
{{#if properties}}
Properties:
| Name | Type |
| ---- | ---- |
{{#each properties}}
| {{@key}} | {{manageTypeSchemas this}} |
{{/each}}
{{else}}
Properties: None
{{/if}}
{{/each}}
`;

                Handlebars.registerHelper('manageTypeSchemas', manageTypeSchemas);

                const template = Handlebars.compile(tmpl);

                const result = template(schema);

                await fs.writeFile(path.resolve(process.cwd(), args.output as string), result);
            } catch (err) {
                reject(err);
            }

            resolve();
        });
    },
};

function manageTypeSchemas(typeSchema) {
    if (typeSchema.type) {
        if (typeSchema.type === 'array') {
            return `Array<${manageTypeSchemas(typeSchema.items)}>`;
        }

        return !typeSchema.format ? typeSchema.type : `${typeSchema.type} (${typeSchema.format})`;
    } else if (typeSchema.$ref) {
        const ref = typeSchema.$ref.replace('#/components/schemas/', '');
        return `[${ref}](#${ref})`;
    }

    return 'unknown';
}

addExports(exports, cmd);
