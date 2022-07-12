/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

// Configuration for running the chaincode tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');


// -----------------------------------------
// Fabric-Samples Test-Network configuration.

const TEST_NETWORK_DIR = path.resolve(process.env['TEST_NETWORK_DIR'])
const TEST_CHAINCODE_DIR = path.resolve(process.env['TEST_CHAINCODE_DIR'])

// EDIT the location of the chaincodes to approriate directories
const config = {
  TestNetwork: {
    rootDir: TEST_NETWORK_DIR,
    chaincodes: {
      simple: { path: path.resolve(TEST_CHAINCODE_DIR, 'simple-go'), lang: 'golang' }
      // advancedtypes: { path: path.resolve(CHAINCODE_DIR, 'chaincode', 'advancedtypes-go'), lang: 'golang'}
    },
    cryptoPath : path.resolve(TEST_NETWORK_DIR, 'organizations', 'peerOrganizations', 'org1.example.com'),
    env: "",   // environment string to be used... eg... env: "CONTAINER_CLI=podman"
    peerEndpoint : 'localhost:7051',
  }
}


// -----------------------------------------

// These configurations affect how the cucumber framework is used. In general these do not 
// need to be modified

// this configuration is only used when developing changes to the tool itself
let dev = [
  './features/**/*.feature', // Specify our feature files
  '--require-module ts-node/register', // Load TypeScript module
  `--require ./src/step-definitions/**/*.ts`, // Load step definitions
  '--format progress-bar', // Load custom formatter
  '--format @cucumber/pretty-formatter', // Load custom formatter,
  `--world-parameters ${JSON.stringify(config)}`,
  '--publish-quiet'
].join(' ');

// This should be in used in all other circumstances
const installDir = path.resolve(process.cwd(),'node_modules','fabric-chaincode-integration');

let prod = [
  `${installDir}/features/**/*.feature`, // Specify our feature files
  '--require-module ts-node/register', // Load TypeScript module
  `--require ${installDir}/dist/step-definitions/**/*.js`, // Load step definitions
  '--format progress-bar', // Load custom formatter
  '--format @cucumber/pretty-formatter', // Load custom formatter,
  `--world-parameters ${JSON.stringify(config)}`,
  '--publish-quiet'
].join(' ');


module.exports = {
  default: prod,
  prod,
  dev
};

