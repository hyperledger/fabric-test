#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
PTEDir=$FabricTestDir/tools/PTE
ccWDir=$FabricTestDir/tools/PTE/CITest/FAB-17764/preconfig/marbles02
upgDir=$FabricTestDir/tools/PTE/CITest/FAB-17764/preconfig/upgrade
indexDir=$FabricTestDir/tools/PTE/CITest/FAB-17764/preconfig/indexes
metadata=$FabricTestDir/chaincodes/marbles02/go/META-INF/statedb/couchdb/indexes/indexOwner.json

CWD=$PWD

runCCQuery () {
    cd $PTEDir
    # query chaincode
    while [ 1 ]
    do
        ./pte_mgr.sh CITest/FAB-17764/marbles02/PTEMgr-FAB-17764-q-TLS.txt
    done
}

stopProc() {
    dd=`date -u +%D-%T`
    echo -e "[$dd:$0:stopProc] execution exited with error code ($errcode)"
    set -x
    pkill -f runCCQuery
    kill -9 $(ps -ef | grep node | awk '{print $2}')
    kill -9 $(ps -ef | grep stateFork | grep bash | awk '{print $2}')
    set +x
}

getSysInfo() {
    while [ 1 ]
    do
        set -x
        date
        iostat
        free
        df
        set +x

        sleep 30
    done
}

restartContainers() {
    dd=`date -u +%D-%T`
    echo -e "[$dd:$0:restartContainers] restartContainers"
    docker stop peer0.org1.example.com
    docker stop peer1.org1.example.com
    docker stop couchdb0
    docker stop couchdb1
    sleep 60
    docker restart peer0.org1.example.com
    docker restart peer1.org1.example.com
    docker restart couchdb0
    docker restart couchdb1
}

checkPeerExited() {
    dd=`date -u +%D-%T`
    peerExit=`docker ps -a | grep "peer node" | grep -i exit | wc -l`
    echo "[$dd:$0:ckeckPeerExited] peerExit: $peerExit"
    if [ $peerExit -ne 0 ]; then
        containersExited=`docker ps -a | grep "peer node" | grep -i exit`
        echo "containersExited:"
        echo "$containersExited"
    fi
    return $peerExit
}

cd $CWD
