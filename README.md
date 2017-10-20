Welcome to fabric-test
-------

[![Build Status](https://jenkins.hyperledger.org/buildStatus/icon?job=fabric-test-merge-x86_64)](https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-merge-x86_64/)

You are in the right place if you are interested in testing the Hyperledger Fabric and related repositories.

## Getting Started
Here are some recommended setup steps.

#### Clone the repositories
The `fabric-test` repository contains submodules of other Hyperledger Fabric projects that are used in testing.

The following repositories will need to be cloned separately with their corresponding images built.
* fabric
    * fabric-orderer
    * fabric-peer
    * fabric-kafka
    * fabric-zookeeper
    * fabric-tools
    * fabric-couchdb
    * fabric-testenv
* fabric-ca
    * fabric-ca
* fabric-sdk-node
    * fabric-sdk-node

#### Update git submodules
The git submodules need to be initialized when the repository is first cloned. Use the following command.
```
  cd fabric-test
  git submodule update --init --recursive
```
**When making changes for committing to a submodule, make the change in the actual repository and not in the submodule. This makes managing changes much easier when working with submodules.**

When updating the git submodules with a more recent commit sha from the repository master, use the following command:
```
git submodule foreach git pull origin master
```

#### Get and build the latest code

```
  cd ../fabric-ca
  make docker

  cd ../fabric
  make docker configtxgen cryptogen
```

## Tools Used to Execute Tests

#### Behave - functional and system tests
Please see the README located in the `feature` directory for more detailed information for using and contributing to the Fabric system behave framework.

The tests that utilize this framework cover at least one of the following categories:
* basic functionality
* feature behaviors
* configuration settings - both network and component based
* negative testing
* upgrades and fallbacks
* chaincode API testing

The following are not covered in using this tool:
* scalability
* performance
* long running tests
* stress testing
* timed tests

#### NetworkLauncher - dynamically build a Fabric network
Please see the README located in the `tools/NL` directory for more detailed information for using the command line to run the Networker Launcher to dynamically create a Fabric network on a single host machine.

#### Performance Traffic Engine
Please see the README located in the `tools/PTE` directory for more detailed information for using the Performance Traffic Engine to drive transactions through a Fabric network.

#### Orderer Traffic Engine
Please see the README located in the `tools/OTE` directory for more detailed information for using the Orderer Traffic Engine to use broadcast clients to drive transactions through an Ordering Service and verify counts with deliver clients.

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

Many tests are now integrated into CI. Every patch set triggers a `fabric-test-verify` job and executes `smoke` tests. Once the build is successfully executed, the CI job sends gerrit a +1 vote back to the corresponding gerrit patch set; otherwise it sends -1. Please see the  fabric-test CI job page:

https://jenkins.hyperledger.org/view/fabric-test/

Jenkins also triggers a daily CI job (https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-daily-x86_64/) to execute `daily` tests as identified in fabric-test/regression/daily/runDailyTestSuite.sh. It clones the latest commits of fabric, fabric-ca, and other required repositories, and performs the following steps:

* Clone the latest commits for repositories being tested, including fabric, fabric-ca, and more
* Build docker images and binary files
* Build fabric-ca and fabric peer, orderer, cryptogen and configtxgen
* Update git submodules and install all the python required modules, including python, python-pytest, and everything else identified in fabric-test/feature/scripts/install_behave.sh.
* Run `behave daily` tests, and other tests identified in fabric-test/regression/daily/runDailyTestSuite.sh
* After the tests are completed, the CI job reports test results and populates the Job console. Click here to view the Test Results report display:
https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-daily-x86_64/test_results_analyzer/

.. Licensed under Creative Commons Attribution 4.0 International License
   https://creativecommons.org/licenses/by/4.0/
