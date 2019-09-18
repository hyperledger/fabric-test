#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"
cd $DAILYDIR
archiveBehave() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/Behave_Test_Logs
    cp -r $FabricTestDir/feature/*.log $WORKSPACE/archives/Behave_Test_Logs/
    mkdir -p $WORKSPACE/archives/Behave_Test_XML
    cp -r $FabricTestDir/regression/daily/*.xml $WORKSPACE/archives/Behave_Test_XML/
fi
}

echo "======== Behave feature and system tests...========"
echo "======== Tests are running and the results are being redirected to a log file ========"
echo "======== You can check the progress in workspace/gopath/src/github.com/hyperledger/fabric-test/feature/behave_tests.log ========"
cd ../../feature
behave --junit --junit-directory ../regression/daily/. --tags=-skip --tags=daily -k -D logs=y &> behave_tests.log && echo "------> Behave feature tests completed."
archiveBehave
