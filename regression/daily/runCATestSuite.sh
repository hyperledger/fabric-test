#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"
cd $DAILYDIR

archiveCA() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/CA_Test_Logs
    cp -r $GOPATH/src/github.com/hyperledger/fabric-test/fabric-samples/fabric-ca/data/logs/*.log $WORKSPACE/archives/CA_Test_Logs/
    mkdir -p $WORKSPACE/archives/CA_Test_XML
    cp -r $GOPATH/src/github.com/hyperledger/fabric-test/regression/daily/*.xml $WORKSPACE/archives/CA_Test_XML/
fi
}

echo "======== Fabric-CA ACL smoke test... ========"
echo "No longer in the fabric-samples repo - Skipping..."
#py.test -v --junitxml results_acl.xml acl_happy_path.py && echo "------> Fabric-CA ACL smoke-test completed."

echo "======== Fabric-CA tests...========"
py.test -v --junitxml results_fabric-ca_tests.xml ca_tests.py && echo "------> Fabric-CA tests completed."
archiveCA
