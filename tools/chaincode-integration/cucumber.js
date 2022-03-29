/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

// Configuration for running the chaincode tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');


// -----------------------------------------
// Fabric-Samples Test-Network configuration.

// EDIT this to the location of the test-network scripts
const TEST_NETWORK_DIR='/github.com/hyperledger/fabric-samples/test-network'

// EDIT the location of the chaincodes to approriate directories
const config = {
  TestNetwork: {
    rootDir: TEST_NETWORK_DIR,
    chaincodes: {
      simple: { path: '/github.com/fabric-chaincode-node/integrationtest/contracts/simple-v220-node', lang: "javascript" },
      advancedtypes: { path: '/github.com/fabric-chaincode-node/integrationtest/contracts/advancedtypes-typescript', lang: "typescript"}
    },
    cryptoPath : path.resolve(TEST_NETWORK_DIR, 'organizations', 'peerOrganizations', 'org1.example.com'),
    env: "",   // environment string to be used... eg... env: "CONTAINER_CLI=podman"
    peerEndpoint : 'localhost:7051',
  },
  TestOperator: {
    rootDir:'/home/matthew/github.com/hyperledger/fabric-test/tools/chaincode-integration/resources/testoperator',
    binary:'/home/matthew/github.com/hyperledger/fabric-test/tools/operator/operator',
    env: ""
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

console.log(process.cwd())
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

