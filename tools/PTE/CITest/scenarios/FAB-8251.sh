#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########
CWD=$PWD
PREFIX="result"   # result log prefix

cd ../scripts

#### Launch network
./test_driver.sh -n -m FAB-9575-4i -p -c marbles02 >& ../Logs/FAB-8251-4i-precfg.log

#### synch-up ledger
./test_driver.sh -t marbles02-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/marbles02-4q*.log

#### prerequisite: testcase FAB-8694-4i: 1M (4x250000) invokes: initMarble, couchDB
./test_driver.sh -t FAB-8694-4i

#### Put the new index file in the chaincode installation folder (delete first if same-named file exists)
indexDir="../../../../fabric/examples/chaincode/go/marbles02/META-INF/statedb/couchdb/indexes"
indexFile="index2nd.json"
[ -e $indexDir/$indexFile ] && rm $indexDir/$indexFile
cp ../FAB-8251/indexes/index2nd.json $indexDir/$indexFile

#### install and upgrade cc
./test_driver.sh -m FAB-8251/upgrade  -u marbles02 >& ../Logs/FAB-8251-4i-precfg.log &

#### execute testcase FAB-9575-4i: 1M (4x250000) invokes and 2M (4x500000) queries simultaneously
./test_driver.sh -t FAB-9575-4i
./get_peerStats.sh -r FAB-9575-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 -n $PREFIX -o $CWD -v
