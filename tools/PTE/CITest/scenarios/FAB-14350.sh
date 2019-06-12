#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Requirements:
# The script assumes that a network with 3 org and 1 peer per org is operational, 500 channels are created and peers are joined, a chaincode
# is installed and instantiated.  The corresponding PTE connection profile is placed in a directory under PTE.  The default directory is
# PTEScaleTest-CP. If the user chooses not to use the default directory, then he needs to change myCPDir below to the name of the directory.
# The script only executes traffic on first 100 channels.  To complete the test, five remote hosts are needed to execute traffic on all 500
# channels.  The value of chan0 needs to be set to 1, 101, 201, 301, and 401 on each host respectively.  Script runRemoteScenarios.sh can
# be used to execute this script on mutiple remote hosts.  The usage of runRemoteScenarios.sh is given in PTE/CITest/README.

# testcase: FAB-14350: RAFT test with large number of channels
# channels: 500
# org: 1
# thread: 500 threads (1 thread per channel)
# tx 10,000 per thread
# traffic mode: Constant

# source PTE CI utils
source PTECIutils.sh

myTESTCASE="FAB-14350"
myCPDir="PTEScaleTest-CP"

myCC="samplecc"
myTXMODE="Constant"
myNORG=1

myNREQ=1

chan0=1
myMinChan=100
myMaxChan=100
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
optString="--testcase $myTESTCASE --cpdir $myCPDir -a $myCC --chan0 $chan0 --norg $myNORG --nreq $myNREQ --targetorderers UserDefined --txmode $myTXMODE -i"
echo "[$myTESTCASE] optString=$optString"
PTEExecLoop $myMinChan $myMaxChan $myChanIncr $myMinTh $myMaxTh $myThIncr $myKey0 $myKeyIncr "${optString[@]}"
