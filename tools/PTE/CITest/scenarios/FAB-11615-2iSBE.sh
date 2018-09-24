#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

removePteReport () {
  if [ -e $pteReport ]; then
    echo "remove $pteReport"
    rm -f $pteReport
  fi
}

calcTPS () {
# calculate overall TPS
echo ""
echo "node get_pteReport.js $1"
  node get_pteReport.js $1
cat $1 >> $2
}

CWD=$PWD
pteReport="../../pteReport.txt"

cd ../scripts

#Prerequisite: This chaincode requires packages not provided by the Go standard library and hence needs vendoring
cd $GOPATH/src/github.com/hyperledger/fabric-test
make pre-setup
cd chaincodes/sbe
govendor init
govendor add +external

#### Launch network
./test_driver.sh -n -m FAB-11615-2i -p -c sbe_cc >& ../Logs/FAB-11615-precfg.log

#### first set of invokes to create the keys
removePteReport
./test_driver.sh -t FAB-11615-2i
calcTPS $pteReport "../Logs/FAB-11615-2iSBE-PTEReport-createKeys.log"

#### change EP of all the keys
removePteReport
./test_driver.sh -t FAB-11615-2iSBE
calcTPS $pteReport "../Logs/FAB-11615-2iSBE-PTEReport-setSBEPoliciesOnAllKeys.log"

#### invokes to update the values of the keys
removePteReport
./test_driver.sh -t FAB-11615-2i
calcTPS $pteReport "../Logs/FAB-11615-2iSBE-pteReport.log"
