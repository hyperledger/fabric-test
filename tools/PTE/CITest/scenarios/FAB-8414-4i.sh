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
cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts
./test_driver.sh -n -m FAB-8414-4i -p -c samplejs -t FAB-8414-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-8414-4q*.log
#### execute testcase FAB-8414-4i: 4 threads invokes, golevelDB
./test_driver.sh -t FAB-8414-4i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-8414-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 -n $PREFIX -o $CWD -v
