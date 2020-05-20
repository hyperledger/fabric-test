#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

source stateForkQuery.sh

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
PTEDir=$FabricTestDir/tools/PTE
NLDir=$FabricTestDir/tools/NL
OPDir=$FabricTestDir/tools/operator
ccWDir=$FabricTestDir/tools/PTE/CITest/FAB-17764/preconfig/marbles02
upgDir=$FabricTestDir/tools/PTE/CITest/FAB-17764/preconfig/upgrade
indexDir=$FabricTestDir/tools/PTE/CITest/FAB-17764/preconfig/indexes
metadata=$FabricTestDir/chaincodes/marbles02/go/META-INF/statedb/couchdb/indexes/indexOwner.json

# enable core dump
export GOTRACEBACK=crash
echo "[$0] GOTRACEBACK=$GOTRACEBACK"

CWD=$PWD

#invoke key0
key0=0

# system usage information during the test
sysInfoOutput="systemInfo.txt"
if [ -e $CWD/$sysInfoOutput ]; then
    rm -f $CWD/$sysInfoOutput
fi
getSysInfo >& $CWD/$sysInfoOutput &
sysinfo_PID=$!
echo "[$0] sysinfo_PID:$sysinfo_PID"

cd $PTEDir

# bring up network if needed
networkProc () {
    echo "[$0] KUBECONFIG=$KUBECONFIG"
    if [ "$KUBECONFIG" == "" ]; then
        # local network
        # bring down network using operator
        cd $OPDir
        go run main.go -i ../../regression/testdata/statefork-network-spec.yml -a down
        sleep 10

        # bring up network using operator
        go run main.go -i ../../regression/testdata/statefork-network-spec.yml -a up
        sleep 60
    fi
}

# create/join channels
channelProc () {
    cd $PTEDir
    # create channel
    ./pte_driver.sh CITest/FAB-17764/preconfig/channels/runCases-chan-create-TLS.txt 
    sleep 30
    # join channel
    ./pte_driver.sh CITest/FAB-17764/preconfig/channels/runCases-chan-join-TLS.txt 
}

# install/instantiate chaincode
ccProc () {
    cd $PTEDir
    # install marbles02 chaincode
    ./pte_driver.sh $ccWDir/runCases-marbles02-install-TLS.txt 
    CMDResult="$?"
    if [ $CMDResult -ne "0" ]; then
        echo "[$0:ccProc] Error: Failed to install chaincde"
        exit 1
    fi
    # instantiate marbles02 chaincode
    ./pte_driver.sh $ccWDir/runCases-marbles02-instantiate-TLS.txt
    CMDResult="$?"
    if [ $CMDResult -ne "0" ]; then
        echo "[$0:ccProc] Error: Failed to instantiate chaincde"
        exit 1
    fi
}

upgradeCCProc () {
    set -x
    cd $PTEDir
    # install chaincode marbles02
    ./pte_driver.sh $upgDir/runCases-marbles02-install-TLS.txt
    CMDResult="$?"
    if [ $CMDResult -ne "0" ]; then
        echo "[$0:upgradeCCProc] Error: Failed to install chaincode ($nVer)"
        checkPeerExited
        CMDResult="$?"
        if [ $CMDResult -ne "0" ]; then
            echo "[$0:upgradeCCProc/install] restart peer and couchDB containers"
            restartContainers
        else
            echo "[$0:upgradeCCProc/install] exit"
	    terminateRunCCQuery
            stopProc
            exit 1
        fi
    fi
    # upgrade chaincode marbles02
    ./pte_driver.sh $upgDir/runCases-marbles02-upgrade-TLS.txt
    CMDResult="$?"
    if [ $CMDResult -ne "0" ]; then
        echo "[$0:upgradeCCProc] Error: Failed to upgrade chaincode ($nVer)"
        checkPeerExited
        CMDResult="$?"
        if [ $CMDResult -ne "0" ]; then
            echo "[$0:upgradeCCProc/upgrade] restart peer and couchDB containers"
            restartContainers
        else
            echo "[$0:upgradeCCProc/upgrade] exit"
	    terminateRunCCQuery
            stopProc
            exit 1
        fi
    fi
    set +x
}

# invokes
ccInvoke () {
    cd $PTEDir
    #invoke chaincode
    echo "[$0:ccInvoke] invoke key0: $key0"
    cp CITest/FAB-17764/marbles02/invoke/marbles02* CITest/FAB-17764/marbles02
    sed -i -e "s/_key0_/$key0/g" CITest/FAB-17764/marbles02/marbles02*
    ./pte_mgr.sh CITest/FAB-17764/marbles02/PTEMgr-FAB-17764-i-TLS.txt
    key0=$(( key0 + 100 ))
}

# terminate background query process
terminateRunCCQuery() {
    echo "[$0:terminateRunCCQuery] terminate query process ($ccQuery_PID) sysinfo process ($sysinfo_PID)"
    set -x
    kill -9 $sysinfo_PID
    kill -9 $ccQuery_PID
    set +x
}

preConfig () {
    networkProc
    channelProc
    cp $indexDir/index1"Owner.json" $metadata
    ccProc
    ccInvoke
}

# test begins
preConfig

### run query in background
runCCQuery &
ccQuery_PID=$!
echo "[$0] ccQuery_PID:$ccQuery_PID"

### set chaincode initial version
cVer="vv"
cAction="instantiate"

# chaincode upgrade loop
cd $PTEDir
i=0
while [ $i -lt 20 ]
do
   # check if peer containers exit
   checkPeerExited
   CMDResult="$?"
   if [ $CMDResult -ne "0" ]; then
       echo "[$0] Error: containers exited ($nVer)"
       restartContainers
   fi

   nVer="v"$i
   nAction="upgrade"

   # toggle couchDB index: 1 field vs 2 fields
   idx=$(( $i % 2 ))
   cp $indexDir/index$idx"Owner.json" $metadata

   # prepare for chaincode upgrade
   if [ "$i" -eq 0 ]; then
       # init setup
       cp $ccWDir/marbles02* $upgDir
       sed -i -e "s/$cAction/$nAction/g" $upgDir/marbles02*
       sed -i -e "s/initMarbleName/initMarbleName$nVer/g" $upgDir/marbles02*
   fi
   sed -i -e "s/$cVer/$nVer/g" $upgDir/marbles02*

   # execute chaincode upgrade
   dd=`date -u +%D-%T`
   echo "[$dd $0] upgrade chaincode version: ($nVer)"
   upgradeCCProc

   # invokes
   ccInvoke

   # remove out dated cc containers
   if [ "$i" -gt 1 ]; then
       j=$(($i-2))
       dVer="v"$j
       echo "[$0] remove chaincode conainters: $dVer"
       docker rm -f $(docker ps -a | grep marble | grep $dVer | awk '{print $1}')
       docker rmi -f $(docker images | grep marble | grep $dVer | awk '{print $1}')
   fi

   cVer=$nVer

   i=$((i+1))
done

# terminate proc
terminateRunCCQuery
stopProc

cd $CWD

exit 0
