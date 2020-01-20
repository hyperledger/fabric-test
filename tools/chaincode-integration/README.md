# Fabric Chaincode/Contract Integration

This is a test tool specifically designed to ensure that Fabric chaincode/contract implementations in all languages are complete and consistent.

## Structure of the tool

There are a set of different 'gherkin features' that drive tests for different aspects of the implementation. Each of these features will use one or more Fabric infrastructures and will use one or of required set of Chaincode and Contracts.

The Fabric infrastructure is supplied as part of the tool, the Chaincode and Contracts must be specified as these are the elements that are under test.

## Running the tool
### Pre-reqs

- Build environment setup for your chaincode language
- Node.js 10 or greater
- Docker and Docker Compose

### Usage
The tool is intended to be provided as an NPM module. Until release you can install it as follows:

```
curl -L https://raw.githubusercontent.com/hyperledger/fabric-test/master/tools/chaincode-integration/fabric-chaincode-integration-0.0.1.tgz
npm install -g fabric-chaincode-integration-0.0.1.tgz
```

The tool can then be run as follows

```
fabric-chaincode-integration run --chaincode-dir <PATH_TO_CHAINCODE> --language <CHAINCODE_LANGUAGE>
```

### CLI Options
#### Chaincode Directory (required)
Option: `--chaincode-directory`  
Alias: `-d`  

This should be the path to the directory which contains all the required chaincodes for testing (unless using the `--chaincode-overide` option). The directory provided should contain sub folders with the chaincode in where the folders are the name of the required chaincode e.g. `simple`.

#### Language (required)
Option: `--language`  
Alias: `-l`  
Choices: `golang | java | javascript | typescript`

The language of the chaincode that is being provided to the tool.

#### Chaincode Override
Option: `--chaincode-overide`

This should be a JSON object where the keys are the name of chaincode and the values are the path to that specific chaincode e.g. `{"simple": "/Users/users/chaincode/simple"}`. The chaincode used in this will be used instead of the chaincode in the chaincode directory for that key (if one exists).

#### Logging level
Option: `--logging-level`
Choices: `info | debug`
Default: `info`

Set the level of detail for the logging output of the tool. Info provides a top level view of which tests have failed and which networks they are being run against. Debug provides a more in-depth breakdown of each action the tool is taking including which steps of the tests are running.

#### Tags
Option: `--tags`

Set which specific tests to run. Each of the features that describe the tests that this repo will run are tagged. You can limit which of these are run by specifying a [cucumber tag expression](https://cucumber.io/docs/cucumber/api/#tag-expressions). For example run only the feature testing basic checks by using `--tags @basic-checks`. 

## Required chaincodes
To run the tool in its entirety (i.e. not tag limitted) the following chaincodes are required:
- simple
- advancedtypes
- commercialpaper
- private

You can find schemas defining how each of these chaincodes should be written in the [docs/schemas](./docs/schemas) folder. This is structured such that each chaincode has its own json file named `<CHAINCODE_NAME>.json` which contains a breakdown of the contracts that should make up the chaincode, their required transactions and what those transactions should do. It is important that chaincodes provided for use with this tool match exactly what is expected of them or tests will pass/fail when they shouldn't.

> Note: All chaincode supplied should be written using the contract API's for the given language.

> Note: All chaincode supplied should output arrays and objects in a stringified JSON format.