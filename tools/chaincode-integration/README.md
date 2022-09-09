# Fabric Chaincode/Contract Integration

This is a test tool specifically designed to ensure that Fabric chaincode/contract implementations in all languages are complete and consistent.
Note: this tool has undergone a major rework; please ensure you're familar with the updated notes.

## Structure of the tool

There are a set of different 'gherkin features' that drive tests for different aspects of the implementation. Each of these features will use one or more Fabric infrastructures and will use one or of required set of Chaincode and Contracts.

The Chaincode and Contracts must be specified as these are the elements that are under test. The Fabric Infrastructure is not provided as part of the tool, but there is a default 'provider' that can use the fabric-samples test-network.

The location of these components must be specific in the `cucumber.js` configuration file

## Chaincode Tests

Currently the tool has gherkin tests for the following chaincodes.

- simple
- advancedtypes
- private
- transactionhooks

You can find schemas defining how each of these chaincodes should be written in the [docs/schemas](./docs/schemas) folder. This is structured such that each chaincode has its own json file named `<CHAINCODE_NAME>.json` which contains a breakdown of the contracts that should make up the chaincode, their required transactions and what those transactions should do. It is important that chaincodes provided for use with this tool match exactly what is expected of them or tests will pass/fail when they shouldn't.


## Supported Fabric Infrastructures

There is support currently for using the test-network from the Fabric-Samples repo. The location of this needs to be specified in the `cucumber.js` 
configurtation.

## Supported Client SDK

It is planned to be able to support multiple different client sdk adpaters. So a single set of gherkin tests can connect to different sdks, and different versions. There is in a inbuilt connector that uses the FabricGateway SDK.
## Running the tool
### Pre-reqs

The tool itself has been tested with Node16; over and above this you will need:

- Build environment setup for your chaincode language
- Suitable configuration for starting a fabric network based on your choice of deployment

### Usage
The tool is intended to be provided as an NPM module. Until release you can install it as follows:

```
curl -L https://raw.githubusercontent.com/hyperledger/fabric-test/main/tools/chaincode-integration/fabric-chaincode-integration-0.6.0.tgz
npm init -y && npm install -s fabric-chaincode-integration-0.6.0.tgz
```

Check that the tool is working by getting the help text

```
$(npm bin)/fabric-chaincode-integration -h
fabric-chaincode-integration run

Runs the tests

Commands:
  fabric-chaincode-integration init  Creates a template cucumber.js
                                     configuration file
  fabric-chaincode-integration run   Runs the tests                    [default]

Options:
      --version  Show version number                                   [boolean]
      --help     Show help                                             [boolean]
  -p, --profile                                                [default: "prod"]
  -t, --tags   [default: "@basic-checks or @advanced-types or @metadata-checks or @ccaas-checks"]

```

The default action is to run the tests, reading the cucumber-js config file `cucumber.js` from the current directory. 

On first usage, run `$(npm bin)/fabric-chaincode-integration init` to copy to the current directory the configuration file `cucumber.js`. It is required that the `cucumber.js` file will be updated. 

Update the configuration, and then rerun the same command. This will run the default set of tags `@basic-checks or @advanced-types or @metadata-checks or @ccaas-checks`
To change which tags are used, set environment variable `SCENARIO_TAGS`. You can limit which of these are run by specifying a [cucumber tag expression](https://cucumber.io/docs/cucumber/api/#tag-expressions). Check the list of tests for the tags available.


The list of feature files for what is available can be seen in the `features` directory of this repo - or from the `node_modules` directory

