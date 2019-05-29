#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Requirements:
# The script assumes that a network with mutual TLS and 2 orderer org,  2 orderers per orderer org, 2 org and 1 peer per org is
# operational, 1 channel is created and peers are joined, a chaincode is installed and instantiated.  The corresponding PTE service
# credential json is placed in a directory under PTE.  The default directory is PTEScaleTest-SC. If the user chooses not to use the
# default directory, then he needs to change mySCDir below to the name of the directory.  The script executes 8 threads traffic
# using service discovery.

# testcase: FAB-15528: service discovery with RAFT orderering service
# channel: 1
# orderer org: 2
# orderer per orderer org: 2
# org: 2
# peer per org: 1
# thread: 8
# tx: 100 per thread
# traffic mode: Constant
# target peer: discovery

#cd ~/gopath/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/scenarios
# ./runScaleTraffic.sh -a samplecc --preconfig --norg 2 --tls clientauth
# ./runScaleTraffic.sh -a samplecc --norg 2 --tls clientauth -i --nreq 100
# ./runScaleTraffic.sh -a samplecc --norg 2 --tls clientauth -i --nreq 100 --txmode constant --targetpeers discovery

# source PTE CI utils
source PTECIutils.sh

myTESTCASE="FAB-15528"
mySCDir="PTEScaleTest-SC"

myCC="samplecc"
myTXMODE="constant"
myNORG=2

myNREQ=100

chan0=1
myMinChan=1
myMaxChan=1
myChanIncr=1
myMinTh=4
myMaxTh=4
myThIncr=1
myFreq=0

myKey0=0
myKeyIncr=$myNREQ

myTLS="clientauth"
myTARGETPEERS="discovery"

CWD=$PWD

# remove existing PTE report
CIpteReport=$LOGDir/$myTESTCASE"-pteReport.log"
echo "CIpteReport=$CIpteReport"

if [ -e $CIpteReport ]; then
    rm -f $CIpteReport
fi

# execute PTE
optString="--testcase $myTESTCASE --scdir $mySCDir --tls $myTLS -a $myCC --chan0 $chan0 --norg $myNORG --nreq $myNREQ --txmode $myTXMODE --freq $myFreq -i --targetpeers $myTARGETPEERS"
echo "[$myTESTCASE] optString=$optString"
PTEExecLoop $myMinChan $myMaxChan $myChanIncr $myMinTh $myMaxTh $myThIncr $myKey0 $myKeyIncr "${optString[@]}"
