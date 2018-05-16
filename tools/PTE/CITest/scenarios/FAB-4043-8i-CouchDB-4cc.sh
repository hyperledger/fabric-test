#!/bin/bash

#
# Copyright Hitachi America. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

CWD=$PWD
PREFIX="result"   # result log prefix

cd ../scripts

#### Launch network and synch-up ledger
./test_driver.sh -n -m FAB-4043-8i-CouchDB-4cc -p -c all -t FAB-3810-2q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-3810-2q*.log
#### execute testcase FAB-4043-8i-CouchDB-4cc: 8 threads invokes, CouchDB, 4 chaincodes
./test_driver.sh -t FAB-4043-8i-CouchDB-4cc
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-4043-8i-CouchDB-4cc -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v
