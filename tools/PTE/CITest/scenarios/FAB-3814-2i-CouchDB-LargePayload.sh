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
./test_driver.sh -n -m FAB-3814-2i-CouchDB-LargePayload -p -c samplecc -t FAB-3810-2q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-3810-2q*.log
#### execute testcase FAB-3814-2i-CouchDB-LargePayload: 2 threads invokes, CouchDB, Large payload
./test_driver.sh -t FAB-3814-2i-CouchDB-LargePayload
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-3814-2i-CouchDB-LargePayload -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 -n $PREFIX -o $CWD -v
