[![Build Status](https://dev.azure.com/Hyperledger/Fabric-Test/_apis/build/status/Fabric-Test?branchName=main)](https://dev.azure.com/Hyperledger/Fabric-Test/_build/latest?definitionId=58&branchName=main)

## Getting Started

Fabric-Test provides two tools for testing Fabric itself: The Operator tool and PTE

- The Operator tool is used to deploy Fabric networks. It can be used to deploy Fabric to your local
machine using Docker, or to Kubernetes
- PTE, or Performance Traffic Engine is used to Invoke and Query chaincode through a network deployed
using the Operator tool

## Prerequisites

While Fabric-Test provides a utility for installing most of its dependencies, you do need a few basic
tools to get started:
- Go 1.18 or later
- Node 16 or later
- Java 8 or later (if using Java chaincode)
- Docker
- Docker-Compose
- Curl and Make

Once you've installed these simple dependencies you simply execute `make pre-reqs` from the root of the
repo and Fabric-Test will bootstrap the rest of the dependencies and install the required NPM packages.

## Environment variables

Make sure `$GOPATH/bin` (if GOPATH is set) or `$HOME/go/bin` is in your `$PATH` so that the go tools can be found.

If you run the `make` targets from the project root directory,
`fabric-test/bin` with the Fabric binaries will get added to `PATH` and
`fabric-test/config` with Fabric node config files will get added to `FABRIC_CFG_PATH`.
If you run the tests directly (outside of `make`) you will need to set these variables yourself.

## Running Test Suites with Make

You can run the automated test suites with a Makefile target given below. This handles all the steps for you as the
procedure installs all the prerequisites and executes the test suite in the targeted directory.
Simply call `make` and target one of the test suites in the `regression` directory:

```

  make regression/smoke     # Cleans environment, updates submodules, clones & builds
                            # fabric & fabric-ca images, executes Smoke tests from
                            # regression/smoke folder.

```

## Tools Used to Execute Tests

### Operator
Please see the README located in the `tools/operator` directory for more detailed information for using the Operator to
launch Fabric networks, administer them, and execute actions from test-input files to reconfigure the network, disrupt
the network, or use PTE to send transactions.

### Performance Traffic Engine
Please see the README located in the `tools/PTE` directory for more detailed information for using the
Performance Traffic Engine to drive transactions through a Fabric network.

.. Licensed under Creative Commons Attribution 4.0 International License
   https://creativecommons.org/licenses/by/4.0/
