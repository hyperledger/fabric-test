Welcome to fabric-test
-------
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

  # cello instructions coming soon  #WIP
```

## Tools Used to Execute Tests

#### Behave - functional and system tests
Please see the README located in the `feature` directory for more detailed information for using and contributing to the Fabric system behave framework.

The tests that utilize this framework cover atleast one of the following categories:
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
Please see the README located in the `tools/NL` directory for more detailed information for using the Networker Launcher to dynamically build a Fabric network.


.. Licensed under Creative Commons Attribution 4.0 International License
   https://creativecommons.org/licenses/by/4.0/
