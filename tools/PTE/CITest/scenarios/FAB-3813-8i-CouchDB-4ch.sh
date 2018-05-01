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
./test_driver.sh -n -m FAB-3813-8i-CouchDB-4ch -p -c samplecc -t FAB-3810-2q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-3810-2q*.log
#### execute testcase FAB-3813-8i-CouchDB-4ch: 4 threads invokes, CouchDB
./test_driver.sh -t FAB-3813-8i-CouchDB-4ch
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-3813-8i-CouchDB-4ch -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 testorgschannel3 testorgschannel4 -n $PREFIX -o $CWD -v
