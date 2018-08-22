#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"
cd $DAILYDIR

archiveOTE() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/OTE_Test_Logs
    cp -r $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/ote_logs/*.log $WORKSPACE/archives/OTE_Test_Logs/
    mkdir -p $WORKSPACE/archives/OTE_Test_XML
    cp -r $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.xml $WORKSPACE/archives/OTE_Test_XML/
fi
}
echo "======== Orderer Performance tests...========"
py.test -v --junitxml results_orderer_ote.xml orderer_ote.py && echo "------> OTE Tests completed"
archiveOTE
