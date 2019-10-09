#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
SMOKEDIR="$FabricTestDir/regression/smoke"
cd $SMOKEDIR

echo "======== Ledger component performance tests using LTE ========"
py.test -v --junitxml results_ledger_lte_smoke.xml ledger_lte_smoke.py

echo "======== Performance Test using PTE and NL tools ========"
cd $FabricTestDir/tools/PTE
npm config set prefix ~/npm
npm install
if [ $? != 0 ]; then
    echo "FAILED: Failed to install npm. Cannot run pte test suite."
    # Don't exit.. Continue with tests, to show the PTE failure results
else
    echo "Successfully installed npm."
fi
cd $SMOKEDIR && py.test -v --junitxml results_systest_pte.xml systest_pte.py
