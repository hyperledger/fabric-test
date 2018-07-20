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
PREFIX="result"   # result log prefix

CWD=$PWD
FabricTestDir=$GOPATH"/src/github.com/hyperledger/fabric-test"
NLDir=$FabricTestDir"/tools/NL"
PTEDir=$FabricTestDir"/tools/PTE"
LSCDir=$TESTCASE"-SC"
SCDir=$PTEDir"/"$LSCDir

# thread loop
for (( NTHREAD = 4; NTHREAD <= 40; NTHREAD+=4 )); do
    timestamp=`date`
    echo "[$0] $TESTCASE with $NTHREAD threads x $NREQ transactions start at $timestamp"
    if [ -e $SCDir ]; then
        echo "[$0] clean up $SCDir"
        rm -rf $SCDir
    fi
    echo "[$0] mkdir $SCDir"
    mkdir $SCDir

    cd $NLDir
    rm $NLDir"/config-chan*-TLS.json"

    #### bring down network
    echo "[$0] bring down network"
    ./networkLauncher.sh -a down

    #### bring up network
    echo "[$0] bring up network"
    ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled -c 2s -l INFO -B 500

    cp config-chan*-TLS.json $SCDir

    # PTE
    echo ""
    echo "          *****************************************************************************"
    echo "          *                                 execute PTE                               *"
    echo "          *****************************************************************************"
    echo ""

    cd $CWD
    cd ../scripts

    # PTE: create/join channel, install/instantiate chaincode
    echo "./gen_cfgInputs.sh -d $LSCDir -c -i -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD"
          ./gen_cfgInputs.sh -d $LSCDir -c -i -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD
    sleep 30

    # PTE: invokes
    tCurr=`date +%m%d%H%M%S`
    IPTELOG="../Logs/"$TESTCASE"-"$NTHREAD"i-"$tCurr".log"
    echo "./gen_cfgInputs.sh -d $LSCDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t move >& $IPTELOG"
          ./gen_cfgInputs.sh -d $LSCDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t move >& $IPTELOG
    sleep 30

    # PTE: queries
    tCurr=`date +%m%d%H%M%S`
    QPTELOG="../Logs/"$TESTCASE"-"$NTHREAD"q-"$tCurr".log"
    echo "./gen_cfgInputs.sh -d $LSCDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t query >& $QPTELOG"
          ./gen_cfgInputs.sh -d $LSCDir -n testorgschannel1 --norg 1 -a samplecc --nreq $NREQ --nproc $NTHREAD -t query >& $QPTELOG

    # stats
    echo ""
    echo "          *****************************************************************************"
    echo "          *                               process stats                               *"
    echo "          *****************************************************************************"
    echo ""

    # stats: invokes
    ./get_peerStats.sh -r $TESTCASE"-"$NTHREAD -p peer0.org1.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v

    # stats: queries
    STATSLOG=$CWD"/"$PREFIX"_"$TESTCASE"-"$NTHREAD".log"
    grep Summary $QPTELOG | grep QUERY >> $STATSLOG

    cd $CWD

    timestamp=`date`
    echo "[$0] $TESTCASE with $NTHREAD threads x $NREQ transactions end at $timestamp"

done

exit
