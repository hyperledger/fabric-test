#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-11638
#    0. launch network (optional)
#    1. execute 10000 invokes with validation of all transactions on all peers
#    2. sleep for 2 days
#    3. execute 2nd 10000 invokes with validation of all transactions on all peers

# Usage:
#    ./FAB-11638.sh [network]
#        network: script uses NL to bring up the bare bones network, create/join channel and install/instantiate cc
#        else if omitted (default) then user first establishes own network and places their PTE network json files in PTE/FAB-11638-CP/


# testcase
TESTCASE=$0
TESTCASE=${TESTCASE#"./"}
TESTCASE=${TESTCASE%".sh"}

NetworkOpt="no"
if [ $# -eq 1 ]; then
    NetworkOpt=$1
fi
NetworkOpt=`echo $NetworkOpt | tr A-Z a-z`
echo "NetworkOpt $NetworkOpt"

# parameters
NREQ=10000
NORG=2
NTHREAD=1

# directory
CWD=$PWD
fabricTestDir=$GOPATH"/src/github.com/hyperledger/fabric-test"
NLDir=$fabricTestDir"/tools/NL"
PTEDir=$fabricTestDir"/tools/PTE"
LCPDir=$TESTCASE"-CP"
CPDir=$PTEDir"/"$LCPDir
logDir=$PTEDir"/CITest/Logs"
mkdir -p $logDir

# PTE report file
pteReport=$PTEDir"/pteReport.txt"
CIpteReport=$logDir"/"$TESTCASE"-pteReport.txt"
if [ -e $CIpteReport ]; then
    echo "remove existing $CIpteReport"
    rm -f $CIpteReport
fi
# print testcase name at the top of CIpteReport file
echo "PTE testcase: $TESTCASE" >> $CIpteReport

procTX() {
    invokeType=$1
    keyStart=$2
    tPeers="ORGANCHOR"
    chkPeers="ALLPEERS"
    chktx="ALL"

    cd $CWD
    cd ../scripts
    tCurr=`date +%m%d%H%M%S`
    IPTELOG=$logDir"/"$TESTCASE"-"$invokeType"-"$tCurr".log"
    echo "./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg $NORG --keystart $keyStart --targetpeers $tPeers --chkpeers $chkPeers --chktx $chktx -a samplecc --nreq $NREQ --nproc $NTHREAD -t $invokeType >& $IPTELOG"
          ./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg $NORG --keystart $keyStart --targetpeers $tPeers --chkpeers $chkPeers --chktx $chktx -a samplecc --nreq $NREQ --nproc $NTHREAD -t $invokeType >& $IPTELOG

    # calculate overall TPS
    echo ""
    echo "node get_pteReport.js $pteReport"
          node get_pteReport.js $pteReport
    cat $pteReport >> $CIpteReport
    # remove pteReport
    if [ -e $pteReport ]; then
        echo "remove $pteReport"
        rm -f $pteReport
    fi
}

# process begins
    timestamp=`date`
    echo "[$TESTCASE] $TESTCASE with $NTHREAD threads x $NREQ transactions starts at $timestamp"

    #### network and pre-config
    if [ $NetworkOpt == "network" ]; then

        if [ -e $CPDir ]; then
            echo "[$TESTCASE] clean up $CPDir"
            rm -rf $CPDir
        fi
        echo "[$TESTCASE] mkdir $CPDir"
        mkdir $CPDir

        ### launch network
        cd $NLDir
        rm -f config-chan*

        echo "[$TESTCASE] destroy existing network"
        ./networkLauncher.sh -a down

        echo "[$TESTCASE] launch network"
        ./networkLauncher.sh -o 3 -x 2 -r $NORG -p 2 -k 4 -z 3 -n 1 -e 3 -f test -w localhost -S serverauth -c 2s -l INFO -B 500

        cp config-chan*-TLS.json $CPDir
        sleep 30

        cd $CWD
        cd ../scripts

        # PTE: pre-config
        echo ""
        echo "          *****************************************************************************"
        echo "          *                            PTE: pre-config                                *"
        echo "          *****************************************************************************"
        echo ""

        # PTE: create/join channel
        echo "./gen_cfgInputs.sh -d $LCPDir -c -n testorgschannel1 --norg $NORG -a samplecc"
              ./gen_cfgInputs.sh -d $LCPDir -c -n testorgschannel1 --norg $NORG -a samplecc
        sleep 30

        # PTE: install/instantiate chaincode
        echo "./gen_cfgInputs.sh -d $LCPDir -i -n testorgschannel1 --norg $NORG -a samplecc"
              ./gen_cfgInputs.sh -d $LCPDir -i -n testorgschannel1 --norg $NORG -a samplecc
        sleep 30
    fi

    # remove existing pteReport
    if [ -e $pteReport ]; then
        echo "remove $pteReport"
        rm -f $pteReport
    fi

    # PTE: 1st invokes
    echo ""
    echo "          *****************************************************************************"
    echo "          *                      PTE: 1st invokes and validation                      *"
    echo "          *****************************************************************************"
    echo ""

    procTX move 0

    # sleep 2 days
    echo ""
    echo "          *****************************************************************************"
    echo "          *                               rest 2 days                                 *"
    echo "          *****************************************************************************"
    echo ""
    echo "starts 2 days rest at `date`"
    sleep 172800
    echo "ends 2 days rest at `date`"

    # PTE: 2nd invokes run
    echo ""
    echo ""
    echo "          *****************************************************************************"
    echo "          *                      PTE: 2nd invokes and validation                      *"
    echo "          *****************************************************************************"
    echo ""
    procTX move $NREQ

    timestamp=`date`
    echo ""
    echo "[$TESTCASE] $TESTCASE with $NTHREAD threads x $NREQ transactions completed at $timestamp"

