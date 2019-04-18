#!/bin/bash
set -e
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

SETUP="notSetup"
NL="notCreate"
NLDir="scripts"
PrecfgDir=""
CHANNEL="notCreate"
SYNCHUP="notSynchup"
CHAINCODE="noCC"
TCases=()
TStart=0

function testDriverHelp {

   echo "Usage: "
   echo " ./test_driver.sh [opt] [values]"
   echo "    -e: install sdk packages, default=no"
   echo "    -n: create network, default=no"
   echo "    -m: directory where test_nl.sh, preconfig, chaincode to be used to create network, default=scripts"
   echo "    -p: preconfigure creation/join channels, default=no"
   echo "    -s: synchup peer ledgers, recommended when network brought up, default=no"
   echo "    -c: chaincode to be installed and instantiated [all|<chaincode>], default=no"
   echo "    -u: chaincode to be installed and upgraded [all|<chaincode>], default=no"
   echo "    -t [value1 value2 value3 ...]: test cases to be executed"
   echo "    -b [value]: test cases starting time"
   echo " "
   echo "  available test cases:"
   echo "    FAB-query-TLS: 4 processes X 1000 queries, TLS"
   echo "    FAB-3983-i-TLS: FAB-3983, longrun: 4 processes X 60 hours invokes, constant mode, 1k payload, TLS"
   echo "    FAB-4162-i-TLS: FAB-4162, longrun: 4 processes X 60 hours mix mode, vary 1k-2k payload, TLS"
   echo "    FAB-4229-i-TLS: FAB-4229, longrun: 8 processes X 36 hours mix mode, vary 1k-2k payload, TLS"
   echo "    FAB-3989-4i-TLS: FAB-3989, stress: 4 processes X 1000 invokes, constant mode, 1k payload, TLS"
   echo "    FAB-3989-4q-TLS: FAB-3989, stress: 4 processes X 1000 queries, constant mode, 1k payload, TLS"
   echo "    FAB-3989-8i-TLS: FAB-3989, stress: 8 processes X 1000 invokes, constant mode, 1k payload, TLS"
   echo "    FAB-3989-8q-TLS: FAB-3989, stress: 8 processes X 1000 queries, constant mode, 1k payload, TLS"
   echo "    marbles-i-TLS: marbles chaincode: 4 processes X 1000 invokes, constant mode, TLS"
   echo "    marbles-q-TLS: marbles chaincode: 4 processes X 1000 queries, constant mode, TLS"
   echo "    robust-i-TLS: robustness: 4 processes X invokes, constant mode, 1k payload, TLS"
   echo "    FAB-3833-2i: 2 processes X 10000 invokes, TLS, couchDB"
   echo "    FAB-3810-2q: 2 processes X 10000 queries, TLS, couchDB"
   echo "    FAB-3832-4i: 4 processes X 10000 invokes, TLS, couchDB"
   echo "    FAB-3834-4q: 4 processes X 10000 queries, TLS, couchDB"
   echo "    FAB-3808-2i: 2 processes X 10000 invokes, TLS"
   echo "    FAB-3811-2q: 2 processes X 10000 queries, TLS"
   echo "    FAB-3807-4i: 4 processes X 10000 invokes, TLS"
   echo "    FAB-3834-4q: 4 processes X 10000 queries, TLS"
   echo " "
   echo " example: "
   echo " ./test_driver.sh -n -m FAB-3808-2i -p -c samplecc -t FAB-3808-2i: create a network, create/join channels, install/instantiate samplecc chaincode using setting in FAB-3808-2i, and execute test case FAB-3808-2i"
   echo " ./test_driver.sh -n -p -c all -t FAB-3989-4i-TLS FAB-3989-4q-TLS: create a network, create/join channel and install/instantiate all chaincodes using default setting and execute two test cases"
   echo " ./test_driver.sh -n -p -c samplecc: create a network, create/join channels, install/instantiate chaincode samplecc using default setting"
   echo " ./test_driver.sh -t FAB-3811-2q FAB-3808-2i: execute test cases (FAB-3811-2q and FAB-3808-2i)"
   echo " ./test_driver.sh -m FAB-8252/upgrade -u marbles02: upgrade chaincode marbles02 using setting in FAB-8252/upgrade directory"
   exit
}

while getopts ":t:c:u:b:m:enps" opt; do
  case $opt in
    # parse environment options
    e)
      SETUP="setup"
      echo "install sdk packages: $SETUP"
      ;;
    n)
      NL="create"
      echo "network action: $NL"
      ;;
    m)
      NLDir=$OPTARG
      PrecfgDir=$OPTARG
      echo "network script Dir: $NLDir"
      ;;
    p)
      CHANNEL="create"
      echo "channel action: $CHANNEL"
      ;;
    c)
      CHAINCODE=$OPTARG
      echo "chaincode: $CHAINCODE"
      ;;
    u)
      CHAINCODE_TOUPGRADE=$OPTARG
      echo "chaincode to upgrade: $CHAINCODE_TOUPGRADE"
      ;;
    t)
      TCases+=("$OPTARG")
      echo "test cases input: $OPTARG"
      echo "test cases: ${TCases[@]}"
      until [[ $(eval "echo \${$OPTIND}") =~ ^-.* ]] || [ -z $(eval "echo \${$OPTIND}") ]; do
          TCases+=($(eval "echo \${$OPTIND}"))
          OPTIND=$((OPTIND + 1))
      done
      ;;
    s)
      SYNCHUP="synchup"
      echo "synch up ledger action: $SYNCHUP"
      ;;
    b)
      TStart=$OPTARG
      echo "TStart: $TStart"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      testDriverHelp
      exit
      ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      testDriverHelp
      exit
      ;;

  esac
done

echo "SETUP $SETUP, NL $NL, NLDir $NLDir, CHANNEL $CHANNEL, CHAINCODE $CHAINCODE, TStart $TStart"
echo "SYNCHUP $SYNCHUP"
echo "total: ${#TCases[@]} test cases: ${TCases[@]}"

CWD=$PWD

# set CIDir
cd ..
CIDir=$PWD
echo "[$0] CIDir= $CIDir"

cd $CWD
# setup test environment
if [ $SETUP == "setup" ]; then
    ./test_setup.sh
    cd $CWD
    echo "[$0] current dir: $PWD"
    sleep 60
fi

# bring up network
if [ $NL == "create" ]; then
    #cd $TCases[0]
    if [ ! -e $CIDir/$NLDir/test_nl.sh ]; then
        echo "[$0] test_nl.sh does not exist in $CIDir/$NLDir, use $CIDir/scripts/test_nl.sh"
        NLDir="scripts"
    fi
    cd $CIDir/$NLDir
    ./test_nl.sh
    cd $CWD
    echo "[$0] current dir: $PWD"
    sleep 60
fi

# channel
if [ $CHANNEL == "create" ]; then
    ./test_channel.sh $PrecfgDir
    cd $CWD
    echo "[$0] current dir: $PWD"
    sleep 60
fi

# chaincode
if [ $CHAINCODE != "noCC" ]; then
    ./test_chaincode.sh $CHAINCODE $PrecfgDir
    cd $CWD
    echo "[$0] current dir: $PWD"
    sleep 60
fi

# upgrade chaincode
if [ ! -z "$CHAINCODE_TOUPGRADE" ]; then
    ./test_chaincode.sh $CHAINCODE_TOUPGRADE $PrecfgDir doupgrade
    cd $CWD
    echo "[$0] current dir: $PWD"
    sleep 60
fi

# execute PTE
# ledger synch-up
if [ $SYNCHUP == "synchup" ]; then
    ./test_pte.sh "FAB-query-TLS" $TStart
    cd $CWD
    echo "[$0] current dir: $PWD"
    sleep 60
fi

cd $CWD
echo "[$0] current dir: $PWD"


for t in "${TCases[@]}"
do
    ./test_pte.sh $t $TStart
    sleep 100
done

exit
