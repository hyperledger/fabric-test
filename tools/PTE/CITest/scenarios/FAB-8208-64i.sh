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
./test_driver.sh -n -m FAB-8208-64i

cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE
./pte_driver.sh CITest/FAB-8208-64q/preconfig/channels/runCases-chan-create-TLS.txt
sleep 60
./pte_driver.sh CITest/FAB-8208-64q/preconfig/channels/runCases-chan-join-TLS.txt
sleep 60
./pte_driver.sh CITest/FAB-8208-64q/preconfig/samplecc/runCases-samplecc-install-TLS.txt
sleep 60
./pte_driver.sh CITest/FAB-8208-64q/preconfig/samplecc/runCases-samplecc-instantiate1-TLS.txt
sleep 60
./pte_driver.sh CITest/FAB-8208-64q/preconfig/samplecc/runCases-samplecc-instantiate5-TLS.txt
sleep 60

#### execute testcase FAB-8208-64q: 32 threads queries for ledger synch-up
cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts
./test_driver.sh -t FAB-8208-64q
rm -rf ../Logs/FAB-8208-64q_*
sleep 60

#### execute testcase FAB-8208-64i: 32 threads invokes
./test_driver.sh -t FAB-8208-64i
#### gather TPS from docker containers
./get_peerStats.sh -r FAB-8208-64i -p peer0.org1.example.com peer0.org5.example.com peer0.org9.example.com peer0.org13.example.com peer0.org17.example.com peer0.org21.example.com peer0.org25.example.com peer0.org29.example.com -n $PREFIX -o $CWD -v
