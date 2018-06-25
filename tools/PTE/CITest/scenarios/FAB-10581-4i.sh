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

#### Launch network and synch-up ledger
./test_driver.sh -n -m FAB-10581-4i -p -c samplecc

#### execute testcase FAB-10581-4i: 4 thread service discovery
./test_driver.sh -t FAB-10581-4i

