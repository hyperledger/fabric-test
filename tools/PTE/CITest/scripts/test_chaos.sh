#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
# Script for chaos test
# Restart each docker container for every fabric network node in the default configuration, one at a time

function printHelp {

   echo "Usage: "
   echo " ./networkLauncher.sh [opt] [value] "
   echo "    -o: number of orderers, default=3"
   echo "    -g: number of organization, default=2"
   echo "    -p: number of peer per organization, default=2"
   echo "    -k: number of kafka, default=4"
   echo "    -z: number of zookeeper, default=3"

   echo " "
   echo " example: "
   echo " ./test_chaos.sh -o 4 -g 2 -p 2 -k 4 -z 3"

}

CWD=$PWD

# default values
nOrderer=3
nOrg=2
nPeerPerOrg=2
nKafka=4
nZookeeper=3

while getopts ":o:g:p:k:z:" opt; do
  case $opt in
    # peer environment options
    o)
      nOrderer=$OPTARG
      echo "number of orderer: $nOrderer"
      ;;

    g)
      nOrg=$OPTARG
      echo "number of organization: $nOrg"
      ;;

    p)
      nPeerPerOrg=$OPTARG
      echo "number of peer per organization: $nPeerPerOrg"
      ;;

    k)
      nKafka=$OPTARG
      echo "number of Kafka: $nKafka"
      ;;

    z)
      nZookeeper=$OPTARG
      echo "number of Zookeeper: $nZookeeper"
      ;;

    \?)
      echo "Invalid option: -$OPTARG" >&2
      printHelp
      ;;

    :)
      echo "Option -$OPTARG requires an argument." >&2
      printHelp
      ;;

  esac
done

echo "nOrderer=$nOrderer, nOrg=$nOrg, nPeerPerOrg=$nPeerPerOrg, nKafka=$nKafka, nZookeeper=$nZookeeper"

# restart orderers
echo " ############################################"
echo " #             restart orderers             #"
echo " ############################################"
for (( i=0; i<=$nOrderer; i++ ))
do
orderer="orderer"$i".example.com"
echo "[$0] restart orderers: $orderer"
docker restart $orderer
sleep 90
done

# restart peers
echo " ############################################"
echo " #             restart peers                #"
echo " ############################################"
for (( i=1; i<=$nOrg; i++ ))
do
    for (( j=0; j<$nPeerPerOrg; j++ ))
    do
        peer="peer"$j".org"$i".example.com"
        echo "[$0] restart peer: $peer"
        docker restart $peer
        sleep 90
    done
done


# restart kafkas
echo " ############################################"
echo " #                 restart kafkas           #"
echo " ############################################"
for (( i=0; i<$nKafka; i++ ))
do
    kafka="kafka"$i
    echo "[$0] stop kafkas: $kafka"
    docker stop $kafka
    sleep 90
    docker start $kafka
    sleep 90
done

# restart zookeepers
echo " ############################################"
echo " #            restart zookeepers            #"
echo " ############################################"
for (( i=0; i<$nZookeeper; i++ ))
do
    zookeeper="zookeeper"$i
    echo "[$0] restart zookeepers: $zookeeper"
    docker stop $zookeeper
    sleep 90
    docker start $zookeeper
    sleep 90
done

cd $CWD
echo "[$0] current dir: $PWD"
