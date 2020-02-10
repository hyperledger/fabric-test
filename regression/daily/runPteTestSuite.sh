#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

FabricTestDir="$GOPATH/src/github.com/hyperledger/fabric-test"
DAILYDIR="$FabricTestDir/regression/daily"

echo "========== System Test Performance tests using PTE and NL tools..."
cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE

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

cd $DAILYDIR && GO111MODULE=on ginkgo -v
StatusPteNL=$?

if [ $StatusPteNL == 0 ]; then
    echo "------> PTE/NL tests completed"
else
    echo "------> PTE/NL tests failed with above errors"
    exit 1
fi
cp $FabricTestDir/tools/PTE/CITest/Logs/*.log $DAILYDIR
