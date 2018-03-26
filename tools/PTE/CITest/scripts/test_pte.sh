#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

if [ $# -gt 2 ]; then
    echo "[$0] invalid number of arguments: $#"
    ./test_help.sh test_pte.sh
    exit
fi

cd ../..
PTEDir=$PWD
CIDir=$PTEDir/CITest
ScriptsDir=$CIDir/scripts
LogsDir=$CIDir/Logs
echo "[$0] PTEDir= $PTEDir"

TCase=$1
TStart=$2
echo "[$0] test case: $TCase"

cd $PTEDir

if [[ ! -d CITest/Logs ]]; then
    echo "[$0] create log directory: $LogsDir"
    mkdir $LogsDir
fi

# sanity check if the test case directory exists
if [[ ! -e CITest/$TCase ]]; then
    echo "The test case [CITest/$TCase] does not exist"
    cd $ScriptsDir
    ./test_help.sh test_driver.sh
    exit
fi


# execute test cases
if [ $TCase == "robust-i-TLS" ]; then
    # robustness test: in addition to pte_mgr.sh, requires test_robust.sh to restart orderers and peers
    tCurr=`date +%m%d%H%M%S`
    echo "*************** [$0] executing: ***************"
    echo "    ./pte_mgr.sh CITest/$TCase/samplecc/PTEMgr-$TCase.txt >& $LogsDir/$TCase"_"$tCurr.log"
    echo "    ./pte_mgr.sh CITest/$TCase/samplecc/PTEMgr-$TCase.txt >& $LogsDir/$TCase"_"$tCurr.log" > $LogsDir/$TCase"_"$tCurr.log
    sleep 20s
    ./pte_mgr.sh CITest/$TCase/samplecc/PTEMgr-$TCase.txt $TSTART >> $LogsDir/$TCase"_"$tCurr.log 2>&1 &
    cd $ScriptsDir
    ./test_robust.sh
    echo "[$0] kill node processes"
    kill -9 $(ps -a | grep node | awk '{print $1}')
else
    # others: test requires execution of pte_mgr.sh only
    cd $CIDir
    ccDir=`ls $TCase`
    echo "[$0] ccDir $ccDir"
    tCurr=`date +%m%d%H%M%S`
    for cc in $ccDir; do
        if [ $cc != "test_nl.sh" ] && [ $cc != "preconfig" ]; then
            echo "[$0] cc: $cc"
            cd $CIDir/$TCase/$cc
            ptemgr=`ls PTEMgr*txt`
            cd $PTEDir
            for pte in $ptemgr; do
                echo "*************** [$0] executing: ***************"
                echo "    ./pte_mgr.sh CITest/$TCase/$cc/$pte > $LogsDir/$TCase"_"$tCurr.log"
                echo "    ./pte_mgr.sh CITest/$TCase/$cc/$pte > $LogsDir/$TCase"_"$tCurr.log" > $LogsDir/$TCase"_"$tCurr.log
                sleep 20s
                ./pte_mgr.sh CITest/$TCase/$cc/$pte $TStart >> $LogsDir/$TCase"_"$tCurr.log 2>&1
            done
        fi
    done
    cd $PTEDir
fi


cd $ScriptsDir
echo "current dir: $PWD"
exit
