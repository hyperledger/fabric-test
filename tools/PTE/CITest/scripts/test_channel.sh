#!/bin/bash

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test
SDKDir=$FabricTestDir/fabric-sdk-node

# PTE: create/join channels
CWD=$PWD

cd $SDKDir/test/PTE

echo "[test_channel.sh] create channel"
./pte_driver.sh CITest/preconfig/channels/runCases-chan-create-TLS.txt
sleep 60s

echo "[test_channel.sh] join channel"
./pte_driver.sh CITest/preconfig/channels/runCases-chan-join-TLS.txt
sleep 20s


cd $CWD
echo "[test_channel.sh] current dir: $PWD"
