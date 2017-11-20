#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

CWD=$PWD
PREFIX="result"   # result log prefix

cd ~/gopath/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts

#### Lauch network and execute testcase
#### FAB-3807-4i: 4 invokes, golevelDB
./test_driver.sh -n -m FAB-3807-4i -p -c samplecc -t FAB-3835-4q
rm -f ../Logs/FAB-3835-4q*.log
./test_driver.sh -t FAB-3807-4i
./get_peerStats.sh -r FAB-3807-4i -p peer0.org1.example.com peer0.org2.example.com -n $PREFIX -o $CWD -v

#### execute testcase
#### FAB-3835-4q: 4 queries, golevelDB
./test_driver.sh -t FAB-3835-4q
grep Summary ../Logs/FAB-3835-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-3807-4i.log"
