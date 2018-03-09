#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

CWD=$PWD
PREFIX="result"   # result log prefix

cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts

#### Launch network, install chaincode with index and synch-up ledger
./test_driver.sh -n -m FAB-6813-4i -p -c marbles02 -t marbles02-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/marbles02-4q*.log
#### execute testcase FAB-6813-4i: 4 threads invokes: initMarble, couchDB
./test_driver.sh -t FAB-6813-4i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-6813-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 -n $PREFIX -o $CWD -v

#### execute testcase FAB-8199-4q: 4 threads queries: readMarble, couchDB
./test_driver.sh -t FAB-8199-4q
#### gather TPS from PTE log
echo "" >> $CWD/$PREFIX"_FAB-6813-4i.log"
echo "FAB-8201-4q: 4 threads queries: readMarble, couchDB" >> $CWD/$PREFIX"_FAB-6813-4i.log"
grep Summary ../Logs/FAB-8199-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-6813-4i.log"

#### execute testcase FAB-8200-4q: 4 threads rich queries: queryMarblesByOwner, couchDB
./test_driver.sh -t FAB-8200-4q
#### gather TPS from PTE log
echo "" >> $CWD/$PREFIX"_FAB-6813-4i.log"
echo "FAB-8201-4q: 4 threads rich queries: queryMarblesByOwner, couchDB" >> $CWD/$PREFIX"_FAB-6813-4i.log"
grep Summary ../Logs/FAB-8200-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-6813-4i.log"

#### execute testcase FAB-8201-4q: 4 threads rich queries: queryMarbles, couchDB
./test_driver.sh -t FAB-8201-4q
#### gather TPS from PTE log
echo "" >> $CWD/$PREFIX"_FAB-6813-4i.log"
echo "FAB-8201-4q: 4 threads rich queries: queryMarbles, couchDB" >> $CWD/$PREFIX"_FAB-6813-4i.log"
grep Summary ../Logs/FAB-8201-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-6813-4i.log"
