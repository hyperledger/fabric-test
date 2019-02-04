#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test utilits ##########

# common test directories
FabricTestDir=$GOPATH"/src/github.com/hyperledger/fabric-test"
NLDir=$FabricTestDir"/tools/NL"
PTEDir=$FabricTestDir"/tools/PTE"
CMDDir=$PTEDir"/CITest/scripts"
LOGDir=$PTEDir"/CITest/Logs"

# PTEReport()
# purpose: calcuate TPS and latency statistics from PTE generated report
# $1: input pteReport.txt generated from PTE
# $2: output pteReport.txt which the calcuated results will be appended
PTEReport () {

    if [ $# != 2 ]; then
       echo "[PTEReport] Error: invalid arguments number $# "
       exit 1;
    fi

    # save current working directory
    CurrWD=$PWD

    cd $CMDDir
    # calculate overall TPS and output report
    echo
    node get_pteReport.js $1
    cat $1 >> $2

    # restore working directory
    cd $CurrWD
}


# PTE execution loop
# $1: min channel
# $2: max channel
# $3: channel incrment
# $4: min thread
# $5: max thread
# $6: thread increment
# $7: key increment
# $8: key0
# $9: options string
PTEExecLoop () {

    echo "[PTEExecLoop] number of in var=$#"
    myMinChan=$1
    myMaxChan=$2
    myChanIncr=$3
    myMinTh=$4
    myMaxTh=$5
    myThIncr=$6
    myKeyIncr=$7
    myKey0=$8
    args=$9

    echo "[PTEExecLoop] myMinChan=$myMinChan myMaxChan=$myMaxChan myChanIncr=$myChanIncr"
    echo "[PTEExecLoop] myMinTh=$myMinTh myMaxTh=$myMaxTh myThIncr=$myThIncr"
    echo "[PTEExecLoop] args=${args[@]}"

    # channels loop
    for (( myNCHAN = $myMinChan; myNCHAN <= $myMaxChan; myNCHAN+=$myChanIncr )); do
        # threads loop
        for (( myNTHREAD = $myMinTh; myNTHREAD <= $myMaxTh; myNTHREAD+=$myThIncr )); do
            cd $CWD
            set -x
            ./runScaleTraffic.sh --nchan $myNCHAN --nproc $myNTHREAD --keystart $myKey0 ${args[@]}
            CMDResult="$?"
            set +x
            if [ $CMDResult -ne "0" ]; then
                echo "Error: Failed to execute runScaleTraffic.sh"
                exit 1
            fi
            myKey0=$(( myKey0+myKeyIncr ))
        done
    done

}
