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
./test_driver.sh -n -m FAB-3833-2i -p -c samplecc -t FAB-3810-2q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-3810-2q*.log
#### execute testcase FAB-3833-2i: 2 threads invokes, couchDB
./test_driver.sh -t FAB-3833-2i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-3833-2i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v

#### execute testcase FAB-3810-2q: 2 threads queries, couchDB
./test_driver.sh -t FAB-3810-2q
#### gather TPS from PTE log
grep Summary ../Logs/FAB-3810-2q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-3833-2i.log"

