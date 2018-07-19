#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


######################################################################
### Run one group of the tests in weekly test suite.

WEEKLYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/weekly"
cd $WEEKLYDIR

echo "========== System Test Performance tests using PTE and NL tools..."
cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE
npm install
  if [ $? != 0 ]; then
     echo "------> Failed to install npm. Cannot run pte test suite."
     exit 1
  else
     echo "------> Successfully installed npm."
  fi

echo "========== Performance PTE 12Hr test"
cd $WEEKLYDIR && py.test -v --junitxml results_TimedRun_12Hr.xml 12HrTest.py -k TimedRun_12Hr
