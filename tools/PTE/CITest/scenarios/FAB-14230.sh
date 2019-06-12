#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Requirements:
# The script assumes that a network with 3 org and 1 peer per org is operational, a channel is created and peers are joined, a chaincode
# is installed and instantiated.  The corresponding PTE connection profile is placed in a directory under PTE.  The default directory
# is PTEScaleTest-CP. If the user chooses not to use the default directory, then he needs to change myCPDir below to the name of the
# directory.  The script only executes 1 set of traffic from one host.  To complete FAB-14230, just rerun this multiple times with a
# network configured with different number of orderers (3, 9, 27, 54, 108).

# testcase: FAB-14230: scaling traffic runs on networks with more orderers (3, 9, 27, 54, 108) in a channel
# channels: 1
# org: 3
# thread: 54 (18 thread per org)
# tx 10,000 per thread (total 540,000 tx)
# traffic mode: Constant

#cd ~/gopath/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/scenarios

# source PTE CI utils
source PTECIutils.sh

myTESTCASE="FAB-14230"
myCPDir="PTEScaleTest-CP"

myCC="samplecc"
myTXMODE="Constant"
myNORG=3

myNREQ=10000

myMinChan=1
myMaxChan=1
myChanIncr=1
myMinTh=18
myMaxTh=18
myThIncr=1
myFreq=0

myKey0=10000
myKeyIncr=$myNREQ

CWD=$PWD

# remove existing PTE report
CIpteReport=$LOGDir/$myTESTCASE"-pteReport.log"
echo "CIpteReport=$CIpteReport"

if [ -e $CIpteReport ]; then
    rm -f $CIpteReport
fi

# execute PTE
optString="--testcase $myTESTCASE --cpdir $myCPDir -a $myCC --norg $myNORG --nreq $myNREQ --txmode $myTXMODE --freq $myFreq -i"
echo "[$myTESTCASE] optString=$optString"
PTEExecLoop $myMinChan $myMaxChan $myChanIncr $myMinTh $myMaxTh $myThIncr $myKey0 $myKeyIncr "${optString[@]}"
