#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"
cd $DAILYDIR

archiveCA() {
if [ ! -z $GERRIT_BRANCH ] && [ ! -z $WORKSPACE ]; then
# GERRIT_BRANCH is a Jenkins parameter and WORKSPACE is a Jenkins directory.This function is used only when the test is run in Jenkins to archive the log files.
    echo "------> Archiving generated logs"
    rm -rf $WORKSPACE/archives
    mkdir -p $WORKSPACE/archives/CA_Test_XML
    cp -r $FabricTestDir/regression/daily/*.xml $WORKSPACE/archives/CA_Test_XML/
fi
}

# The basic scripts in fabric-samples/fabric-ca/ that had been executed as our "ACL Happy Path" test
# have been removed. For more on ACL test coverage, explore the fabric-ca/ tests or other examples in
# fabric-samples/ such as fabcar, or refer to fabric-test/feature/fabric-ca.feature
# "Scenario Outline: FAB-6489: Interoperability Test".

echo "======== Fabric-CA tests...========"
py.test -v --junitxml results_fabric-ca_tests.xml ca_tests.py && echo "------> Fabric-CA tests completed."
archiveCA
