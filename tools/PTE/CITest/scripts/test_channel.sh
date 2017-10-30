#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test
SDKDir=$FabricTestDir/fabric-sdk-node

PrecfgDir=$1
echo "[$0] PrecfgDir: $PrecfgDir"
# PTE: create/join channels
CWD=$PWD

cd $SDKDir/test/PTE

echo "[$0] create channel"
echo " ./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-create-TLS.txt"
./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-create-TLS.txt
#./pte_driver.sh CITest/preconfig/channels/runCases-chan-create-TLS.txt
sleep 60s

echo "[$0] join channel"
echo " ./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-join-TLS.txt"
./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-join-TLS.txt
#./pte_driver.sh CITest/preconfig/channels/runCases-chan-join-TLS.txt
sleep 20s


cd $CWD
echo "[$0] current dir: $PWD"
