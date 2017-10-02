#!/bin/bash

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test
NLDir=$FabricTestDir/tools/NL
PTEDir=$FabricTestDir/tools/PTE
SDKDir=$FabricTestDir/fabric-sdk-node

# setup fabric-test
CWD=$PWD
echo "[test_setup.sh] clone fabric-test"
cd $GOPATH/src/github.com/hyperledger
git clone https://github.com/hyperledger/fabric-test


# get v1.0.0 images
cd $FabricTestDir
### git submodule update --init --recursive
cd $FabricTestDir/fabric/scripts
### ./bootstrap-1.0.0.sh

# install sdk-node
cd $SDKDir
echo "***** npm install -g gulp *****"
### sudo npm install -g gulp
echo "***** sudo apt install *****"
### sudo apt install -y build-essential python libltdl-dev

echo "***** npm install *****"
npm install
echo "***** gulp ca *****"
gulp ca
echo "***** npm install singly-linked-list *****"
npm install singly-linked-list --save

cp -rf $PTEDir $SDKDir/test

cd $CWD
echo "[test_setup.sh] current dir: $PWD"
