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
./test_driver.sh -n -m FAB-7647-1i -p -c samplecc -t FAB-7647-1q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-7647-1q*.log
#### execute testcase FAB-7647-1i: 1 thread invokes, golevelDB
./test_driver.sh -t FAB-7647-1i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-7647-1i -p peer0.org1.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v

#### execute testcase FAB-7647-1q: 1 thread queries, golevelDB
./test_driver.sh -t FAB-7647-1q
#### gather TPS from PTE log
grep Summary ../Logs/FAB-7647-1q*.log | grep "QUERY" >> $CWD/$PREFIX"_"FAB-7647-1i".log"
