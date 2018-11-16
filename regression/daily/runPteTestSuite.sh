#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"

echo "========== System Test Performance tests using PTE and NL tools..."
cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE

archivePTE() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/PTE_Test_Logs
    cp $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/Logs/*.log $WORKSPACE/archives/PTE_Test_Logs/
    mkdir -p $WORKSPACE/archives/PTE_Test_XML
    cp $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.xml $WORKSPACE/archives/PTE_Test_XML/
fi
}

npm install
  if [ $? != 0 ]; then
     echo "------> Failed to install npm. Cannot run pte test suite."
     exit 1
  else
     echo "------> Successfully installed npm."
  fi

cd $DAILYDIR && py.test -v --junitxml results_systest_pte.xml systest_pte.py && echo "------> PTE tests completed"
archivePTE
