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

#### execute testcase FAB-8696-4q: 1M (4x250000) 4-field indexing rich queries
./test_driver.sh -t FAB-8696-4q
