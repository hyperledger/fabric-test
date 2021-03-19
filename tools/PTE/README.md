
# Performance Traffic Engine - PTE

The Performance Traffic Engine (PTE) uses SDKs to interact with [Hyperledger Fabric](http://hyperledger-fabric.readthedocs.io/en/latest/) networks by sending requests to and receiving responses from one or more networks.   Currently, PTE only uses [Hyperledger Fabric Client (HFC) Node SDK](https://fabric-sdk-node.github.io/index.html) and will include other SDKs in the future.

PTE is designed to meet two-fold requirements:

1. to handle the complexity of the Hyperledger Fabric network, e.g., locations and number of network, number of channels, organizations, peers, orderers etc.
2. to support various test cases, e.g., various chaincodes, transaction number, duration, mode, type, and payload size etc,

In order to meet the two-fold requirements above, flexibility and modularity are the primary design concepts of PTE regarding implementation and usage.  Moreover, PTE provides users many options for their test cases, see below for available options. The design of PTE is demonstrated in the diagram below:

![](PTE-concept.png)


In brief, PTE has the following features:

- channel: to create and join channel
- chaincode: to install, instantiate and upgrade user specified chaincode
- transactions: to deliver transactions to the targeted peers with specified transaction mode, type, and frequency
- network: to interact with local and/or remote networks simultaneously
- scaling: easy to work with any number of networks, orderers, peers, organizations, channels, chaincodes etc.
- events: to open and listen to event port and maintain the record of events received and un-received
- blockchain height: to query blockchain height and number of transactions
- results: to provide number of transactions sent versus the events received, and validates blockchain contents after last transaction
- multiple PTEs: easy to manage multiple PTEs, see the diagram below:


![](PTE-mgr.png)



## Table Of Contents:
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running PTE](#running-pte)
     - [Usage](#usage)
     - [Transaction Execution](#transaction-execution)
     - [Transaction Type](#transaction-type)
     - [Sample Use Cases](#sample-use-cases)
     - [Chaincodes](#chaincodes)
     - [Transaction Payload Generation](#tx-payload-gen)
     - [Output](#output)
 - [Reference](#reference)
    - [User Input File](#user-input-file)
    - [Connection Profile](#connection-profile)
    - [Creating a Local Fabric Network](#creating-a-local-fabric-network)
    - [CI Test](#ci-test)
    - [Remote PTE](#remote-pte)

---

## Prerequisites
To build and test the following prerequisites must be installed first:

- node and npm
    - `node`: >=`v8.9` AND <=`v10.0`
    - `npm`: >=`v5.6.0`
- gulp command
    - `npm install -g gulp`
- go (v1.11 or later)
    - refer to [Go - Getting Started](https://golang.org/doc/install)
- others:
    - in Ubuntu: `apt install -y build-essential libltdl-dev`
    - or refer to your distribution's repository

If planning to run your Fabric network locally, you'll need docker and a bit more. See [Hyperledger Fabric - Getting Started](http://hyperledger-fabric.readthedocs.io/en/latest/getting_started.html) for details.

### If running on a Mac
You need to install a gnu-compatible version of the `awk`, `date` utility. Install Brew (http://brew.sh) and run the following commands:
Install coreutils will install gdate
```
brew install gawk --with-default-names
brew install coreutils

```

## Setup
PTE can be used with either the stable `fabric-sdk-node` libraries obtained from the `npm` package manager, or the latest unstable libraries

### Use PTE with stable `fabric-sdk-node` libraries
1. Download fabric-test sources:
    - `go get -d github.com/hyperledger/fabric-test`

2. Download or update fabric, and fabric-ca sources, see [Hyperledger fabric-test](https://github.com/hyperledger/fabric-test) for details:
    - `cd $GOPATH/src/github.com/hyperledger/fabric-test`
    - if first time:
         - `git submodule update --init --recursive`
         - `git submodule foreach git pull origin main`
    - else:
         - `git submodule foreach git pull origin main`
    - `cd $GOPATH/src/github.com/hyperledger/fabric-test/scripts and run ./update_go_modules.sh` to update all the go modules for the
      chaincodes in the fabric-test

3. Obtain appropriate docker images:

Optionally, you may choose to skip this step of obtaining `fabric` and `fabric-ca` images if plan to run PTE against a remote Fabric network. See [Creating a local Fabric network](#creating-a-local-fabric-network) for additional information on this.

    - fabric
        - download from dockerhub:
            * `cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric/scripts`
            * If testing v1.0.0: `./bootstrap-1.0.0.sh`
        - build images yourself (v1.0.0 shown here):
            * `cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric/`
            * `git checkout v1.0.0`
            * `make docker`
    - fabric-ca
        * `cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-ca`
        * `git checkout v1.0.0`
        * `make docker`

4. Install SDK-Node
    - Stable (with latest fabric sdk-node)
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `rm package-lock.json`
        - `rm -rf node_modules`
        - `npm install fabric-client`
        - `npm install fabric-ca-client`
    - Stable (with specific version of fabric sdk-node)
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `rm package-lock.json`
        - `rm -rf node_modules`
        - `npm install fabric-client@version`, for example to install version `1.0.2`, `npm install fabric-client@1.0.2`
        - `npm install fabric-ca-client@version`, for example to install version `1.0.2`, `npm install fabric-ca-client@1.0.2`
    - Unstable (with development version of fabric sdk-node)
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `rm package-lock.json`
        - `rm -rf node_modules`
        - `npm install`



Once installed, the following steps are required.

1. Create Connection profile(s) for your Fabric network:
    - Create your own version of connection profile, see the example in **PTE/ConnProfiles/test-network/config.yaml** and change the address to your own Fabric addresses and credentials. The connection profile can be in either yaml or json format. Add a block for each channel, organization, orderer, peer, and certificateAuthorities, ensuring correctness.

    **Note that the service credential file is supported in fabric-test commit level `f923d548c00ee1f7336bbc8812ee0d2058489785` and older.**

2. Specify run scenarios:
   - Create your own version of PTEMgr.txt (if use pte_mgr.sh), runCases.txt and User Input json files, according to the test requirements. Use the desired chaincode name, channel name, organizations, etc. Using the information in your own network profiles, remember to "create" all channels, "join" channel, and "install"  and "instantiate"/"upgrade" chaincode for each org, to ensure all peers are set up correctly. Additional information can be found below.

## Running PTE

Before attempting to run PTE please ensure

1. your network is running!
2. you are in the correct directory `$GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`

If you do not have access to a Fabric network, please see the section on [Creating a local Fabric network](#creating-a-local-fabric-network).

### Usage
There are two ways to execute PTE: pte_mgr.sh and pte_driver.sh. pte_mgr.sh can be used to manage multiple PTEs while pte_driver.sh can only manage one PTE.

* ### pte_mgr.sh

      `./pte_mgr.sh <PTE mgr input file>`

    * Example

        `./pte_mgr.sh sampleccInputs/PTEMgr.txt`

        `sampleccInputs/PTEMgr.txt` contains the list of user specified run cases to be executed.  Each line is a PTE run case and includes two parameters: **driver type** and **run case file**.

        For instance, a PTE mgr file containing two run cases files would be:

            driver=pte sampleccInputs/runCases-constant-i-TLS.txt
            driver=pte sampleccInputs/runCases-constant-q-TLS.txt

        **Note:** Available driver type is pte only.

* ### pte_driver.sh

    `./pte_driver.sh <run cases file>`

    * Example

        `./pte_driver.sh sampleccInputs/runCases.txt`

        `sampleccInputs/runCases.txt` contains the list of test cases to be executed. Each line is a test case and includes two parameters: **SDK type** and **user input file**.

        For instance, a run cases file containing three test cases using the node SDK would be:

            sdk=node sampleccInputs/samplecc-chan1-i-TLS.json
            sdk=node sampleccInputs/samplecc-chan2-i-TLS.json
            sdk=node sampleccInputs/samplecc-chan3-i-TLS.json


        **Note:** Available SDK types are node, go, python and java; however, only the node SDK is currently supported.

    See [User Input file](#user-input-file) in the Reference section below for more information about these files.



### Transaction Execution
A single test case is described by a user input file. User input files define all the parameters for executing a test; including transaction type, number of processes, number of transactions, duration, etc. All processes in one test case will concurrently execute the specified transaction. Different transactions may be used in different test cases and then combined into a single run cases file, making it possible to create more complicated scenarios. For example, in a single run of PTE, a user could send a specific number of invokes to all peers and then query each peer separately.

* ### Transaction Execution Control

    The transaction can be executed with either **transaction number** or **run time duration**.  They are controlled by two user input parameters **nRequest** and **runDur**. See [User Input file](#user-input-file) in the Reference section below on how to control transaction execution using these two parameters.


### Transaction Type
* ### Invoke (move)
    To execute invoke (move) transactions, set the transType to Invoke and invokeType to Move, and specify the network parameters and desired execution parameters(**Please make sure** to update the path with your gopath in all the following snippets):

        "invokeCheck": "TRUE",
        "transMode": "Constant",
        "transType": "Invoke",
        "invokeType": "Move",
        "targetPeers": "OrgAnchor",
        "nProcPerOrg": "4",
        "nRequest": "1000",
        "runDur": "600",
        "TLS": "serverauth",

    And set the channel name in channelOpt:

        "channelOpt": {
            "name": "testchannel1",
            "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "testOrg1"
            ]
        },


* ### Invoke (query)
    To execute invoke (move) transactions, set the transType to Invoke and invokeType to Query, and specify the network parameters and desired execution parameters:

        "invokeCheck": "TRUE",
        "transMode": "Constant",
        "transType": "Invoke",
        "invokeType": "Query",
        "targetPeers": "OrgAnchor",
        "nProcPerOrg": "4",
        "nRequest": "1000",
        "runDur": "600",
        "TLS": "clientauth",

    And set the channel name in channelOpt:

        "channelOpt": {
            "name": "testchannel1",
            "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "testOrg1"
            ]
        },

### Custom Organization Names and MSP IDs
If you started a network using [Network Launcher](../NL/) and specified an organization map JSON (using the `-M` parameter) to create organizations with custom names and MSPs with custom IDs, you will need to create connection profile and test case files with the appropriate organization names.

You can use `PTE/ConnProfiles/test-network/config.yaml` as an example to create your own connection profile. See [Connection Profile](#connection-profile) for detail of the connection profile.

You can refer to `PTE/sampleccInputs` as an example to create your testcase. See [User Input File](#user-input-file) for detail of the testcase

### Sample Use Cases
* ### Latency
    Example: `sampleccInputs/samplecc-chan1-latency-i.json`
    Performs 1000 invokes (Move) with 1 process on 1 network using the sample_cc chaincode. The average of the execution result (execution time (ms)/1000 transactions) represents the latency of 1 invoke (Move).
* ### Long run
    Example: `sampleccInputs/samplecc-chan1-longrun-i.json`
    Performs invokes (Move) of various payload size of 1kb with 1 process on one network using sample_cc chaincode for 36 hours at 1 transaction per second.
* ### Complex
    Example: `sampleccInputs/samplecc-chan1-complex-i.json`
    Performs invokes (Move) of various payload size ranging from 10kb-500kb with 10 processes on one 4-peer network using sample_cc chaincode for 10 minutes. Each invoke (Move) is followed by an invoke (Query).
* ### More complicated scenarios
    * For multiple chaincodes deployments and transactions, configure each user input file to install and instantiate chaincodes and drive the transactions appropriately.
    * For a stress test on a single network, set all SCFiles to same network. Then concurrent execution of the test is performed against the network but with the workload specified in each user input file.
    * For a density test, configure config json in SCFiles, create run cases files, and user input files for each network. Then execute pte_mgr.sh against these  run cases files.

## Additional Use Cases
Although PTE's primary use case is to drive transactions into a Fabric network, it can be used for creating and joining channels, and chaincode installation, instantiation and upgrade. This gives the ability for more complete end-to-end scenarios.

* ### Channel Operations
    For any channel activities (create or join), set transType to `Channel`:

        "transMode": "Constant",
        "transType": "Channel",
        "invokeType": "Move",

    * ### Create a channel
        To create a channel, set the action in channelOpt to `create`, and set the name to the channel name. Note that orgName is ignored in this operation:

            "channelOpt": {
                "name": "testchannel1",
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
                "action":  "create",
                "orgName": [
                    "testOrg1"
                ]
            },

    * ### Join a channel
        To join all peers in an org to a channel, set the action in channelOpt to `join`, set name to channel name, and set orgName to the list of orgs to join:

            "channelOpt": {
                "name": "testchannel1",
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
                "action":  "join",
                "orgName": [
                    "testOrg1"
                ]
            },

* ### Chaincode Operations
    For chaincode setup (install or instantiate) set `deploy` according to the test. For example:

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/fabric-sdk-node/test/fixtures/src/github.com/sample_cc",
            "fcn": "init",
            "args": []
        },
    If installing chaincode on CouchDB with indexing, then inside the `deploy` section we should also add `metadataPath` for the location of the index definition files. Note: if `gopath` is defined in the service credential json, then specify the relative path from `$GOPATH/src/` (as is done in this example); otherwise use a fully specified absolute path.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/marbles02/go",
            "metadataPath": "github.com/hyperledger/fabric-test/chaincodes/marbles02/go/META-INF",
            "fcn": "init",
            "args": []
        },
    In above example, a default endorsement policy of "a signature by any member from any of the organizations corresponding to the array of member service providers" is used.
    If the test need a specific endorsement policy when chaincode instantiate, the 'endorsement' section need be configured like below format:

         "deploy": {
             "chaincodePath": "github.com/hyperledger/fabric-sdk-node/test/fixtures/src/github.com/sample_cc",
             "fcn": "init",
             "endorsement": {
                           "identities": [
                            { "role": { "name": "member", "mspId": "Org1MSP" }},
                            { "role": { "name": "member", "mspId": "Org2MSP" }}
                               ],
                           "policy": {
                              "2-of": [{ "signed-by": 0 }, { "signed-by": 1 }]
                             }
                          },
            "args": []
        },

    The policy syntax definition in :
        [Polciy Specification](https://fabric-sdk-node.github.io/global.html#PolicySpec)

    * ### Install a chaincode
        To install a chaincode, set the transType to `install`:

            "transMode": "Constant",
            "transType": "install",
            "invokeType": "Move",

        PTE can install a chaincode on all peers within an orgnization or on specified peers.

        ##### Install a chaincode on all peers

        In `channelOpt`, set channel name in `name` and list all orgs in `orgName`, such as:

            "channelOpt":
                "name":  "testchannel1",
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
                "action":  "create",
                "orgName": [
                    "testOrg1",
                    "testOrg2"
                ]
            },

        Note that action is ignored.

        ##### Install a chaincode on specific peers of an orgnization

        * Set the `targetPeers` to `LIST`

             "targetPeers": "LIST",

        * List all individual orgs and peers in `listOpt`, such as

             "listOpt": {
                 "org1": ["peer1", "peer2"],
                 "org2": ["peer1"]
             },

    * ### Instantiate a chaincode
        To instantiate a chaincode, set the transType to `instantiate`:

            "transMode": "Constant",
            "transType": "instantiate",
            "invokeType": "Move",

        and set channelOpt name to the channel name and specify the list of organizations that the chaincode will be instantiated:

            "channelOpt": {
                "name":  "testchannel1",
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
                "action":  "create",
                "orgName": [
                    "testOrg1",
                    "testOrg2"
                ]
            },

        Note that action is ignored. PTE instantiates chaincode on all peers of each organization listed in channelOpt.orgName.

        **Recommendation: instantiate a chaincode on the organization before sending a transaction to any peer of that organization.**

    * ### Upgrade a chaincode
        To Upgrade a chaincode, set the transType to `upgrade`:

            "transMode": "Constant",
            "transType": "upgrade",
            "invokeType": "Move",

        and rest of the steps are same as for instantiating a chaincode (see above).


* ### Query Blockchain Height Operations
    For any query blockchain height activities (query block), set transType to `QueryBlock`:

        "transMode": "Constant",
        "transType": "QueryBlock",
        "invokeType": "Move",

    * ### Query Blockchain height
        To query the length (number of transactions) in blocks, set org, peer, startBlock, and endBlock in queryBlockOpt:

            "queryBlockOpt": {
                "org1":  ["peer0org1examplecom"],
                "startBlock":  "195",
                "endBlock":  "200"
            },

        The following is the output with startBlock=195 and endBlock=200. The output includes the block height and the number of transactions from startBlock to endBlock.

            info: [PTE 0 main]: [queryBlockchainInfo] Channel queryInfo() returned block height=202
            info: [PTE 0 main]: [queryBlockchainInfo] block:Length:accu length= 195:10:10
            info: [PTE 0 main]: [queryBlockchainInfo] block:Length:accu length= 196:10:20
            info: [PTE 0 main]: [queryBlockchainInfo] block:Length:accu length= 197:10:30
            info: [PTE 0 main]: [queryBlockchainInfo] block:Length:accu length= 198:10:40
            info: [PTE 0 main]: [queryBlockchainInfo] block:Length:accu length= 199:10:50
            info: [PTE 0 main]: [queryBlockchainInfo] block:Length:accu length= 200:10:60
            info: [PTE 0 main]: [queryBlockchainInfo] blocks= 195:200, totalLength= 60



## Chaincodes
The following chaincodes are tested and supported:

* **example02**: This is a simple chaincode with limited capability.  This chaincode is **NOT** suitable for performance benchmark.

* **sample_cc**: This chaincode supports variable (randomized) payload sizes and performs encryption and decryption on the payload. Specify `ccType` as `ccchecker` when using this chaincode. See directory `sampleccInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/samplecc/go`.  Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/samplecc/go",
            "fcn": "init",
            "args": []
        },

* **marbles_cc**: [Marbles02 chaincode](https://github.com/hyperledger/fabric-test/chaincodes/marbles02/go). PTE alters the marble name (the first argument) and the marble size (the third argument) for each `initMarble` transaction. Specify `ccType` as `marblescc` when using this chaincode.  This chaincode ignores payload size, such as payLoadMin and payLoadMax. See directory `marblesccInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/marbles02/go`.  Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/marbles02/go",
            "fcn": "init",
            "args": []
        },

* **marblescc_priv**: [Marbles02 private chaincode](https://github.com/hyperledger/fabric-test/chaincodes/marbles02_private/go). PTE alters the marble name (the first argument) and the marble size (the third argument) for each `initMarble` transaction. Specify `ccType` as `marblescc_priv` when using this chaincode.  This chaincode ignores payload size, such as payLoadMin and payLoadMax. See directory `marblescc_privInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/marbles02_private/go`.  Set the deploy.chaincodePath to this directory in the user input file.  This chaincode can be used for side DB if user specifies collection configuration json in the `collectionsConfigPath` when instantiate the chaincode.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/marbles02_private/go",
            "collectionsConfigPath": "github.com/hyperledger/fabric-test/tools/PTE/marblescc_privInputs/collections_config-chan1.json",
            "fcn": "init",
            "args": []
        },

This chaincode passes private data as base64 encoded bytes in transient map.  User can define transient MAP in the `move` subsection under `invoke` section.  PTE will create a unique name for each marble.  See below for an example of transientMap.

        "invoke": {
            "query": {
                "fcn": "readMarblePrivateDetails",
                "args": ["marble"]
            },
            "move": {
                "fcn": "initMarble",
                "transientMap": {"marble": {"name":"marble", "color":"blue", "size":35, "owner":"tom", "price":99}},
                "args": []
            }
        },

* **sample_js**: This is the Node JS chaincode of sample_cc. See directory `samplejsInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/samplecc/node`.  Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/samplecc/node",
            "fcn": "init",
            "language": "node",
            "args": []
        },

* **sample_java**: This is the java chaincode of sample_cc. See directory `samplejavaInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/samplecc/java`.  Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/samplecc/java",
            "fcn": "init",
            "language": "java",
            "args": []
        },

* **sbecc**: This is the golang chaincode of state-based endorsement. See directory `sbeccInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/sbe`.  This chaincode ignores payload size, such as payLoadMin and payLoadMax. Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/sbe",
            "fcn": "init",
            "language": "golang",
            "args": []
        },
This chaincode requires packages not provided by the Go standard library, you will need to include those packages with this chaincode for managing or
[vendoring](https://hyperledger-fabric.readthedocs.io/en/release-1.2/chaincode4ade.html?highlight=vendor#managing-external-dependencies-for-chaincode-written-in-go) these dependencies by executing the following commands:

        - cd $GOPATH/src/github.com/hyperledger/fabric-test
        - make pre-setup
        - cd chaincodes/sbe
        - govendor init
        - govendor add +external


## Transaction Payload Generation
You can write logic to generate transaction (invoke or query) arguments that is specific to a chaincode type (or `ccType` in your chaincode definition JSON file.)

In addition, you can also write per-chaincode logic to specify the organization to which the submitter of a particular transaction must belong. Such an access control policy can be specified at the chaincode function level; i.e., the function name determines the list of organizations.
(This feature is useful when a chaincode function implements access control by checking the organization name of the transaction submitter using the `GetCreator()` method in the shim API. If PTE does not assign the right signing identity to the fabric client instance, transaction endorsements attempted during a test run will fail.)

The logic for `<ccType>` should be specified in `ccArgumentsGenerators/<ccType>/ccFunctions.js`, in a class named `ccFunctions` that inherits the `ccFunctionsBase` class defined in `ccArgumentsGenerators/ccFunctionsBase.js`.

(The following `ccType` values are supported by default: {`ccchecker`, `marblescc`, `marblescc_priv`, `sbecc`}. If you want to run PTE on a custom `ccType`, create an appropriate folder and JS file.)

The `ccFunctions` interface that should be implemented is described below. (_Note_: The functions in these interface will be called by `pte-execRequest.js`, so please ensure that they are defined and return a value of an appropriate type.)
```
class ccFunctions extends ccFunctionsBase {
    constructor(ccDfnPtr, logger, Nid, channelName, org, pid) {
        super(ccDfnPtr, logger, Nid, channelName, org, pid);
        // ADD INITIALIZATION LOGIC HERE
    }

    getInvokeArgs(txIDVar) {
        // ADD LOGIC TO COMPUTE CHAINCODE INVOCATION ARGUMENTS (EXCLUDING THE FUNCTION NAME)

        // POPULATE THE 'this.testInvokeArgs[]' ARRAY WITH THE COMPUTED ARGUMENTS' LIST

        // THIS ARRAY WILL BE READ IN 'pte-execRequest.js:getMoveRequest()'
    }

    getQueryArgs(txIDVar) {
        // ADD LOGIC TO COMPUTE CHAINCODE QUERY ARGUMENTS (EXCLUDING THE FUNCTION NAME)

        // POPULATE THE 'this.testQueryArgs[]' ARRAY WITH THE COMPUTED ARGUMENTS' LIST

        // THIS ARRAY WILL BE READ IN 'pte-execRequest.js:getQueryRequest()'
    }

    getExecModeLatencyFreq() {
        'return 0;	// RETURN APPROPRIATE INTEGER VALUE

        // THIS VALUE WILL BE USED IN 'pte-execRequest.js:execModeLatency()'
    }

    getAccessControlPolicyMap() {
        return {};	// RETURN JSON key-value mappings: <function-name> --> <array of org-names>

        // THIS VALUE WILL BE USED IN 'pte-execRequest.js:getMoveRequest()' and 'pte-execRequest.js:getQueryRequest()'
    }
}
```
For examples, see:

* [ccArgumentsGenerators/ccchecker/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/ccchecker/ccFunctions.js)
* [ccArgumentsGenerators/marblescc/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/marblescc/ccFunctions.js)
* [ccArgumentsGenerators/marblescc_priv/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/marblescc_priv/ccFunctions.js)
* [ccArgumentsGenerators/sbecc/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/sbecc/ccFunctions.js)

## Output
* **Statistical Output Message**

    The statistical output message includes PTE id, network id, channel name, org name, process id, transaction type, total transactions received and sent, elapsed time, starting time, ending time, and number of un-received events.

    For example, the following is the statistical output message for a test case with 4 processes.

        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:0 eventRegister] completed Rcvd(sent)=1000(1000) Invoke(Move) in 46199 ms, timestamp: start 1508185534030 end 1508185580229, #event timeout: 0
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:1 eventRegister] completed Rcvd(sent)=1000(1000) Invoke(Move) in 46266 ms, timestamp: start 1508185533969 end 1508185580235, #event timeout: 0
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:0 eventRegister] completed Rcvd(sent)=1000(1000) Invoke(Move) in 54232 ms, timestamp: start 1508185533962 end 1508185588194, #event timeout: 0
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:1 eventRegister] completed Rcvd(sent)=1000(1000) Invoke(Move) in 54613 ms, timestamp: start 1508185533985 end 1508185588598, #event timeout: 0

* **Completed Message**

    For each process, One message of `pte-exec:completed` is logged in PTE output upon the status of completion of each process. For each pte_driver.sh (each line in runCase.txt) execution, one message of `pte-main:completed` is logged in the PTE output upon completion of all associated pte_driver.sh.

    * **pte-main:completed** For each runCases.txt, a `pte-main:completed` message is logged in PTE output.

    * **pte-exec:completed** If PTE completed normally, then the message `pte-exec:completed` is logged.

    * **pte-exec:completed:timeout** If PTE completed but with any event timeout, then the message `pte-exec:completed:timeout` is logged.

    * **pte-exec:completed:error** If PTE exits due to any error, then the message `pte-exec:completed:error` is logged.





    For example, if pte_mgr.sh is executed with a mgr.txt contains:

        driver=pte CITest/FAB-3832-4i/samplecc/runCases-FAB-3832-4i1-TLS.txt

    and runCases-FAB-3832-4i1-TLS.txt contains

        sdk=node CITest/FAB-3832-4i/samplecc/samplecc-chan1-FAB-3832-4i-TLS.json

    and `samplecc-chan1-FAB-3832-4i-TLS.json` contains

        ...
        "nProcPerOrg": "2",
        ...
        "channelOpt": {
            ...
            "orgName": [
                "org1",
                "org2"
            ]
        },

    Then there will be 4 `pte-exec:completed` messages since there are 4 processes, 2 org and 2 processes per org. And there will be 1 `pte-main:completed` since 1 pte_driver.sh is executed (only one line of sdk=node in runCases.txt).  The completed message will be as follow:

        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:0 eventRegister] pte-exec:completed
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:1 eventRegister] pte-exec:completed
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:0 eventRegister] pte-exec:completed
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:1 eventRegister] pte-exec:completed
        info: [PTE 0 main]: [performance_main] pte-main:completed


    When the transmode is `CONSTANT`, the latency metrics for `proposal`, `transaction` and `event` of each process are provided.  Where

       * **proposal**: the time between the prosoal is sent to peers and the response is received.
       * **transaction**: the time between the transaction is sent to orderer and response is received.
       * **event**: the time between the event is registered, the transaction is sent to orderer, and the event is received.

    The output of the latency metrics include average, minimum, and maximum of all transactions for that process.  The following is an example of the output with two processes, one targets org1 and one targets org2 with 1000 transactions each:

        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:0 latency_output] peer latency stats: tx num= 1000, total time: 10240 ms, avg= 10.24 ms, min= 5 ms, max= 92 ms
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:0 latency_output] orderer latency stats: tx num= 1000, total time: 8735 ms, avg= 8.73 ms, min= 4 ms, max= 79 ms
        info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org1:0 latency_output] event latency stats: tx num= 1000, total time: 837918 ms, avg= 837.92 ms, min= 307 ms, max= 2130 ms

        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:0 latency_output] peer latency stats: tx num= 1000, total time: 9991 ms, avg= 9.99 ms, min= 5 ms, max= 111 ms
        info: [PTE 0 main]: stdout: info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:0 latency_output] orderer latency stats: tx num= 1000, total time: 9128 ms, avg= 9.13 ms, min= 4 ms, max= 126 ms
        info: [PTE 0 exec]: [Nid:chan:org:id=0:testorgschannel1:org2:0 latency_output] event latency stats: tx num= 1000, total time: 828433 ms, avg= 828.43 ms, min= 284 ms, max= 2195 ms


* **Test Summary Report**

    A test summary report file, namely pteReport.txt, is generated at the PTE directory after PTE execution.  The report contains overall tranasction TPS and latency statistics (min, max, avg) for endorsement, transaction acknowledgment, and end-to-end transaction events for each PTE execution, i.e., each runCases.txt. Below is an example of the report of executing PTE with 3 runCases.txt, involving chaincode sample_cc_ch1 on channel testorgschannel1, sample_cc_ch2, on channel testorgschannel2 and sample_cc_ch3 on channel testorgschannel2 respectively.  The report will be appended to the report file if it exists.



        ======= PTE 0 main Test Summary: executed at Wed May 02 2018 13:10:19 GMT-0400 (EDT) =======
        (testorgschannel1:sample_cc_ch1): INVOKE transaction stats
        (testorgschannel1:sample_cc_ch1):       Total transactions 200  timeout transactions 0
        (testorgschannel1:sample_cc_ch1):       start 1525281040506  end 1525281049585  duration 9079 ms
        (testorgschannel1:sample_cc_ch1):       TPS 22.03
        (testorgschannel1:sample_cc_ch1): peer latency stats (endorsement)
        (testorgschannel1:sample_cc_ch1):       total transactions: 200  total time: 4998 ms
        (testorgschannel1:sample_cc_ch1):       min: 8 ms  max: 98 ms  avg: 24.99 ms
        (testorgschannel1:sample_cc_ch1): orderer latency stats (transaction ack)
        (testorgschannel1:sample_cc_ch1):       total transactions: 200  total time: 12527 ms
        (testorgschannel1:sample_cc_ch1):       min: 14 ms  max: 174 ms  avg: 62.635 ms
        (testorgschannel1:sample_cc_ch1): event latency stats (end-to-end)
        (testorgschannel1:sample_cc_ch1):       total transactions: 200  total time: 66070 ms
        (testorgschannel1:sample_cc_ch1):       min: 76 ms  max: 674 ms  avg: 330.35 ms

        ======= PTE 1 main Test Summary: executed at Wed May 02 2018 13:10:19 GMT-0400 (EDT) =======
        (testorgschannel2:sample_cc_ch2): INVOKE transaction stats
        (testorgschannel2:sample_cc_ch2):       Total transactions 200  timeout transactions 0
        (testorgschannel2:sample_cc_ch2):       start 1525281040579  end 1525281049680  duration 9101 ms
        (testorgschannel2:sample_cc_ch2):       TPS 21.98
        (testorgschannel2:sample_cc_ch2): peer latency stats (endorsement)
        (testorgschannel2:sample_cc_ch2):       total transactions: 200  total time: 4905 ms
        (testorgschannel2:sample_cc_ch2):       min: 9 ms  max: 92 ms  avg: 24.525 ms
        (testorgschannel2:sample_cc_ch2): orderer latency stats (transaction ack)
        (testorgschannel2:sample_cc_ch2):       total transactions: 200  total time: 12534 ms
        (testorgschannel2:sample_cc_ch2):       min: 20 ms  max: 173 ms  avg: 62.67 ms
        (testorgschannel2:sample_cc_ch2): event latency stats (end-to-end)
        (testorgschannel2:sample_cc_ch2):       total transactions: 200  total time: 68286 ms
        (testorgschannel2:sample_cc_ch2):       min: 113 ms  max: 716 ms  avg: 341.43 ms

        ======= PTE 2 main Test Summary: executed at Wed May 02 2018 13:10:19 GMT-0400 (EDT) =======
        (testorgschannel3:sample_cc_ch3): INVOKE transaction stats
        (testorgschannel3:sample_cc_ch3):       Total transactions 200  timeout transactions 0
        (testorgschannel3:sample_cc_ch3):       start 1525281040539  end 1525281049696  duration 9157 ms
        (testorgschannel3:sample_cc_ch3):       TPS 21.84
        (testorgschannel3:sample_cc_ch3): peer latency stats (endorsement)
        (testorgschannel3:sample_cc_ch3):       total transactions: 200  total time: 5222 ms
        (testorgschannel3:sample_cc_ch3):       min: 8 ms  max: 102 ms  avg: 26.11 ms
        (testorgschannel3:sample_cc_ch3): orderer latency stats (transaction ack)
        (testorgschannel3:sample_cc_ch3):       total transactions: 200  total time: 12424 ms
        (testorgschannel3:sample_cc_ch3):       min: 13 ms  max: 175 ms  avg: 62.12 ms
        (testorgschannel3:sample_cc_ch3): event latency stats (end-to-end)
        (testorgschannel3:sample_cc_ch3):       total transactions: 200  total time: 72844 ms
        (testorgschannel3:sample_cc_ch3):       min: 92 ms  max: 736 ms  avg: 364.22 ms


## Reference

### User Input file

The user input file contains configuration parameters including chaincode definition, transaction configuration, and channel information.  Two structure options are provided:

* contain all configuration parameters in one file as identified in the testcase runCases.txt files
* split into three files: main input file, transaction configuration file, and chaincode definition file.

##### All in One User Input File

    {
        "channelID": "_ch1",
        "chaincodeID": "sample_cc",
        "chaincodeVer": "v0",
        "logLevel": "ERROR",
        "invokeCheck": "TRUE",
        "transMode": "Constant",
        "transType": "Invoke",
        "invokeType": "Move",
        "targetPeers": "RoundRobin",
        "peerFailover": "TRUE",
        "ordererFailover": "TRUE",
        "nProcPerOrg": "4",
        "nRequest": "0",
        "runDur": "600",
        "TLS": "clientauth",
        "queryBlockOpt": {
            "org1":  ["peer0org1examplecom"],
            "startBlock":  "6590",
            "endBlock":  "6800"
        },
        "channelOpt": {
            "name": "testchannel1",
            "channelTX": "github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "org1"
            ]
        },
        "constantOpt": {
            "constFreq": "1000",
            "devFreq": "300"
        },
        "listOpt": {
            "org1": ["peer1"],
            "org2": ["peer1"]
        },
        "discoveryOpt": {
            "localHost": "true",
            "collection": ["myCollectionName"],
            "initFreq": "300000"
        },
        "eventOpt": {
            "type": "FilteredBlock",
            "timeout": "240000"
        },
        "failoverOpt": {
            "method": "RoundRobin",
            "list": "targetPeers"
        },
        "invokeCheckOpt": {
            "peers": "OrgAnchor",
            "transactions": "LAST",
            "txNum": "10"
        },
        "ordererOpt": {
            "method": "UserDefined",
            "nOrderers": "3",
        },
        "snapshot": {
            "enabled":  true,
            "height":  [100000, 200000, 300000],
            "channelID":  "testchannel1",
            "peerName":  "peer0-org1",
            "queryFreq":  "10000"
        },
        "timeoutOpt": {
            "preConfig": "200000",
            "request": "45000",
            "grpcTimeout": "3000"
        },
        "ccType": "general",
        "ccOpt": {
            "keyIdx": [1],
            "keyPayLoad": [2, 3, 4, 6],
            "keyPayLoadType": ["Random", "FixedInt", "Fixed", "RandomInt"],
            "keyPayLoadMin": [128, 32, 256, 0],
            "keyPayLoadMax": [512, 64, 512, 12],
            "keyStart": "5000",
            "payLoadType": "Random",
            "payLoadMin": "1024",
            "payLoadMax": "2048"
        },
        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/fabric-sdk-node/test/fixtures/src/github.com/sample_cc",
            "fcn": "init",
            "language": "golang"
            "args": []
        },
        "invoke": {
            "query": {
                "fcn": "invoke",
                "args": ["get", "a"]
            },
            "move": {
                "fcn": "invoke",
                "args": ["put", "a", "string-msg"]
            }
        },
        "ConnProfilePath": "ConnProfiles/test-network"
    }


##### Three User Input Files

####### Main Input File

    {
        "txCfgPtr": "sampleccInputs/txCfgOpt.json",
        "ccDfnPtr": "sampleccInputs/ccDfnOpt.json",
        "channelID": "_ch1",
        "chaincodeID": "sample_cc",
        "chaincodeVer": "v0",
        "channelOpt": {
            "name": "testchannel1",
            "channelTX": "github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "org1"
            ]
        },
        "ConnProfilePath": "ConnProfiles/test-network"
    }


where

* **txCfgPtr**: the transaction configuration input file, supported file type: json and yaml, see PTE/sampleccInputs for example of both file types
* **ccDfnPtr**: the chaincode definition input file, supported file type: json and yaml, see PTE/sampleccInputs for example of both file types
* The supported file type of this Main Input File: json and yaml.


####### Transaction configuration File

    {
        "logLevel": "ERROR",
        "invokeCheck": "TRUE",
        "transMode": "Constant",
        "transType": "Invoke",
        "invokeType": "Move",
        "targetPeers": "OrgAnchor",
        "peerFailover": "TRUE",
        "ordererFailover": "TRUE",
        "nProcPerOrg": "4",
        "nRequest": "0",
        "runDur": "600",
        "TLS": "serverauth",
        "queryBlockOpt": {
            "org1":  ["peer0org1examplecom"],
            "startBlock":  "6590",
            "endBlock":  "6800"
        },
        "constantOpt": {
            "constFreq": "1000",
            "devFreq": "300"
        },
        "listOpt": {
            "org1": ["peer1"],
            "org2": ["peer1"]
        },
        "eventOpt": {
            "type": "FilteredBlock",
            "timeout": "240000"
        },
        "failoverOpt": {
            "method": "RoundRobin",
            "list": "targetPeers"
        },
        "invokeCheckOpt": {
            "peers": "OrgAnchor",
            "transactions": "LAST",
            "txNum": "10"
        },
        "ordererOpt": {
            "method": "RoundRobin",
            "nOrderers": "0"
        },
        "timeoutOpt": {
            "preConfig": "200000",
            "request": "45000",
            "grpcTimeout": "3000"
        }
    }

####### Chaincode Definition File

    {
        "ccType": "general",
        "ccOpt": {
            "keyIdx": [1],
            "keyPayLoad": [2],
            "keyPayLoadType": ["Random"],
            "keyPayLoadMin": [128],
            "keyPayLoadMax": [512],
            "keyStart": "5000",
            "payLoadType": "Random",
            "payLoadMin": "1024",
            "payLoadMax": "2048"
        },
        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/fabric-sdk-node/test/fixtures/src/github.com/sample_cc",
            "fcn": "init",
            "language": "golang"
            "args": []
        },
        "invoke": {
            "query": {
                "fcn": "invoke",
                "args": ["get", "a"]
            },
            "move": {
                "fcn": "invoke",
                "args": ["put", "a", "string-msg"]
            }
        }
    }


where:

* **channelID**: channel ID for the run.
* **chaincodeID**: chaincode ID for the run.
* **chaincodeVer**: chaincode version.
* **logLevel**: logging level for the run. Options are ERROR, DEBUG, or INFO.  Set to ERROR for performance test. The default value is ERROR.
* **invokeCheck**: if this is `TRUE`, then queries will be executed for validation based on the setting of `invokeCheckOpt` once the event of all invokes are received. This value is ignored for query test.  Default: `FALSE`
* **transMode**: transaction mode (applicable for each thread). Note: the per-thread transaction send rates for all modes have an upper bound. For example, if it typically takes 5 ms to get ack responses for sending transactions to peers in your network, then that limits your max effective rate to be 200 tps - such as when you use transMode = Constant with constantOpt.constFreq = any value between 1 - 5 ms. The host hardware cpu and memory resources may also impose limitations, especially when your test uses higher numbers of simultaneous connections and threads competing for those resources. (See *Notes on Statistical Distributions* for more info.)
    * **Constant**: the transactions are sent by the specified rate, see constantOpt for details
    * **Poisson**: the transactions are sent according to a Poisson distribution, see poissonOpt for details
    * **Latency**: one transaction type and rate only, the subsequent transaction is sent when the event message (ledger update is completed) of the previous transaction is received
* **transType**: transaction type
    * **Channel**: channel activities specified in channelOpt.action
    * **Install**: install chaincode
    * **Instantiate**: instantiate chaincode
    * **Upgrade**: upgrade chaincode
    * **QueryBlock**: query blockchain information
    * **Invoke**: invokes transaction
    * **Discovery**: service discovery initialization
* **peerFailover**: if this parameter is set to `TRUE` and if the transaction cannot be delivered to the targeted peer, then PTE will send the transaction to the next peer in the peer list, and so on.  The peer list consists of all peers in the configuration json.
* **ordererFailover**: if this parameter is set to `TRUE` and if the transaction cannot be delivered to the targeted orderer, then PTE will send the transaction to the next orderer in the orderer list, and so on.  The orderer list consists of all orderers in the configuration json.
* **invokeType**: invoke transaction type. This parameter is valid only if the transType is set to invoke
    * **Move**: move transaction
    * **Query**: query transaction
* **targetPeers**: the target peers that transactions will sent to
    * **OrgAnchor**: send to the anchor peer (peer1) of the organization being executed in the current process
    * **AllAnchors**: send to the anchor peers of all organizations
    * **OrgPeers**: send to all peers in the organization being executed in the current process
    * **AllPeers**: send to all peers in all organizations from all connection profiles
    * **List**: only send to the peers given in listOpt, see listOpt below for details
    * **Disovery**: use service discovery to determine the target peers, see discoveryOpt below for details
    * **RoundRobin**: a peer from the org section of Service Credentials File is assigned to each thread in the round robin fashion
* **nProcPerOrg**: number of processes for the test
* **nRequest**: number of transactions to be executed for each process
* **runDur**: run duration in seconds to be executed  for each process.
    * if nRequest is non-zero the nRequest is executed.
    * if nRequest is zero and runDur is non-zero, then runDur is executed.
    * if both nRequest and runDur are zero, then PTE runs forever.
* **TLS**: TLS setting for the test
    * disabled: TLS is disabled
    * serverauth: server authentication, TLS
    * clientauth: client authentication, mutual TLS
* **queryBlock**: query blockchain information options
    * **org**: the org to be queried and the peer in the org
    * **startBlock**: the starting block
    * **endBlock**: the ending block. If the the ending block is greater than the chain height in the peer, eBlock will be set to the chain height.
* **channelOpt**: transType channel options
    * **name**: channel name
    * **channelTX**: channel transaction file. If the `gopath` is defined in the service credential json, then the path is relative to `gopath/src`. Otherwise, absolute path is required.
    * **action**: channel action: create or join
    * **orgName**: name of organization for the test
* **constantOpt**: the transactions are sent at the specified rate. This parameter is valid only if the transMode is set to **Constant**.
    * **constFreq**: frequency in ms for the transaction rate.
    * **devFreq**: deviation of frequency in ms for the transaction rate. A random frequency is calculated between `constFrq-devFreq` and `constFrq+devFreq` for the next transaction.  The value is set to default value, 0, if this value is not set in the user input json file.  All transactions are sent at constant rate if this number is set to 0.
* **poissonOpt**: the transactions are sent according to a Poisson distribution. This parameter is valid only if the transMode is set to **Poisson**.
    * **lambda**: average transaction rate in an interval, in seconds. This can be an integer or a fraction.
* **listOpt**: targetPeers list of the peers that the transactions are sent. These parameters are valid only when the targetPeers is set to List. Each line includes two parameters: **org name** and **peer array within the org**, for example:

             "listOpt": {
                 "org1": ["peer1","peer2"],
                 "org3": ["peer1"],
                 "org6": ["peer3"]
             }
* **discoveryOpt**: service discovery option. The option is valid only when targetPeer is set to `Discovery`.
    * **localHost**: set to `true` when fabric is running in containers and executing PTE from not in a container, else set to `false`. For CI automation tests or other tests on single host using docker, when sending invokes or queries, set `localHost=true` and set `targetPeers=discovery`. Default value is false.
    * **collection**: an array of collection names for the discovery service to calculate the plan layout for invokes. This should match the name that is specified in the private-data collection file during the instantiation. If this attribute is missing, then only chaincode is used for plan layout calculation. This is useful for sending private-data queries or invokes to only the peers included in a private-data collection; without it, for example, a service-discovery query for private-data might be sent by SDK to a peer that is not in the collection but is still in the channel, and thus the query would fail. (This field is irrelevant for orderers.)
    * **initFreq**: service discovery re-initialization frequency in ms. PTE will not re-initialize service discovery if this parameter is set to 0. Default: 0.
* **eventOpt**: event options
    * **type**: event service type, default: FilteredBlock
        * **FilteredBlock**: efficient option, delivers filtered events per channel for each block or transaction
        * **Channel**: basic option, delivers full events per channel for each block or transaction
    * **timeout**: event timeout, unit ms, default: 120000 ms
* **failoverOpt**: peer failover options
    * **method**: peer failover selection method, default is `RoundRobin`
         * **random**: a peer is selected randomly from the list for failover
         * **RoundRobin**: the peer listed next to the current peer is selected for failover
    * **list**: peer failover candidate list, default is `targetPeers`
         * **targetPeers**: the peer candidate list is the same as the peers specified in the `targetPeers`
         * **all**: the peer candidate list is made of all peers listed in the associated service confidential file
* **invokeCheckOpt**: invokeCheck configuration, valid only if **invokeCheck** is `TRUE`. Note that the validation queries results are written in the PTE log which may take a large amount of space with large requested validation queries.
    * **peers**: The peers that the validation queries to be sent.  Available options are the same as those of `targetPeers` listed above. Default: same as `targetPeers`.
    * **transactions**: The transactions for invokes validation. Default: LAST.
         * **ALL**: all transactions.
         * **LAST**: last `txNum` transactions.
    * **txNum**: last txNum transactions to be validated. Valid only if **transactions** is `LAST`. Defailt: 1.
* **ordererOpt**: transaction orderer options
    * **method**: orderer selection method, default: `UserDefined`. Note a Service Credentials File must contain exact orderers to be used for a channel.
         * **UserDefined**: the orderer defined in the `ordererID` in the Service Credentials File for each org is used for invoke transactions. Note this is the same orderer used for all admin transactions.
         * **RoundRobin**: an orderer from the orderer section of Service Credentials File is assigned to each thread in the round robin fashion
    * **nOrderers**: the number of orderers to participate in the transactions, if this number is greater than the number of orderers listed in the service credential json, then all orderers will participate in the transactions.  If this number is set to 0, then all orderers participate in the transactions. Default: 0.
* **snapshot**: PTE will spawn off an additional process to poll the blockheight of the specified peer periodically.  Once the specified blockheight is reached or exceeded, PTE will stop all invoke transaction processes.
    * **enabled**: snapshot enabled: true or false
    * **height**: an array of blockheights
    * **channelID**: the channel ID
    * **peerName**: the peer to poll blockheight
    * **queryFreq**: blockheight polling frequency, unit: ms. Default: 10,000 ms
* **timeoutOpt**: timeout configuration
    * **preConfig**: The timeout for channel creation and join and chaincode installation and instantiation. Unit: ms. Default:200,000.
    * **request**: The timeout for proposal and transaction. Unit: ms. Default:45,000.
    * **grpcTimeout**: The timeout for grpc that to be used for any transactions using grpc connection. Unit: ms. Default:3,000.
* **ccType**: chaincode type
    * **ccchecker**: The first argument (key) in the query and invoke request is incremented by 1 for every transaction.  The prefix of the key is made of process ID, ex, all keys issued from process 4 will have prefix of **key3_**. And, the second argument (payload) in an invoke (Move) is a random string of size ranging between payLoadMin and payLoadMax defined in ccOpt.
    * **general**: The arguments from user input file will be modified for each transaction according to the parameters **keyPayLoadType**, **keyPayLoadMin**, and **keyPayLoadMax**.
* **ccOpt**: chaincode options, see `ccOpt` and `invoke.query` and `invoke.move` in `marblesccInputs/marblescc-chan1-constant-i-TLS.json` as an example on how to **keyIdx** and **keyPayLoad** below.
    * **keyIdx**: a list of indexes of transaction argument used as keys
    * **keyPayLoad**: a list of indexes of transaction argument used as payload
    * **keyPayLoadType**: a list of payload type for each entry of the arguments given in **keyPayLoad**, corresponding to each entry of **keyPayLoad**, used with ccType **general**
        * **Fixed**: a fixed string with a random length between keyPayLoadMin and kayPayLoadMax
        * **Random**: a random string with a random length between kayPayLoadMin and kayPayLoadMax
        * **FixedInt**: a fixed random integer between kayPayLoadMin and kayPayLoadMax
        * **RandomInt**: a random integer between kayPayLoadMin and kayPayLoadMax
    * **keyPayLoadMin**: a list of minimum size in bytes or integer of the payload, corresponding to each entry of **keyPayLoad** defined above, used with ccType **general**
    * **keyPayLoadMax**: a list of maximum size in bytes or integer of the payload, corresponding to each entry of **keyPayLoad** defined above, used with ccType **general**
    * **keyStart**: the starting transaction key index, this is used when the ccType is non general which requires a unique key for each invoke.
    * **payLoadType**: payload type of the transactions that ccType is not **general**
        * **Fixed**: fixed payload with the size of payLoadMin for every trandsaction
        * **Random**: random payload with a random size between payLoadMin and payLoadMax for every transaction
    * **payLoadMin**: minimum size in bytes of the payload
    * **payLoadMax**: maximum size in bytes of the payload
* **deploy**: deploy transaction contents
    * **chaincodePath**: this path is relative to `gopath/src` if the `gopath` is defined in the service credential json. Otherwise, absolute path is required.
    * **language**: the chaincode language including:
        * **golang**: golang chaincode, this is the default language
        * **node**: Node JS chaincode
        * **java**: java chaincode
* **invoke** invoke transaction contents
    * **query**: query content
    * **move**: move content
* **ConnProfilePath**: path to the connection profiles, all connection profiles listed in this directory will be used by PTE. supported file type: json and yaml, see PTE/ConnProfiles/test-network/config.yaml for example


### Notes on Statistical Distributions
PTE can be extended to support transaction generation according to a particular statistical distribution, or even a custom schedule. Two distributions have currently been implemented:

* Uniform Distribution: see `transMode` *Constant*
* Poisson Distribution: see `transMode` *Poisson*

To generate and configure transaction events according to a different distribution, you need to update `pte-execRequest.js` as follows:

* Define a new `transMode` (e.g., *Poisson* for a Poisson distribution)
* Define a JSON structure for parameters (e.g., `poissonOpt` for *Poisson*; see previous section)
* Add code to the function `execTransMode()` to handle this new distribution (example for *Poisson* below):


        } else if (transMode == 'POISSON') {
            distOpt = txCfgPtr.poissonOpt;
            execModePoisson();
        } ...


* Create a function to call `execModeDistribution(backoffCalculator, delayCalculator)` with the right parameter values (e.g., `execModePoisson` for *Poisson* below):

        function execModePoisson() {
            execModeDistribution(backoffCalculatorPoisson);
        }


* Create a function to dynamically calculate the backoff (in milliseconds) to the next transaction. The parameter `backoffCalculator` above represents the handle to this function. (e.g., `backoffCalculatorPoisson()` for *Poisson* as below):

        function backoffCalculatorPoisson() {
            var lambda = parseFloat(txCfgPtr.poissonOpt.lambda);
            return -1000 * Math.log(1 - Math.random()) / lambda;
        }

* Optionally, create a separate function to support secondary deviations from the main event distribution. The *Constant* (or uniform) distribution supports this using the `devFreq` parameter.
    * Example: for *Constant* distribution, we have two functions, `backoffCalculatorConstantFreq()` to compute uniform-value backoffs, and `backoffCalculatorConstant()` to compute uniform-value backoffs with small random deviations in every iteration.
    * Here, the parameters supplied to `execModeDistribution` are as follows:

            execModeDistribution(backoffCalculatorConstant, backoffCalculatorConstantFreq);

        In the function `execModeDistribution`, the `backoffCalculator` parameter represents the backoff calculator with secondary deviations, whereas the `delayCalculator` parameter represents the backoff calculator according to the base statistical distribution.

For example input files to run Poisson-based traffic, see:

* `sampleccInputs/runCases-poisson-i1-TLS.txt`
* `sampleccInputs/runCases-poisson-q1-TLS.txt`
* `sampleccInputs/samplecc-chan1-poisson-i-TLS.json`
* `sampleccInputs/samplecc-chan1-poisson-q-TLS.json`
* `sampleccInputs/txCfgOpt-poisson.json`


## Connection Profile
The connection profile contains the information of the network and are stored in subdirectories of `PTE/ConnProfiles`. The following is a sample of the connection profile yaml file:


    ---
    version: 1.0
    name: My network
    description: Connection Profile for a Blockchain Network
    gopath: GOPATH

    # client
    client:
      organization: org1
      connection:
        timeout:
          peer:
            endorser: 300
            eventHub: 600
            eventReg: 300
          orderer: 300

    # channels
    channels:
      testorgschannel1:
        orderers:
          orderer0
          orderer1
          orderer2
        peers:
          peer0org1examplecom:
          peer1org1examplecom:
          peer0org2examplecom:
          peer1org2examplecom:
        chaincodes: []

    # organizations
    organizations:
      org1:
        name: PeerOrg1
        mspid: PeerOrg1
        peers:
        - peer0org1examplecom
        - peer1org1examplecom
        certificateAuthorities:
        - ca0
        adminPrivateKey:
          path: src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
        signedCert:
          path: src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
        ordererID: orderer0

    # orderers
    orderers:
      orderer0:
        mspid: OrdererOrg
        url: grpcs://localhost:5005
        grpcOptions:
          ssl-target-name-override: orderer0.example.com
        tlsCACerts:
          path: src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
        adminPath: src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/ordererOrganizations/example.com/users/Admin@example.com/msp

    # peers
    peers:
      peer0org1examplecom:
        url: grpcs://localhost:7061
        grpcOptions:
          ssl-target-name-override: peer0.org1.example.com
        tlsCACerts:
          path: src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem

      peer1org1examplecom:
        url: grpcs://localhost:7062
        grpcOptions:
          ssl-target-name-override: peer1.org1.example.com
        tlsCACerts:
          path: src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem

    # certificateAuthorities
    certificateAuthorities:
      ca0:
        url: https://localhost:7054
        caName: ca0
        tlsCACerts:
          path: ../../fabric/internal/cryptogen/crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem
        httpOptions:
          verify: false
        registrar:
          enrollId: admin
          enrollSecret: adminpw



Note that

1. Key **gopath** is the GOPATH used by PTE. Set to `GOPATH` to use the environment variable `GOPATH`.

2. Key **ordererID** is the orderer that the org will communicate.  This orderer will be used for transactions only if the ordererOpt method is **UserDefined**, see ordererOpt in the User Input file for detail usage. If this key is absent, then the first orderer in the orderer group is used.

3. User can opt to use the same `tls_cert` for all orderers and peers by setting `tls_cert` at the same level as the **orderer**.  If the `tls_cert` is set, then the file defined in `tls_cacerts` is ignored. This can simplify the setting of tls_cert for a network with large number of peers and orderers.

4. User can opt to include `admin_cert` in the json by setting `admin_cert` within each **org** section.  If the `admin_cert` is set, then the files specified in `adminPath` are ignored.  This allows the certificate to be included in the config json file rather than copy it in multiple locations.

5. Keys **adminPrivateKey, signedCert, and tls_cacerts** for orderer or org can be either the path to the key by using subkey `path` or the pem content of the key by using subkey `pem`:

    * path: `<path>`
    * pem: `-----BEGIN PRIVATE KEY----- <etc>`


## Creating a local Fabric network
Prerequisite: If you do not yet have the Fabric docker images in your local docker registry, please either build them from Fabric source or download them from dockerhub.
Create a local netork using the [NetworkLauncher](https://github.com/hyperledger/fabric-test/tree/main/tools/NL) tool:
    - `cd $GOPATH/src/github.com/hyperledger/`
    - `git clone https://github.com/hyperledger/fabric-test`
    - `cd tools/NL`
    - `./networkLauncher.sh -?`

## CI Test
A set of predefined tests are designed for CI daily or weekly execution and are available in the directory, [CITest](https://github.com/hyperledger/fabric-test/tree/main/tools/PTE/CITest), under PTE.


## Remote PTE
This feature allows user to execute PTE (PTE manager and/or driver) to send transactions from remote hosts to Blockchain networks, see diagram below.

![](PTE-ctlr.png)


In order to execute PTE remotely, the PTE controller host will need to have access to the remote PTE hosts.  **In the setup below, ssh auto login without password is illustrated. However, users should choose any preferred remote access method between PTE controller host and remote PTE hosts for their environment.**

* ### Usage
    `./pte_ctlr.sh <PTE controller file>`

    * Example

        `./pte_ctlr.sh ctlrInputs/PTECtlr.txt`

        `ctlrInputs/PTECtlr.txt` contains the list of testcases to be executed on the remote hosts. Each line is a PTE controller case and inlcude three parameters: driver type, user/host, and a script.  The available driver type is `ctlr` only.

        For instance, this sample PTE controller file conatins two control testcases:

            driver=ctlr pteuser@remotePTEhost.com ctlrInputs/remotePTEhost-samplecc-q.sh
            driver=ctlr pteuser@remotePTEhost.com ctlrInputs/remotePTEhost-samplecc-i.sh


* ### Setup
   * On the local host where the PTE controller resides
       * setup ssh auto login to remote systems without password. Note that users may choose a preferred method for remote access.
       * a PTECtlr.txt file containing the controller testcases, e.g., `PTE/ctlrInputs/PTECtlr.txt`
       * all controller testcases files, e.g., `PTE/ctlrInputs/pteHost11-samplecc-q.sh`
   * On the remote host where the PTE manager/driver resides
       * setup PTE
       * contains crypto keys of the Blockchain network
       * a script to execute PTE, e.g., `PTE/CITest/scripts/test_driver_remote.sh`, Users can create scripts for their testcases.
   * Blockchain network
       * can be a single host or multi hosts network

* ### Setup ssh auto login without password
   **Note that ssh is just one method for the PTE controller host to access remote PTE.  Users should choose a method suitable for their environment.**

   * On PTE controller host (assuming the remote access is pteuser@remotePTEhost.com):
       * `ssh-keygen -t rsa` (You can just hit return for each question.)
       * `ssh pteuser@remotePTEhost.com mkdir -p .ssh`

            pteuser@remotePTEhost.com's password:
       * `cat .ssh/id_rsa.pub | ssh pteuser@remotePTEhost.com 'cat >> .ssh/authorized_keys'`

            pteuser@remotePTEhost.com's password:


---

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
