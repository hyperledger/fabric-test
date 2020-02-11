#!/bin/bash -x
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"
BAREBONESDIR="$FabricTestDir/regression/barebones"

echo "========== System Test Barebones tests using PTE and operator tools..."
cd $BAREBONESDIR && ginkgo -v
StatusBarebones=$?

if [ $StatusBarebones == 0 ]; then
    echo "------> Barebones tests completed"
else
    echo "------> Barebones tests failed with above errors"
    exit 1
fi
# save barebones test result
tCurr=`date +%Y%m%d`
cp $FabricTestDir/regression/barebones/barebones-pteReport.log $DAILYDIR"/barebones-pteReport-"$tCurr".log"

