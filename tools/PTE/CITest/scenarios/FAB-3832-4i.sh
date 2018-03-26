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
./test_driver.sh -n -m FAB-3832-4i -p -c samplecc -t FAB-3834-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-3834-4q*.log
#### execute testcase FAB-3832-4i: 4 threads invokes, couchDB
./test_driver.sh -t FAB-3832-4i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-3832-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v

#### execute testcase FAB-3834-4q: 4 threads queries, couchDB
./test_driver.sh -t FAB-3834-4q
#### gather TPS from PTE log
grep Summary ../Logs/FAB-3834-4q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-3832-4i.log"

