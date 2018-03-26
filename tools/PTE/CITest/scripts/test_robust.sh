#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
# Script for testcase FAB-4670
# Restart each docker container for every fabric network node in the default configuration, one at a time


CWD=$PWD

sleep 180
# restart orderers
echo "[$0] restart orderers"
docker restart orderer0.example.com
sleep 90

docker restart orderer1.example.com
sleep 90

# restart peers
echo "[$0] restart peers"
docker restart peer0.org1.example.com
sleep 90

docker restart peer1.org1.example.com
sleep 90

docker restart peer0.org2.example.com
sleep 90

docker restart peer1.org2.example.com
sleep 90

# restart kafkas
echo "[$0] restart kafkas"
docker stop kafka0
sleep 45
docker start kafka0
sleep 90

docker stop kafka1
sleep 45
docker start kafka1
sleep 90

docker stop kafka2
sleep 45
docker start kafka2
sleep 90

docker stop kafka3
sleep 45
docker start kafka3
sleep 90

# restart zookeepers
echo "[$0] restart zookeepers"
docker stop zookeeper0
sleep 45
docker start zookeeper0
sleep 90

docker stop zookeeper1
sleep 45
docker start zookeeper1
sleep 120

docker stop zookeeper2
sleep 45
docker start zookeeper2
sleep 120

cd $CWD
echo "[$0] current dir: $PWD"
