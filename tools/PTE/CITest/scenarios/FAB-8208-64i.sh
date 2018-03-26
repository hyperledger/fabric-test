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
./test_driver.sh -n -m FAB-8208-64i -p -c samplecc -t FAB-8208-64q

rm -rf ../Logs/FAB-8208-64q_*
sleep 60

#### execute testcase FAB-8208-64i: 32 threads invokes
./test_driver.sh -t FAB-8208-64i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-8208-64i -p peer0.org1.example.com peer0.org5.example.com peer0.org9.example.com peer0.org13.example.com peer0.org17.example.com peer0.org21.example.com peer0.org25.example.com peer0.org29.example.com -n $PREFIX -o $CWD -v
