#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-13703
# channels: 3
# org: 1
# thread: 1 (1 per org)
# tx 10,000 per thread
# traffic mode: Latency

# source PTE CI utils
source PTECIutils.sh

myTESTCASE="FAB-13703"
myCPDir="PTEScaleTest-CP"

myCC="samplecc"
myTXMODE="Latency"
myNORG=1

myNREQ=10000

myMinChan=3
myMaxChan=3
myChanIncr=1
myMinTh=1
myMaxTh=1
myThIncr=1

myKey0=0
myKeyIncr=$myNREQ

CWD=$PWD

# remove existing PTE report
CIpteReport=$LOGDir/$myTESTCASE"-pteReport.log"
echo "CIpteReport=$CIpteReport"

if [ -e $CIpteReport ]; then
    rm -f $CIpteReport
fi

# execute PTE
optString="--testcase $myTESTCASE --cpdir $myCPDir -a $myCC --norg $myNORG --nreq $myNREQ --txmode $myTXMODE -i"
echo "[$myTESTCASE] optString=$optString"
PTEExecLoop $myMinChan $myMaxChan $myChanIncr $myMinTh $myMaxTh $myThIncr $myKey0 $myKeyIncr "${optString[@]}"

exit 0
