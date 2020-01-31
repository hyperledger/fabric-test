#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-17350
# 1 channel, 1 org, 1 peer, 1 ca, raft orderer
# multiple processes (28, 32, 36) X 10000 transactions, both invoke and query
# test output: fabric-test/tools/operator/pteReport.txt

NREQ=10000
myKey0=0

CWD=$PWD
CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
#operator dir
OPDir=$FabricTestDir"/tools/operator"

pteReport=$OPDir"/pteReport.txt"

pteInputMaster="testdata/barebones-test-input-master.yml"
pteInput="testdata/barebones-test-input.yml"

usage () {
    echo -e "\nUSAGE:\t$0 [options] [values]"
    echo
    echo -e "-h\tview this help message"

    echo -e "-c\tbring up network, create/join channel, install/instantiate chaincode"
    echo -e "\t\t(optional, Default: no)"

    echo -e "-k\tkubernetes configuration file with relative path to fabric-test/tools/operator/"
    echo -e "\t\ta local network will be brought up if this option is not present"

    echo
    echo -e "example:"
    echo -e "\tThe following command will bring up a network on kubernetes based on the specified kube config file, then create/join channel, install/instantiate chaincode, and send transactions."
    echo -e "\t$0 -c -k launcher/FAB-17350-kubeConfig/kube-config-wdc04-community-migration.yml"
    echo
    echo -e "\tThe following command will send transactions to the network on kubernetes specified in the specified Kube configuration file."
    echo -e "\t$0 -k launcher/FAB-17350-kubeConfig/kube-config-wdc04-community-migration.yml"
    echo
    echo -e "\tThe following command will bring up a local network, then create/join channel, install/instantiate chaincode, and send transactions."
    echo -e "\t$0 -c"
    echo
    echo -e "\tThe following command will send transactions to the local network."
    echo -e "\t$0"

    exit
}

networkProc() {
    cd $OPDir
    if [ ! -z "$kubeCfg" ]; then
        # bring down network
        go run main.go -i testdata/barebones-network-spec.yml -k $kubeCfg -a down

        # bring up network
        go run main.go -i testdata/barebones-network-spec.yml -k $kubeCfg -a up
    else
        # bring down network
        go run main.go -i testdata/barebones-network-spec.yml -a down

        # bring up network
        go run main.go -i testdata/barebones-network-spec.yml -a up
    fi
}

chaincodeProc() {
    cd $OPDir
    cp $pteInputMaster $pteInput
    sed -i -e "s/_KEYSTART_/0/g" $pteInput
    sed -i -e "s/_NPROCPERORG_/1/g" $pteInput
    if [ ! -z "$kubeCfg" ]; then
        ### kubernetes network
        # create/join channel
        go run main.go -i testdata/barebones-test-input.yml -k $kubeCfg -a create
        go run main.go -i testdata/barebones-test-input.yml -k $kubeCfg -a join

        # install/instantiate chaincode
        go run main.go -i testdata/barebones-test-input.yml -k $kubeCfg -a install
        go run main.go -i testdata/barebones-test-input.yml -k $kubeCfg -a instantiate
    else
        ### local network
        # create/join channel
        go run main.go -i testdata/barebones-test-input.yml -a create
        go run main.go -i testdata/barebones-test-input.yml -a join

        # install/instantiate chaincode
        go run main.go -i testdata/barebones-test-input.yml -a install
        go run main.go -i testdata/barebones-test-input.yml -a instantiate
    fi

}

txExecution(){

    if [ -e $pteReport ]; then
        rm -f $pteReport
    fi

    # thread loop
    for (( NTHREAD = 28; NTHREAD <= 36; NTHREAD+=4 )); do

        cd $OPDir
        cp $pteInputMaster $pteInput
        sed -i -e "s/_KEYSTART_/$myKey0/g" $pteInput
        sed -i -e "s/_NPROCPERORG_/$NTHREAD/g" $pteInput

        timestamp=`date`
        echo "[$0] with $NTHREAD threads x $NREQ transactions starts at $timestamp"
        # PTE: invokes
        if [ ! -z "$kubeCfg" ]; then
            ### kubernetes network
            # PTE: invokes
            go run main.go -i testdata/barebones-test-input.yml -k launcher/FAB-17350-kubeConfig/kube-config-wdc04-community-migration.yml -a invoke
            sleep 30
            # PTE: queries
            go run main.go -i testdata/barebones-test-input.yml -k launcher/FAB-17350-kubeConfig/kube-config-wdc04-community-migration.yml -a query
        else
            ### local network
            # PTE: invokes
            go run main.go -i testdata/barebones-test-input.yml -a invoke
            sleep 30
            # PTE: queries
            go run main.go -i testdata/barebones-test-input.yml -a invoke
        fi

        timestamp=`date`
        echo "[$0] with $NTHREAD threads x $NREQ transactions ends at $timestamp"

        myKey0=$(( myKey0+NREQ ))
    done

}

while [[ $# -gt 0 ]]; do
    arg="$1"

    case $arg in

      -h)
          usage        # displays usage info; exits
          ;;

      -c)
          channelSetup="YES"
          echo -e "\t- Specify create/join channel and install/instantiate chaincode\n"
          shift
          ;;

      -k)
          shift
          kubeCfg=$1       # Kube config file
          echo -e "\t- Specify kubeCfg: $kubeCfg\n"
          shift
          ;;

      *)
          echo "Unrecognized command line argument: $1"
          usage
          ;;
    esac
done


# check if ned channel setup
set -x
if [ ! -z "$channelSetup" ]; then
    networkProc
    chaincodeProc
fi

# execution transactions
txExecution
set +x

cd $CWD

