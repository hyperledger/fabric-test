Network Launcher
-------



The network Launcher can execute the following task:

1. generate crypto-config yaml and execute cryptogen to generate crypto
2. create configtx.yml
3. create orderer genesis block
4. create channel configuration transaction
5. create a docker-compose.yml and launch a network
6. generate PTE service credential configuration json

The usages of each script is given below so that they can be executed separately as needed.  However, the script, networkLauncher.sh, is designed to execute all tasks listed above sequentially.

## Code Base

- fabric commit level: v1.0.0
- fabric-sdk-node commit level: v1.0.0
- fabric-ca commit level: v1.0.0

It is user's responsibility to install related docker images on the system. User can either create docker images using `make docker` or use the bootstrap scripts in fabric-test/fabric/scripts to pull docker images from dockerhub.

# networkLauncher.sh

This is the main script to execute all tasks.


## Usage:

    ./networkLauncher.sh [opt] [value]
       options:
         -a: network action [up|down], default=up
         -x: number of ca, default=0
         -d: ledger database type, default=goleveldb
         -f: profile string, default=test
         -h: hash type, default=SHA2
         -k: number of kafka, default=0
         -e: number of kafka replication, default=0
         -z: number of zookeepers, default=0
         -n: number of channels, default=1
         -o: number of orderers, default=1
         -p: number of peers per organization, default=1
         -r: number of organizations, default=1
         -s: security type, default=256
         -t: ledger orderer service type [solo|kafka], default=solo
         -w: host ip 1, default=0.0.0.0
         -l: core logging level [CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG], default=ERROR
         -q: orderer logging level [CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG], default=ERROR
         -c: batch timeout, default=2s
         -B: batch size, default=10
         -F: local MSP base directory, default=$GOPATH/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen
         -G: src MSP base directory, default=/opt/hyperledger/fabric/msp/crypto-config
         -S: TLS enablement [disabled|serverauth|clientauth], default=disabled
         -C: company name, default=example.com
         -M: JSON file containing organization and MSP name mappings (optional)

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
    ./networkLauncher.sh -o 1 -x 5 -r 5 -p 1 -k 1 -z 1 -n 1 -C trade.com -M sampleOrgMap.json -t kafka -f test -w localhost -S enabled

The above command will invoke cryptogen, cfgtxgen, generate orderer block, channel transaction and launch network.

### Custom Organization Names and MSP IDs

By default, NL will generate organization names `org1`, `org`, etc. and MSP IDs `PeerOrg1`, `PeerOrg2`, etc.
If your chaincode application depends on other (custom) organization names and MSP IDs, you can specify a mapping from the default names to the custom names in a JSON file, an example of which is given below (see [sampleOrgMap.json](./sampleOrgMap.json)):
```
{
    "org1": "myfirstorg",
    "org3": "mythirdorg",
    "PeerOrg2": "SecondOrgMSP",
    "PeerOrg3": "ThirdOrgMSP"
}
```
In this example, `org1` is replaced with `myfirstorg` in the network that is launched, the MSP ID `PeerOrg3` is replaced with `ThirdOrgMSP`, and so on.
_Note_: If you are going to run other tools (like PTE) on this network, you will need to configure the service credential and test case files suitably with your custom organization names and MSP IDs.
_Note_: To use this mapping, you will need to pass the pathname to the JSON file with the `-M` parameter when you run the various scripts in this folder.

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
       -f: profile name, default=test
       -b: MSP directory, default=$GOPATH/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config
       -w: host ip 1, default=0.0.0.0
       -c: batch timeout, default=2s
       -B: batch size, default=10
       -v: array of organization name, default=0
       -C: company name, default=example.com
       -M: JSON file containing organization and MSP name mappings (optional)


## Example:

    ./gen_configtx_cfg.sh -o 1 -k 1 -p 2 -r 6 -h SHA2 -s 256 -t kafka -b /root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config -w 10.120.223.35



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
       -p: number of peers per organization
       -o: number of orderers
       -k: number of brokers
       -e: number of kafka replications, defualt=brokers
       -z: number of zookeeper
       -r: number of organiztions
       -S: TLS enablement [enabled|disabled], default=disabled
       -m: Mutual TLS enablement [enabled|disabled], default=disabled
       -x: number of ca
       -F: local MSP base directory, default=$GOPATH/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config
       -G: src MSP base directory, default=/opt/hyperledger/fabric/msp/crypto-config
       -C: company name, default=example.com
       -M: JSON file containing organization and MSP name mappings (optional)

       peer environment variables
       -l: core logging level [(default = not set)|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG]
       -d: core ledger state DB [goleveldb|couchdb]

       orderer environment variables
       -t: orderer type [solo|kafka]
       -q: orderer logging level [(default = not set)|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG]


## Example

    ./gen_network.sh -a create -z 2 -p 2 -r 2 -o 1 -k 1 -t kafka -d goleveldb -F /root/gopath/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config -G /opt/hyperledger/fabric/msp/crypto-config


# gen_PTEcfg.sh

The script generates the service credential json files of a network to be used as an input to [PTE](https://github.com/hyperledger/fabric-test/tree/master/tools/PTE).

## Usage

    gen_PTEcfg.sh [opt] [value]

    options:
       -o: number of orderers, default=1
       -p: number of peers per organization, default=1
       -r: number of organizations, default=1
       -n: number of channels, default=1
       -x: number of ca, default=1
       -b: MSP directory, default=src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config
       -w: host ip, default=localhost
       -C: company name, default=example.com
       -M: JSON file containing organization and MSP name mappings (optional) "



## Example

    ./gen_PTEcfg.sh -n 3 -o 3 -p 2 -r 6 -x 6

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


