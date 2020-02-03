#!/bin/bash -x
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"
BAREBONESDIR="$FabricTestDir/regression/barebones"

echo "========== System Test Performance tests using PTE and NL tools..."
cd $FabricTestDir/tools/PTE
if [ ! -d "node_modules" ];then
    npm config set prefix ~/npm
    npm install
    if [ $? != 0 ]; then
        echo "FAILED: Failed to install npm. Cannot run pte test suite."
        exit 1
    else
        echo "Successfully installed npm."
    fi
fi

cd $DAILYDIR && ginkgo -v
StatusPteNL=$?

if [ $StatusPteNL == 0 ]; then
    echo "------> PTE/NL tests completed"
else
    echo "------> PTE/NL tests failed with above errors"
fi
cp $FabricTestDir/tools/PTE/CITest/Logs/*.log $DAILYDIR

echo "========== System Test Barebones tests using PTE and operator tools..."
cd $BAREBONESDIR && ginkgo -v
StatusBarebones=$?

if [ $StatusBarebones == 0 ]; then
    echo "------> Barebones tests completed"
else
    echo "------> Barebones tests failed with above errors"
fi
# save barebones test result
tCurr=`date +%Y%m%d`
cp $FabricTestDir/regression/barebones/barebones-pteReport.log $DAILYDIR"/barebones-pteReport-"$tCurr".log"

