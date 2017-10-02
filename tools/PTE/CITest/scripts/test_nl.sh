#!/bin/bash

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test
NLDir=$FabricTestDir/tools/NL

CWD=$PWD

cd $NLDir
echo "[test_nl.sh] NL dir: $PWD"
# bring down network
echo "[test_nl.sh] bring down network"
./networkLauncher.sh -a down
# bring up network
echo "[test_nl.sh] bring up network"
./networkLauncher.sh -o 2 -x 4 -r 4 -p 2 -k 2 -z 2 -n 2 -t kafka -f test -w localhost -S enabled

cd $CWD
echo [test_nl.sh] "current dir: $PWD"
