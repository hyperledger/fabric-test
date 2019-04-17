#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Requirements:
# The script assumes that a network with 3 org and 1 peer per org is operational, 27 channel are created and peers are joined, a chaincode
# is installed and instantiated.  The corresponding PTE service credential json is placed in a directory under PTE.  The default directory
# is PTEScaleTest-SC. If the user chooses not to use the default directory, then he needs to change mySCDir below to the name of the
# directory.  The script only executes 18 threads traffic on 9 channels.  To complete the test, three (3) remote hosts are needed.
# The value of chan0 needs to be set to 10 and 19 in the 2nd and 3rd host respectively in order to execute 18 threads of traffic on the
# sencond set of 9 channels on host 2 and the third set of 9 channels on host 3. Script runRemoteScenarios.sh can be used to execute this
# script on mutiple remote hosts.  The usage of runRemoteScenarios.sh is given in PTE/CITest/README.

# testcase: FAB-14269: stability of RAFT networj with 27 orderers
# vLaunch: 3
# channels: 1
# org: 3
# thread: 54 (18 thread per org per vLaunch)
# tx 10,000 per thread (total 540,000 tx)
# traffic mode: Constant

#cd ~/gopath/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/scenarios

# source PTE CI utils
source PTECIutils.sh

myTESTCASE="FAB-14269"
mySCDir="PTEScaleTest-SC"

myCC="samplecc"
myTXMODE="Constant"
myNORG=2

myNREQ=10000

chan0=1
myMinChan=9
myMaxChan=9
myChanIncr=1
myMinTh=1
myMaxTh=1
myThIncr=1
myFreq=810

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
optString="--testcase $myTESTCASE --scdir $mySCDir -a $myCC --chan0 $chan0 --norg $myNORG --nreq $myNREQ --txmode $myTXMODE --freq $myFreq -i"
echo "[$myTESTCASE] optString=$optString"
PTEExecLoop $myMinChan $myMaxChan $myChanIncr $myMinTh $myMaxTh $myThIncr $myKey0 $myKeyIncr "${optString[@]}"
