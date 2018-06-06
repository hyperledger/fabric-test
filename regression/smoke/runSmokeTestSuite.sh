#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

SMOKEDIR="$GOPATH/src/github.com/hyperledger/fabric-test/regression/smoke"
cd $SMOKEDIR

echo "======== Behave feature and system tests... ========"
cd ../../feature
behave --junit --junit-directory ../regression/smoke/. --tags=-skip --tags=smoke -k -D logs=y
cd -

echo "======== Performance Test using PTE and NL tools...========"
cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE
npm config set prefix ~/npm
npm install
  if [ $? != 0 ]; then
     echo "FAILED: Failed to install npm. Cannot run pte test suite."
     # Don't exit.. Continue to test PTE to show the PTE failure result"
  else
     echo "Successfully installed npm."
  fi
cd $SMOKEDIR && py.test -v --junitxml results_systest_pte.xml systest_pte.py

echo "======== Orderer component test using OTE and NL tools... ========"
py.test -v --junitxml results_orderer_ote.xml orderer_ote.py
