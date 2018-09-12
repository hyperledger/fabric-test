#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-11638
#    0. launch network
#    1. execute 10000 invokes
#    2. execute 10000 queries
#    3. sleep for 2 days
#    4. execute 2nd 10000 invokes
#    5. execute 2nd 10000 queries


# testcase
TESTCASE=$0
TESTCASE=${TESTCASE#"./"}
TESTCASE=${TESTCASE%".sh"}

# parameters
NREQ=10000
NTHREAD=1

# directory
CWD=$PWD
fabricTestDir=$GOPATH"/src/github.com/hyperledger/fabric-test"
NLDir=$fabricTestDir"/tools/NL"
PTEDir=$fabricTestDir"/tools/PTE"
LSCDir=$TESTCASE"-SC"
SCDir=$PTEDir"/"$LSCDir
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

    cd $CWD
    cd ../scripts
    tCurr=`date +%m%d%H%M%S`
    IPTELOG=$logDir"/"$TESTCASE"-"$invokeType"-"$tCurr".log"
    echo "./gen_cfgInputs.sh -d $LSCDir -n testorgschannel1 --norg 2 --keystart $keyStart -a samplecc --nreq $NREQ --nproc $NTHREAD -t $invokeType >& $IPTELOG"
          ./gen_cfgInputs.sh -d $LSCDir -n testorgschannel1 --norg 2 --keystart $keyStart -a samplecc --nreq $NREQ --nproc $NTHREAD -t $invokeType >& $IPTELOG

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
    if [ -e $SCDir ]; then
        echo "[$TESTCASE] clean up $SCDir"
        rm -rf $SCDir
    fi
    echo "[$TESTCASE] mkdir $SCDir"
    mkdir $SCDir

    ### launch network
    cd $NLDir
    rm -f config-chan*

    echo "[$TESTCASE] destroy existing network"
    ./networkLauncher.sh -a down

    echo "[$TESTCASE] launch network"
    ./networkLauncher.sh -o 3 -x 2 -r 2 -p 2 -k 4 -z 3 -n 1 -e 3 -f test -w localhost -S serverauth -c 2s -l INFO -B 500

    cp config-chan*-TLS.json $SCDir
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
    echo "./gen_cfgInputs.sh -d $LSCDir -c -n testorgschannel1 --norg 2 -a samplecc"
          ./gen_cfgInputs.sh -d $LSCDir -c -n testorgschannel1 --norg 2 -a samplecc
    sleep 30

    # PTE: install/instantiate chaincode
    echo "./gen_cfgInputs.sh -d $LSCDir -i -n testorgschannel1 --norg 2 -a samplecc"
          ./gen_cfgInputs.sh -d $LSCDir -i -n testorgschannel1 --norg 2 -a samplecc
    sleep 30

    # remove existing pteReport
    if [ -e $pteReport ]; then
        echo "remove $pteReport"
        rm -f $pteReport
    fi

    # PTE: 1st invokes
    echo ""
    echo "          *****************************************************************************"
    echo "          *                           PTE: 1st invokes                                *"
    echo "          *****************************************************************************"
    echo ""

    procTX move 0
    sleep 30

    # PTE: 1st queries
    echo ""
    echo "          *****************************************************************************"
    echo "          *                           PTE: 1st queries                                *"
    echo "          *****************************************************************************"
    echo ""
    procTX query 0

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
    echo "          *                             PTE: 2nd invokes                              *"
    echo "          *****************************************************************************"
    echo ""
    procTX move $NREQ
    sleep 30

    # PTE: 2nd queries run
    echo ""
    echo "          *****************************************************************************"
    echo "          *                             PTE: 2nd queries                              *"
    echo "          *****************************************************************************"
    echo ""
    procTX query $NREQ

    timestamp=`date`
    echo ""
    echo "[$TESTCASE] $TESTCASE with $NTHREAD threads x $NREQ transactions completed at $timestamp"

exit
