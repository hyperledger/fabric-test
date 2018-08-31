#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"
cd $DAILYDIR

archiveSVT() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/Daily_Test_Logs
    mkdir -p $WORKSPACE/archives/Daily_Test_XML
    cp $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.xml $WORKSPACE/archives/Daily_Test_XML/
    cp $GOPATH/src/github.com/hyperledger/fabric-test/feature/*.log $WORKSPACE/archives/Daily_Test_Logs/
    cp $GOPATH/src/github.com/hyperledger/fabric-test/fabric-samples/fabric-ca/data/logs/*.log $WORKSPACE/archives/Daily_Test_Logs/
    cp $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.log $WORKSPACE/archives/Daily_Test_Logs/
    cp $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/ote_logs/*.log $WORKSPACE/archives/Daily_Test_Logs/
fi
}

echo "======== Behave feature and system tests...========"
cd ../../feature
behave --junit --junit-directory ../regression/daily/. --tags=-skip --tags=daily -k -D logs=y
cd $DAILYDIR

echo "======== Ledger component performance tests...========"
py.test -v --junitxml results_ledger_lte.xml ledger_lte.py

# the auction_daily test is disabled until the CI issue is fixed
#echo "------------> Test Auction Chaincode ..."
#py.test -v --junitxml results_auction_daily.xml testAuctionChaincode.py

echo "======== Fabric-CA ACL smoke test... ========"
py.test -v --junitxml results_acl.xml acl_happy_path.py

echo "======== Fabric-CA tests...========"
py.test -v --junitxml results_fabric-ca_tests.xml ca_tests.py

echo "======== Orderer Performance tests...========"
py.test -v --junitxml results_orderer_ote.xml orderer_ote.py
echo "------> SVT tests completed"
archiveSVT
