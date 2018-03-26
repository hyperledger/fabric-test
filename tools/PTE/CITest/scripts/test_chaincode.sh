#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# PTE: create/join channel, install/instantiate chaincode
CWD=$PWD

cd ../..
PTEDir=$PWD
echo "[$0] PTEDir= $PTEDir"

cc=$1
PrecfgDir=$2
echo "[$0] chaincode: $cc, PrecfgDir: $PrecfgDir"

cd $PTEDir

cd CITest/$PrecfgDir/preconfig
if [ $cc == "all" ]; then
    ccDir=`ls`
    echo "[$0] ccDir: $ccDir"
    cd $PTEDir
    for c1 in $ccDir; do
        if [ $c1 == 'channels' ]; then
            echo "[$0] The directory [$c1] is not for chaincode!"
        else
            echo "[$0] ***************************************************"
            echo "[$0] *******   install chaincode: $c1      *******"
            echo "[$0] ***************************************************"

            runInstall=`ls CITest/$PrecfgDir/preconfig/$cc/runCases*install*`
            echo "runInstall $runInstall"
            for ri in $runInstall; do
               echo "./pte_driver.sh $ri"
               ./pte_driver.sh $ri
               sleep 60s
            done

            echo "[$0] ***************************************************"
            echo "[$0] *******   instantiate chaincode: $c1  *******"
            echo "[$0] ***************************************************"

            runInstan=`ls CITest/$PrecfgDir/preconfig/$cc/runCases*instantiate*`
            echo "runInstan $runInstan"
            for ri in $runInstan; do
               echo "./pte_driver.sh $ri"
               ./pte_driver.sh $ri
               sleep 60s
            done

        fi
    done
else
    if [ ! -e $cc ]; then
        echo "[$0] The chaincode directory [$cc] does not exist!"
        exit
    else
        cd $PTEDir
        echo "[$0] ***************************************************"
        echo "[$0] *******   install chaincode: $cc      *******"
        echo "[$0] ***************************************************"

        runInstall=`ls CITest/$PrecfgDir/preconfig/$cc/runCases*install*`
        echo "runInstall $runInstall"
        for ri in $runInstall; do
           echo "./pte_driver.sh $ri"
           ./pte_driver.sh $ri
           sleep 60s
        done

        echo "[$0] ***************************************************"
        echo "[$0] *******   instantiate chaincode: $cc  *******"
        echo "[$0] ***************************************************"

        runInstan=`ls CITest/$PrecfgDir/preconfig/$cc/runCases*instantiate*`
        echo "runInstan $runInstan"
        for ri in $runInstan; do
           echo "./pte_driver.sh $ri"
           ./pte_driver.sh $ri
           sleep 60s
        done

    fi
fi

cd $CWD
echo "[$0] current dir: $PWD"
