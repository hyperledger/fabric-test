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
echo "" >& ../Logs/FAB-10134-4i-precfg.log

echo "Starting Tests"

#### Launch network
./test_driver.sh -n -m FAB-10134-4i -p -c marbles02_private >& ../Logs/FAB-10134-4i-precfg.log
#### synch-up ledger
./test_driver.sh -t marbles02_private-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/marbles02_private-4q*.log
#### execute testcase FAB-10134-4i: 4 threads invokes: initMarble, couchDB
./test_driver.sh -t FAB-10134-4i
#### execute testcase FAB-10134-4q: 4 threads queries 
./test_driver.sh -t FAB-10134-4q
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-10134-4i -p peer0.org1.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v
