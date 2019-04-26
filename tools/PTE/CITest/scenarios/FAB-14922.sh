#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Requirements:
# The script assumes that a network with 1 org with 1 peer is operational, a channel is created and the peer is joined, a chaincode is
# installed and instantiated.  The corresponding PTE service credential json is placed in a directory under PTE.  The default directory
# is PTEScaleTest-SC.  If the user chooses not to use the default directory, then he needs to change mySCDir below to the name of the
# directory.  For a specific transaction payload size, set payLoadMin and payLoadMax in ../scripts/cfgTemplates/sampleccDfnOpt.json to
# the same value.  For example, set to 1048576 for 1MB payload and 50331648 for 48 MB payload. The payload size used is for the endorsement
# request. Note the broadcast transaction will be bigger in most cases because the response will typically contain a RWset and signatures.
# Although the response size can vary, this is a common formula:
# The transaction payload size = 2 * proposal size + number of endorsements * (endorser identity + signature size)

# testcase: FAB-14922: RAFT scaling: increasingly large transaction
# channels: 1
# org: 1
# thread: 1
# tx: 1
# traffic mode: Constant

# source PTE CI utils
source PTECIutils.sh

myTESTCASE="FAB-14922"
mySCDir="PTEScaleTest-SC"

myCC="samplecc"
myTXMODE="Constant"
myNORG=1

myNREQ=1

chan0=1
myMinChan=1
myMaxChan=1
myChanIncr=1
myMinTh=1
myMaxTh=1
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
optString="--testcase $myTESTCASE --scdir $mySCDir -a $myCC --chan0 $chan0 --norg $myNORG --nreq $myNREQ --txmode $myTXMODE --freq $myFreq -i"
echo "[$myTESTCASE] optString=$optString"
PTEExecLoop $myMinChan $myMaxChan $myChanIncr $myMinTh $myMaxTh $myThIncr $myKey0 $myKeyIncr "${optString[@]}"
