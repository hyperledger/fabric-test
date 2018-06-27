#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########
#### execute testcase FAB-10191-4i: 4 threads invokes, golevelDB

CWD=$PWD
PREFIX="result"   # result log prefix

#### Launch network and synch-up ledger
cd ../scripts
./test_driver.sh -n -m FAB-10191-4i -p -c samplejs -t FAB-10190-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-10190-4q*.log

#### execute testcase FAB-10191-4i and getStats sequentially in background
(nohup ./test_driver.sh -t FAB-10191-4i ; nohup ./get_peerStats.sh -r FAB-10191-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 -n $PREFIX -o $CWD -v ) &

# wait 3 min for transactions to start
sleep 180

#### restart devices one at a time
./test_chaos.sh -o 3 -g 2 -p 2 -k 4 -z 3

cd $CWD
