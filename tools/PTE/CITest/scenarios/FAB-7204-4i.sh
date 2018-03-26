#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

CWD=$PWD

#### Launch network and synch-up ledger
cd ../scripts
./test_driver.sh -n -m FAB-7204-4i -p -c samplejs -t FAB-7204-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/FAB-7204-4q*.log
#### execute testcase FAB-7204-4i: 2 threads invokes, golevelDB
./test_driver.sh -t FAB-7204-4i
