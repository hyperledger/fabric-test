#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test
SDKDir=$FabricTestDir/fabric-sdk-node

# PTE: create/join channel, install/instantiate chaincode
CWD=$PWD
cc=$1
PrecfgDir=$2
echo "[$0] chaincode: $cc, PrecfgDir: $PrecfgDir"

cd $SDKDir/test/PTE

cd CITest/$PrecfgDir/preconfig
if [ $cc == "all" ]; then
    ccDir=`ls`
    echo "[$0] ccDir: $ccDir"
    cd $SDKDir/test/PTE
    for c1 in $ccDir; do
        if [ $c1 == 'channels' ]; then
            echo "[$0] The directory [$c1] is not for chaincode!"
        else
            echo "[$0] ***************************************************"
            echo "[$0] *******   install chaincode: $c1      *******"
            echo "[$0] ***************************************************"
            ./pte_driver.sh CITest/$PrecfgDir/preconfig/$c1/runCases-$c1"-install-TLS.txt"
            #./pte_driver.sh CITest/preconfig/$c1/runCases-$c1"-install-TLS.txt"
            sleep 20s

            echo "[$0] ***************************************************"
            echo "[$0] *******   instantiate chaincode: $c1  *******"
            echo "[$0] ***************************************************"
            ./pte_driver.sh CITest/$PrecfgDir/preconfig/$c1/runCases-$c1"-instantiate-TLS.txt"
            #./pte_driver.sh CITest/preconfig/$c1/runCases-$c1"-instantiate-TLS.txt"
            sleep 120s
        fi
    done
else
    if [ ! -e $cc ]; then
        echo "[$0] The chaincode directory [$cc] does not exist!"
        exit
    else
        cd $SDKDir/test/PTE
        echo "[$0] ***************************************************"
        echo "[$0] *******   install chaincode: $cc      *******"
        echo "[$0] ***************************************************"
        ./pte_driver.sh CITest/$PrecfgDir/preconfig/$cc/runCases-$cc"-install-TLS.txt"
        sleep 20s

        echo "[$0] ***************************************************"
        echo "[$0] *******   instantiate chaincode: $cc  *******"
        echo "[$0] ***************************************************"
        ./pte_driver.sh CITest/$PrecfgDir/preconfig/$cc/runCases-$cc"-instantiate-TLS.txt"

    fi
fi

cd $CWD
echo "[$0] current dir: $PWD"
