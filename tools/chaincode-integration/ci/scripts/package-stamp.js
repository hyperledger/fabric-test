#!/usr/bin/env node

/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

const fs = require('fs');
const path = require('path');

const now = new Date();
const timestamp = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}${now.getUTCSeconds()}`;

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageLockPath = path.resolve(__dirname, '../../package-lock.json');

const packageJson = require(packageJsonPath);
const packageLock = require(packageLockPath);

packageJson.version = packageJson.version + '-' + timestamp;
packageLock.version = packageJson.version;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2), 'utf8');