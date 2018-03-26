#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

CWD=$PWD
PREFIX="result"   # result log prefix

#### Launch network and synch-up ledger
cd ../scripts
./test_driver.sh -n -m FAB-4038-2i -p -c samplejs -t FAB-4036-2q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-4036-2q*.log
#### execute testcase FAB-4038-2i: 2 threads invokes, golevelDB
./test_driver.sh -t FAB-4038-2i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-4038-2i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v

#### execute testcase FAB-4036-2q: 2 threads queries, golevelDB
./test_driver.sh -t FAB-4036-2q
#### gather TPS from PTE log
grep Summary ../Logs/FAB-4036-2q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-4038-2i.log"

