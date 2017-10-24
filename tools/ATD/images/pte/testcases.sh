#!/bin/bash
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

set -e

echo "##########################"
echo "STARTING THE PTE CONTAINER"
echo "##########################"

export PATH=$PATH:/root/.nvm/versions/node/v6.11.4/bin

cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts

echo "##################"
echo "STARTING THE TESTS"
echo "##################"

./test_driver.sh -p -c $CHAINCODE -t $TESTCASE
while ps axg | grep -vw grep | grep -w "node ./pte-execRequest.js" > /dev/null; do sleep 120; done
