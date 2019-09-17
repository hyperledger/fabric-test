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
# first parameter is the PTEReport file and second one is the summary results log file
echo ""
echo "node get_pteReport.js $1"
  node get_pteReport.js $1
cat $1 >> $2
}

CWD=$PWD
pteReport="../../pteReport.txt"

cd ../scripts

#Prerequisite: This chaincode requires packages not provided by the Go standard library and hence needs vendoring
CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
cd $FabricTestDir
make pre-setup
cd chaincodes/sbe
govendor init
govendor add +external
cd ../../tools/PTE/CITest/scripts

#### Launch network
./test_driver.sh -n -m FAB-11615-2i -p -c sbe_cc &> ../Logs/FAB-11614-precfg.log

#### first set of invokes to create the keys
removePteReport
./test_driver.sh -t FAB-11615-2i
calcTPS $pteReport "../Logs/FAB-11615-2iSBE-PTEReport-createKeys.log"

#### change EP of all the keys
removePteReport
./test_driver.sh -t FAB-11614-2iSBE
calcTPS $pteReport "../Logs/FAB-11614-2iSBE-PTEReport-setSBEPoliciesOnHalfOfAllKeys.log"

#### invokes to update the values of the keys
removePteReport
./test_driver.sh -t FAB-11615-2i
calcTPS $pteReport "../Logs/FAB-11615-2iSBE-pteReport.log"
