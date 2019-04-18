#!/bin/bash
set -e
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# PTE: create/join channel, install/instantiate/upgrade chaincode


install_cc () {
    cd $PTEDir
    echo "[$0] ***************************************************"
    echo "[$0] *******   install chaincode: $1      *******"
    echo "[$0] ***************************************************"

    runInstall=`ls CITest/$PrecfgDir/preconfig/$1/runCases*install*`
    echo "runInstall $runInstall"
    for ri in $runInstall; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
    done
}

instantiate_cc () {
    echo "[$0] ***************************************************"
    echo "[$0] *******   instantiate chaincode: $1  *******"
    echo "[$0] ***************************************************"

    runInstan=`ls CITest/$PrecfgDir/preconfig/$1/runCases*instantiate*`
    echo "runInstan $runInstan"
    for ri in $runInstan; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
     done
}

upgrade_cc() {
    echo "[$0] ***************************************************"
    echo "[$0] *******   upgrade chaincode: $1  *******"
    echo "[$0] ***************************************************"

    runUpgr=`ls CITest/$PrecfgDir/preconfig/$1/runCases*upgrade*`
    echo "runUpgr $runUpgr"
    for ru in $runUpgr; do
       echo "./pte_driver.sh $ru"
       ./pte_driver.sh $ru
       sleep 60s
     done
}

CWD=$PWD

cd ../..
PTEDir=$PWD
echo "[$0] PTEDir= $PTEDir"

cc=$1
PrecfgDir=$2
ifUpgrade="no"
if [ "$3" = "doupgrade" ]; then
    ifUpgrade="yes"
fi

echo "[$0] chaincode: $cc, PrecfgDir: $PrecfgDir"


cd $PTEDir

cd CITest/$PrecfgDir/preconfig
if [ "$cc" == "all" ]; then
    ccDir=`ls`
    echo "[$0] ccDir: $ccDir"
    cd $PTEDir
    for c1 in $ccDir; do
        if [ $c1 == 'channels' ]; then
            echo "[$0] The directory [CITest/$PrecfgDir/preconfig/$c1] is not for chaincode!"
        else
            install_cc "$c1"
            if [ ifUpgrade = "yes" ]; then
                upgrade_c1 "$c1"
            else
                instantiate_cc "$c1"
            fi
        fi
    done
else
    if [ ! -e $cc ]; then
        echo "[$0] The chaincode directory [CITest/$PrecfgDir/preconfig/$cc] does not exist!"
        exit
    else
        install_cc "$cc"
        if [ "$ifUpgrade" = "yes" ]; then
            upgrade_cc "$cc"
        else
            instantiate_cc "$cc"
        fi
    fi
fi

cd $CWD
echo "[$0] current dir: $PWD"
