#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
SMOKEDIR="$FabricTestDir/regression/smoke"
cd $SMOKEDIR

echo "======== Smoke Test Suite using ginkgo and operator tools ========"
cd $SMOKEDIR && ginkgo -v
StatusOperator=$?

if [ $StatusOperator == 0 ]; then
    echo "------> Smoke tests completed"
else
    echo "------> Smoke tests failed with above errors"
    exit 1
fi
