#!/bin/bash -x
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"
BAREBONESDIR="$FabricTestDir/regression/barebones"
BASICDIR="$FabricTestDir/regression/basicnetwork"

echo "========== System Test Barebones tests using PTE and operator tools..."
cd $BAREBONESDIR && ginkgo -v
StatusBarebones=$?

echo "======== Basic Test Suite using ginkgo and operator tools ========"
cd $BASICDIR && ginkgo -v
StatusBasicTestSuite=$?

if [ $StatusBarebones == 0 ] && [ $StatusBasicTestSuite == 0 ]; then
    echo "------> Tests in daily bucket completed"
else
    echo "------> Tests in daily bucket failed with above errors"
    exit 1
fi

# save barebones test result
tCurr=`date +%Y%m%d`
cp $FabricTestDir/regression/barebones/barebones-pteReport.log $DAILYDIR"/barebones-pteReport-"$tCurr".log"

