#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-10677
# 1 channel, 1 org, 1 peer, 1 ca, solo orderer
# multiple processes (4, 8, 12, ..., 40) X 10000 transactions, both invoke and query

TESTCASE="FAB-10677"
NREQ=10000

CWD=$PWD
CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
NLDir=$FabricTestDir"/tools/NL"
PTEDir=$FabricTestDir"/tools/PTE"
LCPDir=$TESTCASE"-CP"
CPDir=$PTEDir/$LCPDir
LOGDir=$PTEDir"/CITest/Logs"
CMDDir=$PTEDir"/CITest/scripts"
CIpteReport=$LOGDir"/"$TESTCASE"-pteReport.log"
pteReport=$PTEDir"/pteReport.txt"
echo "PTE report=$CIpteReport"
if [ -e $CIpteReport ]; then
    rm -f $CIpteReport
fi

# thread loop
for (( NTHREAD = 4; NTHREAD <= 52; NTHREAD+=4 )); do
    timestamp=`date`
    echo "[$0] $TESTCASE with $NTHREAD threads x $NREQ transactions start at $timestamp"
    if [ -e $CPDir ]; then
        echo "[$0] clean up $CPDir"
        rm -rf $CPDir
    fi
    echo "[$0] mkdir $CPDir"
    mkdir $CPDir

    cd $NLDir
    rm -f config-chan*

    #### bring down network
    echo "[$0] bring down network"
    ./networkLauncher.sh -a down

    #### bring up network
    echo "[$0] bring up network"
    ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled -c 2s -l INFO -B 500

    cp config-chan*-TLS.json $CPDir

    # PTE
    echo ""
    echo "          *****************************************************************************"
    echo "          *                                 execute PTE                               *"
    echo "          *****************************************************************************"
    echo ""

    cd $CMDDir

    # PTE: create/join channel, install/instantiate chaincode
    echo "./gen_cfgInputs.sh -d $LCPDir -c -i -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD"
          ./gen_cfgInputs.sh -d $LCPDir -c -i -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD
    sleep 30

    # PTE: invokes
    tCurr=`date +%m%d%H%M%S`
    if [ ! -e $LOGDir ]; then
        mkdir $LOGDir
    fi
    IPTELOG=$LOGDir"/"$TESTCASE"-"$NTHREAD"i-"$tCurr".log"
    if [ -e $pteReport ]; then
       rm -f $pteReport
    fi
    echo "./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t move >& $IPTELOG"
          ./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t move >& $IPTELOG
    sleep 30
    echo "node get_pteReport.js $pteReport"
    node get_pteReport.js $pteReport
    echo "$TESTCASE Threads=$NTHREAD Invokes" >> $CIpteReport
    cat $pteReport >> $CIpteReport

    # PTE: queries
    tCurr=`date +%m%d%H%M%S`
    QPTELOG=$LOGDir"/"$TESTCASE"-"$NTHREAD"q-"$tCurr".log"
    if [ -e $pteReport ]; then
       rm -f $pteReport
    fi
    echo "./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t query >& $QPTELOG"
          ./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t query >& $QPTELOG

    echo "node get_pteReport.js $pteReport"
    node get_pteReport.js $pteReport
    echo "$TESTCASE Threads=$NTHREAD Queries" >> $CIpteReport
    cat $pteReport >> $CIpteReport

    cd $CWD

    timestamp=`date`
    echo "[$0] $TESTCASE with $NTHREAD threads x $NREQ transactions end at $timestamp"

done

