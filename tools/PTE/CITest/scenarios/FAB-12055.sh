#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-12055
# bare bones network: 1 channel, 1 org, 1 peer, 1 ca, solo orderer
# trnasactions: multiple processes (4, 8, 12, ..., 52) X 10000 transactions, both invoke and query
# chaincodes: samplecc golang, samplecc Node js, samplecc java
#
# Usage:
#    ./FAB-12055.sh [network]
#        network: script uses NL to bring up the bare bones network, create/join channel and install/instantiate cc
#        else if omitted (default) then user first establishes own network and places their PTE network json files in PTE/FAB-12055-CP/

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

NREQ=10000
PREFIX="result"   # result log prefix

CWD=$PWD
FabricTestDir=$GOPATH"/src/github.com/hyperledger/fabric-test"
NLDir=$FabricTestDir"/tools/NL"
PTEDir=$FabricTestDir"/tools/PTE"
LCPDir=$TESTCASE"-CP"
CPDir=$PTEDir"/"$LCPDir

LOGDIR="../Logs"
mkdir -p $LOGDIR

pteReport="../../pteReport.txt"
# remove existing pteReport
if [ -e $pteReport ]; then
    echo "[$0] remove $pteReport"
    rm -f $pteReport
fi

# test chaincodes: samplecc golang, Node js, and java
CHAINCODES="samplecc samplejs samplejava"

# benchmark begins
for applcc in $CHAINCODES
do
    echo "executing applcc: $applcc"

    #### network and pre-config
    if [ $NetworkOpt == "network" ]; then
        if [ -e $CPDir ]; then
            echo "[$0] clean up $CPDir"
            rm -rf $CPDir
        fi
        echo "[$0] mkdir $CPDir"
        mkdir $CPDir

        # NL brting up network
        echo ""
        echo "          *****************************************************************************"
        echo "          *                         execute NL: bring up network                      *"
        echo "          *****************************************************************************"
        echo ""

        cd $NLDir
        rm -f config-chan*

        #### bring down network
        echo "[$0] bring down network"
        ./networkLauncher.sh -a down

        #### bring up network
        echo "[$0] bring up network"
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled -c 2s -l INFO -B 500

        cp config-chan*-TLS.json $CPDir

        # PTE pre-configuration: create/join channel and install/instantiate chaincode
        echo ""
        echo "          *****************************************************************************"
        echo "          *                            execute PTE: pre-config                        *"
        echo "          *****************************************************************************"
        echo ""

        cd $CWD
        cd ../scripts
        # PTE: create/join channel, install/instantiate chaincode
        echo "./gen_cfgInputs.sh -d $LCPDir -c -i -n testorgschannel1 --norg 1 -a $applcc --nreq $NREQ --nproc $NTHREAD"
              ./gen_cfgInputs.sh -d $LCPDir -c -i -n testorgschannel1 --norg 1 -a $applcc --nreq $NREQ --nproc $NTHREAD
        sleep 30
    fi

    KEYSTART=0
    # thread loop
    for (( NTHREAD = 4; NTHREAD <= 52; NTHREAD+=4 )); do
        cd $CWD
        cd ../scripts

        timestamp=`date`
        echo ""
        echo ""
        echo "[$0] $timestamp  starts benchmark $applcc with $NTHREAD threads x $NREQ transactions"

        CIpteReport=$LOGDIR"/"$TESTCASE"-"$applcc"-"$NTHREAD"threads-pteReport.log"
        if [ -e $CIpteReport ]; then
            rm -f $CIpteReport
        fi
        # print testcase name at the top of CIpteReport file
        echo "PTE testcase: $TESTCASE" >> $CIpteReport

        # PTE: invokes
        echo ""
        echo "          *****************************************************************************"
        echo "          *                            execute PTE: invokes                           *"
        echo "          *****************************************************************************"
        echo ""
        tCurr=`date +%m%d%H%M%S`
        if [ ! -e ../Logs ]; then
            mkdir ../Logs
        fi
        IPTELOG="../Logs/"$TESTCASE"-"$NTHREAD"i-"$tCurr".log"
        echo "./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a $applcc --nreq $NREQ --nproc $NTHREAD --keystart $KEYSTART -t move >& $IPTELOG"
              ./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a $applcc --nreq $NREQ --nproc $NTHREAD --keystart $KEYSTART -t move >& $IPTELOG
        sleep 30

        #### calculate overall invoke TPS from pteReport
        node get_pteReport.js $pteReport
        cat $pteReport >> $CIpteReport
        rm -f $pteReport

        # PTE: queries
        echo ""
        echo "          *****************************************************************************"
        echo "          *                            execute PTE: queries                           *"
        echo "          *****************************************************************************"
        echo ""
        tCurr=`date +%m%d%H%M%S`
        QPTELOG="../Logs/"$TESTCASE"-"$NTHREAD"q-"$tCurr".log"
        echo "./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a $applcc --nreq $NREQ --nproc $NTHREAD --keystart $KEYSTART -t query >& $QPTELOG"
              ./gen_cfgInputs.sh -d $LCPDir -n testorgschannel1 --norg 1 -a $applcc --nreq $NREQ --nproc $NTHREAD --keystart $KEYSTART -t query >& $QPTELOG

        #### calculate overall invoke TPS from pteReport
        node get_pteReport.js $pteReport
        cat $pteReport >> $CIpteReport
        rm -f $pteReport

        # update KEYSTART for next run
        KEYSTART=$((KEYSTART + NREQ))
        timestamp=`date`
        echo "[$0] $timestamp  completes benchmark $applcc with $NTHREAD threads x $NREQ transactions at $timestamp"
        sleep 30

    done   # threads loop
done       # applcc loop

cd $CWD

