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
./test_driver.sh -n -m FAB-7627-16i -p -c samplecc -t FAB-7627-16q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-7627-16q*.log
#### execute testcase FAB-7627-16i: 4 threads invokes, golevelDB
./test_driver.sh -t FAB-7627-16i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-7627-16i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 testorgschannel3 testorgschannel4 testorgschannel5 testorgschannel6 testorgschannel7 testorgschannel8 -n $PREFIX -o $CWD -v

#### execute testcase FAB-7627-16q: 16 threads queries, golevelDB
./test_driver.sh -t FAB-7627-16q
#### gather TPS from PTE log
grep Summary ../Logs/FAB-7627-16q*.log | grep "QUERY" >> $CWD/$PREFIX"_FAB-7627-16i.log"
