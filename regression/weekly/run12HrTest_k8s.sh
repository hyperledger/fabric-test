#!/bin/bash -e
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


######################################################################
### Run one group of the tests in weekly test suite in k8s

WEEKLYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/weekly"

echo "========== Performance PTE 12Hr test"
cd $WEEKLYDIR && py.test -v --junitxml results_TimedRun_12hr_k8s.xml 12HrTest_k8s.py
