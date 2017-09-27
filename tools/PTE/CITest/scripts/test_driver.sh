#!/bin/bash

# Usage:
#    ./test_driver.sh
#        TCase:


SETUP="notSetup"
NL="notCreate"
CHANNEL="notCreate"
SYNCHUP="notSynchup"
CHAINCODE="noCC"
TCases=()

function testDriverHelp {

   echo "Usage: "
   echo " ./test_driver.sh [opt] [values]"
   echo "    -e: environment setup, default=no"
   echo "    -n: create network, default=no"
   echo "    -p: preconfigure creation/join channels, default=no"
   echo "    -s: synchup peer ledgers, recommended when network brought up, default=no"
   echo "    -c: chaincode to be installed and instantiated [all|chaincode], default=no"
   echo "    -t [value1 value2 value3 ...]: test cases to be executed"
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
   echo " "
   echo " example: "
   echo " ./test_driver.sh -n -p -c all -t FAB-3989-4i-TLS FAB-3989-4q-TLS: create a network, create/join channel and install/instantiate all chaincodes and execute test cases"
   echo " ./test_driver.sh -p -c samplecc -t FAB-3989-4i-TLS: create/join channel and install/instantiate chaincode samplecc and execute test case FAB-3989-4i-TLS"
   echo " ./test_driver.sh -c samplecc -t FAB-3989-4i-TLS: install/instantiate chaincode samplecc and execute test case FAB-3989-4i-TLS"
   echo " ./test_driver.sh -t FAB-3989-4i-TLS FAB-3989-4q-TLS robust-i-TLS: execute test cases (FAB-3989-4i-TLS, FAB-3989-4q-TLS, robust-i-TLS)"
   exit
}

while getopts ":t:c:nps" opt; do
  case $opt in
    # parse environment options
    e)
      SETUP="setup"
      echo "environemnt setup: $SETUP"
      ;;
    n)
      NL="create"
      echo "network action: $NL"
      ;;
    p)
      CHANNEL="create"
      echo "channel action: $CHANNEL"
      ;;
    c)
      CHAINCODE=$OPTARG
      echo "chaincode: $CHAINCODE"
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

echo "SETUP $SETUP, NL $NL, CHANNEL $CHANNEL CHAINCODE $CHAINCODE"
echo "total: ${#TCases[@]} test cases: ${TCases[@]}"

#CIDir=$GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest

CWD=$PWD
# setup test environment
if [ $SETUP == "setup" ]; then
    ./test_setup.sh
    cd $CWD
    echo "[test_driver] current dir: $PWD"
    sleep 60
fi

# bring up network
if [ $NL == "create" ]; then
    ./test_nl.sh
    cd $CWD
    echo "[test_driver] current dir: $PWD"
    sleep 60
fi

# channel and chaincode
if [ $CHANNEL == "create" ]; then
    ./test_channel.sh $CHAINCODE
    cd $CWD
    echo "[test_driver] current dir: $PWD"
    sleep 60
fi

# channel and chaincode
if [ $CHAINCODE != "noCC" ]; then
    ./test_chaincode.sh $CHAINCODE
    cd $CWD
    echo "[test_driver] current dir: $PWD"
    sleep 60
fi

# execute PTE
# ledger synch-up
if [ $SYNCHUP == "synchup" ]; then
    ./test_pte.sh "FAB-query-TLS"
    cd $CWD
    echo "[test_driver] current dir: $PWD"
    sleep 60
fi

cd $CWD
echo "[test_driver] current dir: $PWD"


for t in "${TCases[@]}"
do
    ./test_pte.sh $t
    sleep 100
done

exit
