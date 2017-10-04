#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test

CWD=$PWD

sleep 180
# restart orderer0.example.com
echo "[$0] restart orderer0.example.com"
docker restart orderer0.example.com
sleep 60

# restart orderer1.example.com
echo "[$0] restart orderer1.example.com"
docker restart orderer1.example.com
sleep 60

# restart peer0.org1.example.com
echo "[$0] restart peer0.org1.example.com"
docker restart peer0.org1.example.com
sleep 60

# restart peer0.org2.example.com
echo "[$0] restart peer0.org2.example.com"
docker restart peer0.org2.example.com
sleep 60

# restart peer0.org3.example.com
echo "[$0] restart peer0.org3.example.com"
docker restart peer0.org3.example.com
sleep 60

# restart peer0.org4.example.com
echo "[$0] restart peer0.org4.example.com"
docker restart peer0.org4.example.com
sleep 60

cd $CWD
echo "[$0] current dir: $PWD"
