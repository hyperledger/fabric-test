#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"
cd $DAILYDIR

archiveLTE() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/LTE_Test_Logs $WORKSPACE/archives/LTE_Test_XML $WORKSPACE/archives/LTE_Test_Results/experiments/BenchmarkReadWriteTxs
    # copy all the output_Vary*.log files
    cp $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.log $WORKSPACE/archives/LTE_Test_Logs/
    # copy the results_ledger_lte.xml file
    cp $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.xml $WORKSPACE/archives/LTE_Test_XML/
    # copy the files of the ReadWriteTxs experiment: output_LTE.log and results.csv
    cp $GOPATH/src/github.com/hyperledger/fabric-test/tools/LTE/TestResults/experiments/BenchmarkReadWriteTxs/* $WORKSPACE/archives/LTE_Test_Results/experiments/BenchmarkReadWriteTxs/
fi
}

echo "======== Ledger component performance tests...========"
py.test -v --junitxml results_ledger_lte.xml ledger_lte.py && echo "------> LTE Tests completed."
archiveLTE
