#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

SMOKEDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/smoke"

echo "========== Behave feature and system tests..."
cd ../../feature
behave --junit --junit-directory ../regression/smoke/. --tags=-skip --tags=smoke -k -D logs=y
cd -

echo "========== System Test using PTE and NL tools..."
py.test -v --junitxml results_systest_pte.xml systest_pte.py

#echo "========== Orderer component test using OTE and NL tools..."
#py.test -v --junitxml results_orderer_ote.xml orderer_ote.py

