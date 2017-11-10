### Welcome to fabric-test
-------

[![Build Status](https://jenkins.hyperledger.org/buildStatus/icon?job=fabric-test-merge-x86_64)](https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-merge-x86_64/)

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

### Set up git hooks and git review (Optional)

If you are new to fabric-test repository, and if you plan to make changes to the tests and scripts herein, then after cloning the fabric-test repo, set up the git hooks and install and configure git review. In the following statements, replace < LFID > with your
Linux Foundation Account ID.

```
  cd fabric-test
  scp -p -P 29418 <LFID>@gerrit.hyperledger.org:hooks/commit-msg fabric-test/.git/hooks/

```

Add a local git hook to set 'signed-off-by' automatically to all commits.
Open fabric-test/.git/hooks/commit-msg, add the commands below after the line
"add_ChangeId":

```

  SOB=$(git var GIT_AUTHOR_IDENT | sed -n 's/^\(.*>\).*$/Signed-off-by: \1/p')
  grep -qs "^$SOB" "$1" || echo "$SOB" >> "$1"


```

Install and configure git review:

```
  apt-get install git-review
  git-review -s

```

To configure git review, add the following section to .git/config, and replace <LFID> with your gerrit id.

```
  [remote "gerrit"]
    url = ssh://<LFID>@gerrit.hyperledger.org:29418/fabric-test.git
    fetch = +refs/heads/*:refs/remotes/gerrit/*

```

### Build the images and binaries

Ensure you are in your $GOPATH/src/github.com/hyperledger/fabric-test directory. These steps will help prepare the environment.

To install dependencies - NodeJS,NPM (one time only):
```
  make pre_setup
```

To build all images and binaries in fabric, fabric-ca, as required by tests (execute each time you update the repositories commit levels, after each `make git-update`)

```
  cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric

  make docker     #  Builds all fabric images.
  make native     #  Builds all binaries.


  cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-ca

  make docker     # Builds all fabric-ca images.

```

Then, choose a tool and a test to run by following the instructions. For example, to run a Behave test, execute the following:

```
cd ../feature
./scripts/install_behave.sh
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

