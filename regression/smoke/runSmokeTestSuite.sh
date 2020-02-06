#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
SMOKEDIR="$FabricTestDir/regression/smoke"
cd $SMOKEDIR

cd $FabricTestDir/tools/PTE
if [ ! -d "node_modules" ];then
    npm config set prefix ~/npm
    npm install
    if [ $? != 0 ]; then
        echo "FAILED: Failed to install npm. Cannot run pte test suite."
        # Don't exit.. Continue with tests, to show the PTE failure results
    else
        echo "Successfully installed npm."
    fi
fi

echo "======== Smoke Test Suite using ginkgo and operator tools ========"
cd $SMOKEDIR && ginkgo -v
StatusOperator=$?

if [ $StatusOperator == 0 ]; then
    echo "------> Smoke tests completed"
else
    echo "------> Smoke tests failed with above errors"
    exit 1
fi
