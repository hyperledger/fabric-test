### Welcome to fabric-test
-------

[![Build Status](https://dev.azure.com/Hyperledger/Fabric-Test/_apis/build/status/Fabric-Test?branchName=master)](https://dev.azure.com/Hyperledger/Fabric-Test/_build/latest?definitionId=58&branchName=master)

You are in the right place if you are interested in testing the Hyperledger Fabric and related repositories.

## Getting Started
Here are some recommended setup steps.
The following repositories will need to be cloned separately with their corresponding images built.
* fabric:
    * fabric-orderer
    * fabric-peer
    * fabric-kafka
    * fabric-zookeeper
    * fabric-tools
    * fabric-couchdb
    * fabric-testenv
    * fabric-ccenv
* fabric-ca
* fabric-test

### Setup the Submodules
Once the `fabric`, `fabric-ca` and `fabric-test` repositories are in place, in $GOPATH/src/github.com/hyperledger/,
initialize and populate the submodules. Execute the following:
```
  cd $GOPATH/src/github.com/hyperledger/fabric-test
  git submodule update --init --recursive
```

### Update git submodules (Optional)
The fabric-test repository contains submodules of other Hyperledger Fabric projects that are used in testing.
Tests may be run with the submodule commit levels saved with the commit-level of fabric-test.
Or, the git submodules may be updated to run tests with the bleeding edge of development master branches.
If you would like to update the git submodules, use the following command:
```
  git submodule foreach git pull origin master
```
**Note: When making changes for committing to a submodule (for example, fabric code), then make the change in the actual repository and not here in the submodules. This makes managing changes much easier when working with submodules.**

### Build the images, binaries and gotools

Ensure you are in your $GOPATH/src/github.com/hyperledger/fabric-test directory. These steps will help prepare the environment.

To install dependencies - NodeJS,NPM (one time only):
```
  make pre-setup
```

To build all images and binaries in fabric, fabric-ca, as required by tests (execute each time you update the repositories commit levels, after each `make git-update`)

```
  cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric

  make docker     #  Builds all fabric images.
  make native     #  Builds all binaries.


  cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-ca

  make docker     # Builds all fabric-ca images.

```

To install all the gotools, required for testing, execute the following command
```
  cd $GOPATH/src/github.com/hyperledger/fabric-test

  make gotools     # Downloads the gotools like ginkgo, golint, goimports, gocov and govendor
```

To update the go version in the repo, follow the below steps
```
  Step 1: Change GO_VER in fabric-test/ci.properties and also update the same in azure-pipeline yml files in fabric-test/ci directory.

  Step 2: Find all files in repo called go.mod. 'cd' into each of those directories. Remove go.mod and go.sum files and execute the following steps
          1. go mod init
          2. go get -u github.com/hyperledger/fabric-test@master
          3. go mod tidy

  Step 3: Commit all the go.mod and go.sum files that get changed in those directories
```

Then, choose a tool and a test to run by following the instructions. For example, to run a Behave test, execute the following:

```
cd ../feature
../scripts/install_behave.sh
behave -t smoke -k
```

### Easy Method to build all images and run tests with a single make target

You can run the automated test suites with a makefile target given below. This handles all the steps for you as the procedure installs all the prerequisites that include cloning fabric, fabric-ca repositories, building images and binaries and executing the daily tests or smoke tests in the fabric-test repository. Simply run one of the following commands,

```

  make ci-daily    # Cleans environment, updates submodules, clones & builds
                   # fabric & fabric-ca images, executes Daily tests from
                   # regression/daily folder.

  make ci-smoke    # Cleans environment, updates submodules, clones & builds
                   # fabric & fabric-ca images, executes Smoke tests from
                   # regression/smoke folder.

```

## Tools Used to Execute Tests

#### NetworkLauncher - dynamically build a Fabric network
Please see the README located in the `tools/NL` directory for more detailed information for using the command line to run the Networker Launcher to dynamically create a Fabric network on a single host machine.

#### Performance Traffic Engine
Please see the README located in the `tools/PTE` directory for more detailed information for using the Performance Traffic Engine to drive transactions through a Fabric network.

#### Ledger Traffic Engine
Please see the README located in the `tools/LTE` directory for more detailed information for using the Ledger Traffic Engine to execute APIs to test the functionality and throughput of Ledger code that exists inside the peer.

#### Cello Ansible Agent
Cello is a Hyperledger Project (https://www.hyperledger.org/projects/cello) with its own repository.
It contains the `Cello Ansible Agent`, an easy-to-use tool for
deploying and managing a fabric network on one or more hosts in the cloud.
Refer to these instructions
https://github.com/hyperledger/cello/blob/master/src/agent/ansible/README.md
to clone it and set up an ansible controller to deploy a network.


# Continuous Integration

Many tests are now integrated into CI. Every patch set triggers a `fabric-test-verify` job and executes `smoke` tests. Once the build is successfully executed, the CI job sends `All checks have passed` vote back to the corresponding github pull request; otherwise it sends an error message. Please see the  fabric-test CI job page:

**Note**: Migrating from Jenkins to Azure CI.

.. Licensed under Creative Commons Attribution 4.0 International License
   https://creativecommons.org/licenses/by/4.0/

