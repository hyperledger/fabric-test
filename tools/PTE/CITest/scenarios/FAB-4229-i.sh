#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########


#### Lauch network and execute testcase: FAB-4229-i-TLS
cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts
./test_driver.sh -n -m FAB-4229-i-TLS -p -c samplecc -t FAB-4229-i-TLS
