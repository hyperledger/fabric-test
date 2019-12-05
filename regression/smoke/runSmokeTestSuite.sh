#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
SMOKEDIR="$FabricTestDir/regression/smoke"
cd $SMOKEDIR

# echo "======== Ledger component performance tests using LTE ========"
# py.test -v --junitxml results_ledger_lte_smoke.xml ledger_lte_smoke.py

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
# cd $SMOKEDIR && py.test -v --junitxml results_systest_pte.xml systest_pte.py

echo "======== Smoke Test Suite using ginkgo and operator tools ========"
cd $SMOKEDIR && ginkgo -v
StatusOperator=$(echo $?)

echo "======== Performance Test using PTE and NL tools ========"
cd $SMOKEDIR/../daily && ginkgo --focus test_FAB7929_8i
StatusPteNL=$(echo $?)

if [ $StatusOperator == 0 ] && [ $StatusPteNL == 0 ]; then
    echo "------> Smoke tests completed"
else
    exit 1
fi

