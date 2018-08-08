#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

DAILYDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/daily"
cd $DAILYDIR

echo "======== Fabric-CA ACL smoke test... ========"
py.test -v --junitxml results_acl.xml acl_happy_path.py

echo "======== Fabric-CA tests...========"
py.test -v --junitxml results_fabric-ca_tests.xml ca_tests.py
