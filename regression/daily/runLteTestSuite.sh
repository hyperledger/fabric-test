#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"
cd $DAILYDIR

echo "======== Ledger component performance tests...========"
py.test -v --junitxml results_ledger_lte.xml ledger_lte.py
