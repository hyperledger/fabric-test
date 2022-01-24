/*
# Copyright Hyperledger Fabric Contributors. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

import { spawn } from "child_process";
import { Logger } from "../utils/logger";
// A general purpose structure that can be used for any command.
// This defines the important 'spawn' command. This executes the command
// with the arguments that have been specified.
// It is set to inherit the environment variables, uses the default sell, and inherits the
// stdio/stderr streams. (Inheriting means that the formating colour, etc is maintained)
//
// spawn() MUST be the last item chained sequence
//
// It also blanks the arguments supplied, so the instance of the cmd can be reused
// It returns a promise that is resolved when the exit code is 0, and rejected for any other code

const LOG = Logger.getLogger("Cmd");
class Cmd {
  public cmd = "";
  public args: string[] = [];
  public stdoutstr: string[] = [];
  public stderrstr: string[] = [];
  public env: Environment;

  public constructor(c: string, env?: Environment) {
    this.cmd = c;
    this.env = env || (process.env as Environment);
  }

  // can override the cwd
  public spawn(cwd = process.cwd()) {
    const promise = new Promise((resolve, reject) => {
      // eslint-disable-next-line no-console
      LOG.info(`spawning:: ${this.cmd} in ${cwd}`);
      const call = spawn(this.cmd, this.args, {
        cwd,
        env: this.env,
        shell: true,
        stdio: ["inherit", "pipe", "inherit"],
      });
      this.args = [];
      this.stdoutstr = [];
      call.on("exit", (code) => {
        // eslint-disable-next-line no-console
        LOG.info(`spawning:: ${this.cmd} code::${code}`);
        if (code === 0) {
          resolve(0);
        } else {
          reject(code);
        }
      });
      call.stdout.on("data", (data) => {
        const s = data.toString("utf8");
        LOG.info(s.slice(0, s.length - 1));
        this.stdoutstr.push(s);
      });
      return call;
    });

    return promise;
  }

  public toString(): string {
    // return `${this.cmd} ${this.args.join(' ')}`;
    return this.cmd;
  }
}

export interface Environment {
  [name: string]: string;
}

export const shellcmds = async (
  cmds: string[],
  cwd?: string,
  env?: Environment,

): Promise<string[]> => {
  const retvals = [];
  const cmdEnv = process.env as Environment;
  if (env) {
    Object.assign(cmdEnv, env);
  }

  for (const c of cmds) {
    const cmd = new Cmd(c, cmdEnv);
    await cmd.spawn(cwd);
    retvals.push(cmd.stdoutstr.join(" "));
  }
  return retvals;
};

export const shellcmd = async (
  cmd: string,
  env?: Environment
): Promise<string[]> => {
  const cmdEnv = process.env as Environment;
  if (env) {
    Object.assign(cmdEnv, env);
  }

  const c = new Cmd(cmd, cmdEnv);
  await c.spawn();
  return c.stdoutstr;
};
