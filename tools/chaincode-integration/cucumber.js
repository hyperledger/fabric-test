// cucumber.js
const path = require('path');

const TEST_NETWORK_DIR='/home/matthew/github.com/hyperledger/fabric-samples/test-network'


const config = {
  TestNetwork: {
    rootDir: TEST_NETWORK_DIR,
    chaincodes: {
      simple: { path: '/home/matthew/github.com/ibp/marvin/contracts/simple-v220-node', lang: "javascript" },
      advancedtypes: { path: '/home/matthew/github.com/ibp/marvin/contracts/advancedtypes-typescript', lang: "typescript"}
    },
    cryptoPath : path.resolve(TEST_NETWORK_DIR, 'organizations', 'peerOrganizations', 'org1.example.com'),
    peerEndpoint : 'localhost:7051',
  }
}

const installDir = path.resolve(process.cwd(),'node_modules','fabric-chaincode-integration');

let dev = [
  './features/**/*.feature', // Specify our feature files
  '--require-module ts-node/register', // Load TypeScript module
  `--require ${installDir}/src/step-definitions/**/*.ts`, // Load step definitions
  '--format progress-bar', // Load custom formatter
  '--format @cucumber/pretty-formatter', // Load custom formatter,
  `--world-parameters ${JSON.stringify(config)}`,
  '--publish-quiet'
].join(' ');


let prod = [
  './features/**/*.feature', // Specify our feature files
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

