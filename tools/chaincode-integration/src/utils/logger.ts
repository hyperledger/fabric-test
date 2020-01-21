/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as safeStringify from 'fast-safe-stringify';
import * as winston from 'winston';
import { Global } from '../interfaces/interfaces';

const SPLAT: string = Symbol.for('splat') as any as string; // shh TS hates symbols
// looks odd, but this is the most efficient way of padding strings in js
const padding = '                                               ';

declare const global: Global;

export class Logger {
    public static createLogger(level: string, name: string): winston.Logger {
        return winston.createLogger({
            exitOnError: false,
            format: Logger.formatter(name),
            level,
            transports: [
                Logger.getTransport(),
            ],
        });
    }

    public static getLogger(name: string): winston.Logger {
        const logLevel = Logger.getLogLevel();
        let logger;

        if (Logger.loggers[name]) {
            logger = Logger.loggers[name];
            logger.level = logLevel;
        } else {
            logger = Logger.createLogger(logLevel, name);
            Logger.loggers[name] = logger;
        }

        return logger;
    }

    public static refreshLoggers() {
        Object.keys(Logger.loggers).forEach((key) => {
            Logger.getLogger(key);
        });
    }

    private static loggers: {[s: string]: winston.Logger} = {};
    private static transport: winston.transports.ConsoleTransportInstance;

    private static getLogLevel(): string {
        let logLevel = 'info';

        const level = global.LOGGING_LEVEL;

        if (typeof level === 'string') {
            switch (level.toUpperCase()) {
                case 'DEBUG':
                    logLevel = 'debug';
                    break;
                case 'INFO':
                    logLevel = 'info';
            }
        }

        return logLevel;
    }

    private static getTransport(): winston.transports.ConsoleTransportInstance {
        if (!Logger.transport) {
            Logger.transport = new winston.transports.Console({handleExceptions: false});
        }
        return Logger.transport;
    }

    private static formatter(name: string) {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.metadata({fillExcept: ['message', 'level', 'timestamp', 'label']}),
            winston.format.colorize(),
            winston.format.padLevels(),
            winston.format.printf((info) => {
                const {timestamp, level, message} = info;
                const str = (`[cc-integration:${name}]` + padding).substring(0, padding.length);
                let out = '';
                if (info[SPLAT]) {
                    out = info[SPLAT].map((e) => {
                        if (e && e.error) {
                            if (e.error.stack) {
                                return e.error.stack;
                            } else {
                                return e.error.message;
                            }
                        } else {
                            return (safeStringify as any)(e);
                        }
                    });
                }
                return `${timestamp} ${level} ${str} ${message} ${out} `;
            }),
        );
    }
}
