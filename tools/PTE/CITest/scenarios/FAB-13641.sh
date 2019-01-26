#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# testcase: FAB-13641
# channels: 1
# org: 3
# threads: 3 (1 per org)
# tx 10,000 per thread
# traffic mode: Constant

myTESTCASE="PTEScaleTest"
myLog="FAB-13641"

myCC="samplecc"
myTXMODE="Constant"
myNORG=3

myNREQ=10000

myMinChan=1
myMaxChan=1
myChanIncr=1
myMinTh=1
myMaxTh=1
myThIncr=1

myKey0=0

CWD=$PWD

FabricTestDir=$GOPATH"/src/github.com/hyperledger/fabric-test"
PTEDir=$FabricTestDir"/tools/PTE"
LOGDir=$PTEDir"/CITest/Logs"

CIpteReport=$LOGDir/$myTESTCASE"-pteReport.log"
echo "CIpteReport=$CIpteReport"

if [ -e $CIpteReport ]; then
    rm -f $CIpteReport
fi

# channels loop
for (( myNCHAN = $myMinChan; myNCHAN <= $myMaxChan; myNCHAN+=$myChanIncr )); do
    # threads loop
    for (( myNTHREAD = $myMinTh; myNTHREAD <= $myMaxTh; myNTHREAD+=$myThIncr )); do
        cd $CWD
        set -x
        ./runScaleTraffic.sh  -a $myCC --nchan $myNCHAN --norg $myNORG --nproc $myNTHREAD --nreq $myNREQ --keystart $myKey0 --txmode $myTXMODE -i
        CMDResult="$?"
        set +x
        if [ $CMDResult -ne "0" ]; then
            echo "Error: Failed to execute runScaleTraffic.sh"
            exit 1
        fi
        myKey0=$(( myKey0+myNREQ ))
    done
done

mv $CIpteReport $LOGDir/$myLog"-pteReport.log"

exit 0
