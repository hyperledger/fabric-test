#!/bin/bash
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

set -e

echo "##########################"
echo "STARTING THE PTE CONTAINER"
echo "##########################"
PREFIX="result"
cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts
CWD=$PWD/../Logs
echo "##################"
echo "STARTING THE TESTS"
echo "##################"
./test_driver.sh -m $TESTCASE -p -c $CHAINCODE -t $TESTCASE_QUERY
rm -f ../Logs/${TESTCASE_QUERY}*.log

./test_driver.sh -t $TESTCASE

while ps axg | grep -vw grep | grep -w "node ./pte-execRequest.js" > /dev/null; do sleep 120; done
./get_peerStats.sh -r $TESTCASE -p $PEER1 $PEER2 $PEER3 $PEER4 -c $CHANNEL1 $CHANNEL2 $CHANNEL3 $CHANNEL4 $CHANNEL5 $CHANNEL6 $CHANNEL7 $CHANNEL8 -n $PREFIX -o $CWD -v

./test_driver.sh -t $TESTCASE_QUERY
while ps axg | grep -vw grep | grep -w "node ./pte-execRequest.js" > /dev/null; do sleep 120; done
#### gather TPS from PTE log
grep Summary ../Logs/$TESTCASE_QUERY*.log | grep "QUERY" >> $CWD/$PREFIX"_$TESTCASE.log"
