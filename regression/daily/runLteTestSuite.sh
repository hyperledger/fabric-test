#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"
cd $DAILYDIR

archiveLTE() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    df -h
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/LTE_Test_Logs $WORKSPACE/archives/LTE_Test_XML $WORKSPACE/archives/LTE_Test_Results/experiments/BenchmarkReadWriteTxs
    # copy all the output_Vary*.log files
    tar cvf $WORKSPACE/archives/LTE_Test_Logs/daily.zip $FabricTestDir/regression/daily/*.log
    # copy the results_ledger_lte.xml file
    cp $FabricTestDir/regression/daily/*.xml $WORKSPACE/archives/LTE_Test_XML/
    # copy the files of the ReadWriteTxs experiment: output_LTE.log and results.csv
    cp $FabricTestDir/tools/LTE/TestResults/experiments/BenchmarkReadWriteTxs/* $WORKSPACE/archives/LTE_Test_Results/experiments/BenchmarkReadWriteTxs/
fi
}

echo "======== Ledger component performance tests...========"
py.test -v --junitxml results_ledger_lte.xml ledger_lte.py && echo "------> LTE Tests completed."
archiveLTE
