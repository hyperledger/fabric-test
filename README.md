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
<<<<<<< HEAD
- Go 1.14 or later
- Node 1.12.0 or later
=======
- Go 1.18 or later
- Node 16 or later
>>>>>>> 44a5f3d9 (Bump Go to 1.18.2.)
- Java 8 or later (if using Java chaincode)
- Docker
- Docker-Compose
- Curl and Make

Once you've installed these simple dependencies you simply execute `make pre-reqs` from the root of the
repo and Fabric-Test will bootstrap the rest of the dependencies and install the required NPM packages.

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
