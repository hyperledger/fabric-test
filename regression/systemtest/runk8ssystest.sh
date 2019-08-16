#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

cd "$GOPATH/src/github.com/hyperledger/fabric-test/regression/systemtest"

echo "======== System Tests on k8s cluster... ========"
py.test -v --junitxml results_systest_pte.xml sysTestSuite_pte.py && echo "------> System tests completed"
cd -

