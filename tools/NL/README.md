Network Launcher
-------



The network Launcher can execute the following task:

1. generate crypto-config yaml and execute cryptogen to generate crypto
2. create configtx.yml
3. create orderer genesis block
4. create channel configuration transaction
5. create a docker-compose.yml and launch a network

The usages of each script is given below so that they can be executed separately as needed.  However, the script, networkLauncher.sh, is designed to execute all tasks listed above sequentially.

## Code Base

- fabric commit level: v1.0.0
- fabric-sdk-node commit level: v1.0.0
- fabric-ca commit level: v1.0.0


# networkLauncher.sh

This is the main script to execute all tasks.


## Usage:

    ./networkLauncher.sh [opt] [value]
       options:
         -a: network action [up|down], default=up
         -x: number of CAs
         -d: ledger database type, default=goleveldb
         -f: profile string, default=test
         -h: hash type, default=SHA2
         -k: number of kafka, default=solo
         -z: number of zookeepers, default=0
         -n: number of channels, default=1
         -o: number of orderers, default=1
         -p: number of peers per organization, default=1
         -r: number of organizations, default=1
         -s: security type, default=256
         -t: ledger orderer service type [solo|kafka], default=solo
         -w: host ip 1, default=0.0.0.0
         -F: local MSP base directory, default=$GOPATH/src/github.com/hyperledger/fabric/common/tools/cryptogen/crypto-config
         -G: src MSP base directory, default=/opt/hyperledger/fabric/msp/crypto-config
         -S: TLS enablement [enabled|disabled], default=disabled
         -C: company name, default=example.com

Note that when `-a down` is invoked to clean network, the company name is used as a key word in searching for docker images to be deleted.  The company name can be set using `-C`. The default company name is `example.com`.

## Example:

The following commands will clean a network with containers and docker images:

    ./networkLauncher.sh -a down -C example.com
    ./networkLauncher.sh -a down

The above commands invoke cleanNetwork.sh.

The following commands will generate a network:

    ./networkLauncher.sh -o 1 -x 2 -r 2 -p 2 -k 1 -z 1 -n 2 -t kafka -f test -w 10.120.223.35
    ./networkLauncher.sh -o 1 -x 2 -r 2 -p 2 -n 1 -f test -w localhost
    ./networkLauncher.sh -o 3 -x 6 -r 6 -p 2 -k 3 -z 3 -n 3 -t kafka -f test -w localhost -S enabled

The above command will invoke cryptogen, cfgtxgen, generate orderer block, channel transaction and launch network.

# cleanNetwork.sh

The script is used to clean a network.

## Usage

    ./cleanNetwork.sh [docker image key word]

## Example

    ./cleanNetwork.sh sample

# cryptogen

The executable is in $GOPATH/src/github.com/hyperledger/fabric/common/tools/cryptogen and is used to create crypto

    cd $GOPATH/src/github.com/hyperledger/fabric/common/tools/cryptogen
    apt-get install libltdl-dev
    go build

## Usage

    ./cryptogen generate --output=<cryptogen dir> --config=<crypto config>


# gen\_configtx_cfg.sh

The script is used to create configtx.yaml.

## Usage

    ./gen_configtx_cfg.sh [opt] [value]

    options:
       -o: number of orderers, default=1
       -k: number of kafka, default=0
       -p: number of peers per organiztion, default=1
       -h: hash type, default=SHA2
       -r: number of organization, default=1
       -s: security service type, default=256
       -t: orderer service [solo|kafka], default=solo
       -b: MSP directory, default=/mnt/crypto-config
       -w: host ip 1, default=0.0.0.0


## Example:

    ./gen_configtx_cfg.sh -o 1 -k 1 -p 2 -r 6 -h SHA2 -s 256 -t kafka -b /root/gopath/src/github.com/hyperledger/fabric/common/tools/cryptogen/ -w 10.120.223.35



# configtx.yaml-in

This is a sample of configtx.yaml to be used to generate the desired configtx.yaml. The key words in the sample file are:

+ &ProfileString: the profile string
+ *Org0: used by the script to list all organizations
+ &OrdererOrg: used by the script to list all Organization with its attributes
+ &Org0: used for the list of peers in organization
+ OrdererType: used for the orderer service type

# gen_network.sh

The script is used to create a docker-compose.yml and launch the network with specified number of peers, orderers, orderer service type etc.

## Usage

    gen_network.sh [opt] [value]

    options:
       network variables
       -a: action [create|add]
       -z: number of CAs
       -p: number of peers
       -o: number of orderers
       -k: number of brokers
       -r: number of organiztions
       -F: local MSP base directory, default=/root/gopath/src/github.com/hyperledger/fabric/common/tools/cryptogen/crypto-config
       -G: src MSP base directory, default=/opt/hyperledger/fabric/msp/crypto-config

       peer environment variables
       -l: core logging level [(default = not set)|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG]
       -d: core ledger state DB [goleveldb|couchdb]

       orderer environment variables
       -b: batch size [10|msgs in batch/block]
       -t: orderer type [solo|kafka]
       -c: batch timeout [2s|max secs before send an unfilled batch]


## Example

    ./gen_network.sh -a create -z 2 -p 2 -r 2 -o 1 -k 1 -t kafka -d goleveldb -F /root/gopath/src/github.com/hyperledger/fabric/common/tools/cryptogen/crypto-config -G /opt/hyperledger/fabric/msp/crypto-config


## IP address and port

All IP addresses and ports of orderer, peer, event hub are specified in network.json.

    "caAddress": "0.0.0.0",
    "caPort": "7054",
    "ordererAddress": "0.0.0.0",
    "ordererPort": "7050",
    "couchdbAddress": "0.0.0.0",
    "couchdbPort": "5984",
    "vp0Address": "0.0.0.0",
    "vp0Port": "7061",
    "evtAddress": "0.0.0.0",
    "evtPort": "9061",


## Images

All images (peer, kafka, and orderer etc) path (location) are specified in network.json

        "ca": {
             "image": "hyperledger/fabric-ca",

        "zookeeper": {
            "image": "hyperledger/fabric-zookeeper",


        "kafka": {
            "image": "hyperledger/fabric-kafka",


        "orderer": {
            "image": "hyperledger/fabric-orderer",


        "peer": {
            "image": "hyperledger/fabric-peer",


