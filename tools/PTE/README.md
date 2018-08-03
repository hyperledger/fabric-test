
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
    - [Service Credentials File](#service-credentials-file)
    - [Creating a Local Fabric Network](#creating-a-local-fabric-network)
    - [CI Test](#ci-test)
    - [Remote PTE](#remote-pte)

---
### Code Base for v1.1.0
- Fabric commit level: dce23777837545f2c63b75e5a26786131bf05132
- fabric-sdk-node commit level: 34731570af3645a235e50e4023212d35b1da1429
- fabric-ca commit level: 71974f53ab08fd8765b0016d76ad2cff71e5b668
- fabric-test commit level: 2f355b12251e4b87ca6ccd8c17e570a7bdec8a12

### Code Base for v1.0.0
- Fabric commit level: e4b47043270f2293daabf7d24984dd46901e04e7
- fabric-sdk-node commit level: 974bafcb1059c4cb8dda54a9e9d0afc6d87854c5
- fabric-ca commit level: 74f8f4d4c29e45a79a8849efb057dbd8de3ae8d0
- fabric-test commit level: 359dbfb39f507a737ad52129ac0e4fac9cc03c0b


### Future items

- Endorsement policy is not supported yet.
- Replace fabric-sdk-node with fabric-client and fabric-ca-client.



## Prerequisites
To build and test the following prerequisites must be installed first:

- node and npm
    - `node`: >=`v8.9.4` AND <`v9.0`
    - `npm`: >=`v5.6.0` AND <`v6.0`
- gulp command
    - `npm install -g gulp`
- go (v1.7 or later)
    - refer to [Go - Getting Started](https://golang.org/doc/install)
- others:
    - in Ubuntu: `apt install -y build-essential python libltdl-dev`
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
         - `git submodule foreach git pull origin master`
    - else:
         - `git submodule foreach git pull origin master`

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

4. Install PTE
    - Stable (with latest fabric sdk)
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `npm install fabric-client`
        - `npm install fabric-ca-client`
    - Stable (with specific version of fabric sdk)
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `npm install fabric-client@version`, for example to install version `1.0.2`, `npm install fabric-client@1.0.2`
        - `npm install fabric-ca-client@version`, for example to install version `1.0.2`, `npm install fabric-ca-client@1.0.2`
    - Unstable (with development version of fabric sdk)
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `npm install`
    or
        - `cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE`
        - `npm install fabric-client@unstable`
        - `npm install fabric-ca-client@unstable`


Once installed, the following steps are required.
1. Create Service Credentials file(s) for your Fabric network:
    - See the examples in `SCFiles` and change the address to your own Fabric addresses and credentials. Add a block for each organization and peer, ensuring correctness.

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
            "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
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
            "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "testOrg1"
            ]
        },


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
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
                "action":  "create",
                "orgName": [
                    "testOrg1"
                ]
            },

    * ### Join a channel
        To join all peers in an org to a channel, set the action in channelOpt to `join`, set name to channel name, and set orgName to the list of orgs to join:

            "channelOpt": {
                "name": "testchannel1",
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
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
            "chaincodePath": "github.com/hyperledger/fabric-test/fabric/examples/chaincode/go/marbles02",
            "metadataPath": "github.com/hyperledger/fabric-test/fabric/examples/chaincode/go/marbles02/META-INF",
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
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
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
                "channelTX": "/root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
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
                "org":  "org1",
                "peer":  "peer1",
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

* **marbles_cc**: [Marbles02 chaincode](https://github.com/hyperledger/fabric-test/fabric/examples/chaincode/go/marbles02). PTE alters the marble name (the first argument) and the marble size (the third argument) for each `initMarble` transaction. Specify `ccType` as `marblescc` when using this chaincode.  See directory `marblesccInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/fabric/examples/chaincode/go/marbles02`.  Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/fabric/examples/chaincode/go/marbles02",
            "fcn": "init",
            "args": []
        },

* **marblescc_priv**: [Marbles02 private chaincode](https://github.com/hyperledger/fabric-test/fabric-samples/chaincode/marbles02_private/go). PTE alters the marble name (the first argument) and the marble size (the third argument) for each `initMarble` transaction. Specify `ccType` as `marblescc_priv` when using this chaincode.  See directory `marblescc_privInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/fabric-samples/chaincode/marbles02_private/go`.  Set the deploy.chaincodePath to this directory in the user input file.  This chaincode can be used for side DB if user specifies collection configuration json in the `collectionsConfigPath` when instantiate the chaincode.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/fabric-samples/chaincode/marbles02_private/go",
            "collectionsConfigPath": "github.com/hyperledger/fabric-test/tools/PTE/marblescc_privInputs/collections_config-chan1.json",
            "fcn": "init",
            "args": []
        },

* **sample_js**: This is the Node JS chaincode of sample_cc. See directory `samplejsInputs` for examples related to this chaincode. This chaincode is available in `$GOPATH/src/github.com/hyperledger/fabric-test/chaincodes/samplecc/node`.  Set the deploy.chaincodePath to this directory in the user input file.

        "deploy": {
            "chaincodePath": "github.com/hyperledger/fabric-test/chaincodes/samplecc/node",
            "fcn": "init",
            "language": "node",
            "args": []
        },



## Transaction Payload Generation
You can write logic to generate transaction (invoke or query) arguments that is specific to a chaincode type (or `ccType` in your chaincode definition JSON file.)

The logic for `<ccType>` should be specified in `ccArgumentsGenerators/<ccType>/ccFunctions.js`, in a class named `ccFunctions` that inherits the `ccFunctionsBase` class defined in `ccArgumentsGenerators/ccFunctionsBase.js`.

(The following `ccType` values are supported by default: {`ccchecker`, `marblescc`, `marblescc_priv`}. If you want to run PTE on a custom `ccType`, create an appropriate folder and JS file.)

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
		return 0;	// RETURN APPROPRIATE INTEGER VALUE

		// THIS VALUE WILL BE USED IN 'pte-execRequest.js:execModeLatency()'
	}

	getExecModeSimpleFreq() {
		return 0;	// RETURN APPROPRIATE INTEGER VALUE

		// THIS VALUE WILL BE USED IN 'pte-execRequest.js:execModeSimple()'
	}

	getExecModeProposalFreq() {
		return 0;	// RETURN APPROPRIATE INTEGER VALUE

		// THIS VALUE WILL BE USED IN 'pte-execRequest.js:execModeProposal()'
	}
}
```
For examples, see:
* [ccArgumentsGenerators/ccchecker/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/ccchecker/ccFunctions.js)
* [ccArgumentsGenerators/marblescc/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/marblescc/ccFunctions.js)
* [ccArgumentsGenerators/marblescc_priv/ccFunctions.js](https://github.com/hyperledger/fabric-test/tools/PTE/ccArgumentsGenerators/marblescc_priv/ccFunctions.js)


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
        "targetPeers": "OrgAnchor",
        "peerFailover": "TRUE",
        "ordererFailover": "TRUE",
        "nProcPerOrg": "4",
        "nRequest": "0",
        "runDur": "600",
        "TLS": "clientauth",
        "queryBlockOpt": {
            "org":  "org1",
            "peer":  "peer1",
            "startBlock":  "6590",
            "endBlock":  "6800"
        },
        "channelOpt": {
            "name": "testchannel1",
            "channelTX": "github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "org1"
            ]
        },
        "burstOpt": {
            "burstFreq": ["500", "200", "300", "100"],
            "burstDur":  ["3000", "2000", "3000", "1000"]
        },
        "mixOpt": {
            "mixquery": "false",
            "mixFreq": "2000"
        },
        "constantOpt": {
            "recHIST": "HIST",
            "constFreq": "1000",
            "devFreq": "300"
        },
        "listOpt": {
            "org1": ["peer1"],
            "org2": ["peer1"]
        },
        "discoveryOpt": {
            "localHost": "true",
            "initFreq": "300000"
        },
        "eventOpt": {
            "type": "FilteredBlock",
            "listener": "Block",
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
        "timeoutOpt": {
            "preConfig": "200000",
            "request": "45000",
            "grpcTimeout": "3000"
        },
        "ccType": "general",
        "ccOpt": {
            "keyIdx": [1],
            "keyPayLoad": [2],
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
        "SCFile": [
            {"ServiceCredentials":"SCFiles/config-chan1-TLS.json"}
        ]
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
            "channelTX": "github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/testorgschannel1.tx",
            "action":  "create",
            "orgName": [
                "org1"
            ]
        },
        "SCFile": [
            {"ServiceCredentials":"SCFiles/config-chan1-TLS.json"}
        ]
    }


where

* **txCfgPtr**: the transaction configuration input file
* **ccDfnPtr**: the chaincode definition input file


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
            "org":  "org1",
            "peer":  "peer1",
            "startBlock":  "6590",
            "endBlock":  "6800"
        },
        "burstOpt": {
            "burstFreq": ["500", "200", "300", "100"],
            "burstDur":  ["3000", "2000", "3000", "1000"]
        },
        "mixOpt": {
            "mixquery": "false",
            "mixFreq": "2000"
        },
        "constantOpt": {
            "recHIST": "HIST",
            "constFreq": "1000",
            "devFreq": "300"
        },
        "listOpt": {
            "org1": ["peer1"],
            "org2": ["peer1"]
        },
        "eventOpt": {
            "type": "FilteredBlock",
            "listener": "Block",
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
* **transMode**: transaction mode (applicable for each thread). Note: the per-thread transaction send rates for all modes have an upper bound. For example, if it typically takes 5 ms to get ack responses for sending transactions to peers in your network, then that limits your max effective rate to be 200 tps - such as when you use transMode = Constant with constantOpt.constFreq = any value between 1 - 5 ms. The host hardware cpu and memory resources may also impose limitations, especially when your test uses higher numbers of simultaneous connections and threads competing for those resources.
    * **Simple**: one transaction type and rate only, the subsequent transaction is sent when the response of sending transaction (not the event handler), success or failure, of the previous transaction received
    * **Burst**: various traffic rates, see burstOpt for detailed
    * **Mix**: mix invoke and query transactions, see mixOpt for detailed
    * **Constant**: the transactions are sent by the specified rate, see constantOpt for detailed
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
    * **AllPeers**: send to all peers in all organizations
    * **List**: only send to the peers given in listOpt, see listOpt below for details
    * **Disovery**: use service discovery to determine the target peers, see discoveryOpt below for details
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
    * **org**: the org to be queried
    * **peer**: the peer to be queried
    * **startBlock**: the starting block
    * **endBlock**: the ending block. If the the ending block is greater than the chain height in the peer, eBlock will be set to the chain height.
* **channelOpt**: transType channel options
    * **name**: channel name
    * **channelTX**: channel transaction file. If the `gopath` is defined in the service credential json, then the path is relative to `gopath/src`. Otherwise, absolute path is required.
    * **action**: channel action: create or join
    * **orgName**: name of organization for the test
* **burstOpt**: the frequencies and durations for Burst transaction mode traffic. Each PTE thread will issue transactions at the specified frequency for the corresponding duration for each interval. It will cycle through all intervals, repeating the cycles as necessary until the test completes (as specified by nRequest or runDur). The first burstFreq corresponds to the first burstDur, and the second burstFreq corresponds to the second burstDur, and so on.  If the length, number of modes, of burstFreq and burstDur are not the same, then the extra parameters wll be ignored from the longer list.  These parameters are valid only if the transMode is set to **Burst**.
    * **burstFreq**: list of frequencies, in ms; the time between sending two successive msgs; tester must provide one transmit frequency per corresponding burstDur interval
    * **burstDur**:  list of interval durations for sending transactions, in ms
* **mixOpt**: each invoke is followed by a query on every process. This parameter is valid only the transMode is set to **Mix**.
* **mixFreq**: frequency in ms for the transaction rate. This value should be set based on the characteristics of the chaincode to avoid the failure of the immediate query.
* **constantOpt**: the transactions are sent at the specified rate. This parameter is valid only the transMode is set to **Constant**.
    * **recHist**: This parameter indicates if brief history of the run will be saved.  If this parameter is set to HIST, then the output is saved into a file, namely ConstantResults.txt, under the current working directory.  Otherwise, no history is saved.
    * **constFreq**: frequency in ms for the transaction rate.
    * **devFreq**: deviation of frequency in ms for the transaction rate. A random frequency is calculated between `constFrq-devFreq` and `constFrq+devFreq` for the next transaction.  The value is set to default value, 0, if this value is not set in the user input json file.  All transactions are sent at constant rate if this number is set to 0.
* **listOpt**: targetPeers list of the peers that the transactions are sent. These parameters are valid only when the targetPeers is set to List. Each line includes two parameters: **org name** and **peer array within the org**, for example:

             "listOpt": {
                 "org1": ["peer1","peer2"],
                 "org3": ["peer1"],
                 "org6": ["peer3"]
             }
* **discoveryOpt**: service discovery option. The option is valid only when targetPeer is set to `Discovery`.
    * **localHost**: set to `true` when fabric is running in containers and executing PTE from not in a container, else set to `false`. For CI automation tests or other tests on single host using docker, when sending invokes or queries, set `localHost=true` and set `targetPeers=discovery`. Default value is false.
    * **initFreq**: service discovery re-initialization frequency in ms. PTE will not re-initialize service discovery if this parameter is set to 0. Default: 0.
* **eventOpt**: event options
    * **type**: event service type, default: FilteredBlock
        * **FilteredBlock**: efficient option, delivers filtered events per channel for each block or transaction
        * **Channel**: basic option, delivers full events per channel for each block or transaction
    * **listener**: event listener, default: Block
        * **Transaction**: one event per transaction
        * **Block**: one event per block. The block listener option applies to tranModes CONSTANT and BURST only.
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
* **timeoutOpt**: timeout configuration
    * **preConfig**: The timeout for channel creation and join and chaincode installation and instantiation. Unit: ms. Default:200,000.
    * **request**: The timeout for proposal and transaction. Unit: ms. Default:45,000.
    * **grpcTimeout**: The timeout for grpc that to be used for any transactions using grpc connection. Unit: ms. Default:3,000.
* **ccType**: chaincode type
    * **ccchecker**: The first argument (key) in the query and invoke request is incremented by 1 for every transaction.  The prefix of the key is made of process ID, ex, all keys issued from process 4 will have prefix of **key3_**. And, the second argument (payload) in an invoke (Move) is a random string of size ranging between payLoadMin and payLoadMax defined in ccOpt.
    * **general**: The arguments of transaction request are taken from the user input json file without any changes.
* **ccOpt**: chaincode options, see `ccOpt` and `invoke.query` and `invoke.move` in `marblesccInputs/marblescc-chan1-constant-i-TLS.json` as an example on how to **keyIdx** and **keyPayLoad** below.
    * **keyIdx**: a list of indexes of transaction argument used as keys
    * **keyPayLoad**: a list of indexes of transaction argument used as payload
    * **keyStart**: the starting transaction key index, this is used when the ccType is non general which requires a unique key for each invoke.
    * **payLoadType**: payload type
        * **Fixed**: fixed payload with the size of payLoadMin for every trandsaction
        * **Random**: random payload with a random size between payLoadMin and payLoadMax for every transaction
    * **payLoadMin**: minimum size in bytes of the payload
    * **payLoadMax**: maximum size in bytes of the payload
* **deploy**: deploy transaction contents
    * **chaincodePath**: this path is relative to `gopath/src` if the `gopath` is defined in the service credential json. Otherwise, absolute path is required.
    * **language**: the chaincode language including:
        * **golang**: golang chaincode, this is the default language
        * **node**: Node JS chaincode
* **invoke** invoke transaction contents
    * **query**: query content
    * **move**: move content
* **SCFile**: the service credentials json.


## Service Credentials file
The service credentials contain the information of the network and are stored in the `SCFiles` directory. The following is a sample of the service credentials json file:

    {
        "test-network": {
            "gopath": "GOPATH",
            "orderer": {
                 "orderer0": {
                    "name": "OrdererMSP",
                    "mspid": "OrdererMSP",
                    "mspPath": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config",
                    "adminPath": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/example.com/users/Admin@example.com/msp",
                    "comName": "example.com",
                    "url": "grpcs://localhost:5005",
                    "server-hostname": "orderer0.example.com",
                    "tls_cacerts": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
                }
            },
            "org1": {
                    "name": "Org1MSP",
                    "mspid": "Org1MSP",
                    "mspPath": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config",
                    "adminPath": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp",
                    "comName": "example.com",
                    "ordererID": "orderer0",
                    "ca": {
                         "url":"https://localhost:7054",
                         "name": "ca0"
                    },
                    "username": "admin",
                    "secret": "adminpw",
                    "peer1": {
                            "requests": "grpc://localhost:7061",
                            "events": "grpc://localhost:7051",
                            "server-hostname": "peer0.org1.example.com",
                            "tls_cacerts": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"
                    },
                    "peer2": {
                            "requests": "grpc://localhost:7062",
                            "events": "grpc://localhost:7052",
                            "server-hostname": "peer1.org1.example.com",
                            "tls_cacerts": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"
                    }
            },
            "org2": {
                    "name": "Org2MSP",
                    "mspid": "Org2MSP",
                    "mspPath": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config",
                    "adminPath": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp",
                    "comName": "example.com",
                    "ordererID": "orderer0",
                    "ca": {
                         "url":"https://localhost:8054",
                         "name": "ca1"
                    },
                    "username": "admin",
                    "secret": "adminpw",
                    "peer1": {
                            "requests": "grpcs://localhost:7063",
                            "events": "grpcs://localhost:7053",
                            "server-hostname": "peer0.org2.example.com",
                            "tls_cacerts": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem"
                    },
                    "peer2": {
                            "requests": "grpcs://localhost:7064",
                            "events": "grpcs://localhost:7054",
                            "server-hostname": "peer1.org2.example.com",
                            "tls_cacerts": "src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem"
                    }
            }
        }
    }

Note that

1. Key **gopath** is the GOPATH used by PTE. Set to `GOPATH` to use the environment variable `GOPATH`.

2. Key **ordererID** is the orderer that the org will communicate.

3. User can opt to use the same `tls_cert` for all orderers and peers by setting `tls_cert` at the same level as the **orderer**.  If the `tls_cert` is set, then the file defined in `tls_cacerts` is ignored. This can simplify the setting of tls_cert for a network with large number of peers and orderers.

4. User can opt to include `admin_cert` in the json by setting `admin_cert` within each **org** section.  If the `admin_cert` is set, then the files specified in `adminPath` are ignored.  This allows the certificate to be included in the config json file rather than copy it in multiple locations.


## Creating a local Fabric network
Prequisite: If you do not yet have the Fabric docker images in your local docker registry, please either build them from Fabric source or download them from dockerhub.
    - `cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric/examples/e2e_cli/`
    - `sh ./download-dockerimages.sh -c x86_64-1.0.0 -f x86_64-1.0.0`
Here are two ways to create a local netork:
- Using the Fabric e2e example:
    - `cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric/examples/e2e_cli/`
    - Edit `network_setup.sh`

        * change **COMPOSE_FILE** to

            COMPOSE_FILE=docker-compose-e2e.yaml

        * comment out `docker logs -f cli`

    - `./network_setup.sh up`
- Alternatively, by using the [NetworkLauncher](https://github.com/hyperledger/fabric-test/tree/master/tools/NL) tool:
    - `cd $GOPATH/src/github.com/hyperledger/`
    - `git clone https://github.com/hyperledger/fabric-test`
    - `cd tools/NL`
    - `./networkLauncher.sh -?`

## CI Test
A set of predefined tests are designed for CI daily or weekly execution and are available in the directory, [CITest](https://github.com/hyperledger/fabric-test/tree/master/tools/PTE/CITest), under PTE.


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
