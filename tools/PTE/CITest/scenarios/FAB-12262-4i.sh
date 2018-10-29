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

#### Launch network and synch-up ledger
./test_driver.sh -n -m FAB-12262-4i -p -c marbles02 -t marbles02-4q

./test_driver.sh -m FAB-12262-4i -c marbles02_private -t marbles02_private-4q

#### remove PTE log from synch-up ledger run
rm -f ../Logs/marbles02-4q*.log


#### execute testcase FAB-12262-4i: 4 threads invokes: initMarble, couchDB
./test_driver.sh -t FAB-12262-4i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-12262-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v

#### execute testcase FAB-12262-4q: 4 threads queries: readMarble, couchDB
./test_driver.sh -t FAB-12262-4q
#### gather TPS from PTE log
echo "" >> $CWD/$PREFIX"_FAB-12262-4i.log"
echo "FAB-12262-4q: 4 threads queries: readMarble, couchDB" >> $CWD/$PREFIX"_FAB-12262-4i.log"
grep Summary ../Logs/FAB-12262-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-12262-4i.log"

#### execute testcase FAB-12262-sidedb-4i: 4 threads invokes: initMarble_private, couchDB
./test_driver.sh -t FAB-12262-sidedb-4i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-12262-sidedb-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel2 -n $PREFIX -o $CWD -v

#### execute testcase FAB-12262-4q: 4 threads private queries: readMarble_private, couchDB
./test_driver.sh -t FAB-12262-sidedb-4q
#### gather TPS from PTE log
echo "" >> $CWD/$PREFIX"_FAB-12262-4i.log"
echo "FAB-12262-sidedb-4q: 4 threads private queries: queryMarbles_private, couchDB" >> $CWD/$PREFIX"_FAB-12262-sidedb-4i.log"
grep Summary ../Logs/FAB-12262-sidedb-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-12262-sidedb-4i.log"
