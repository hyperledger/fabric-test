#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./gen_crypto_cfg.sh [opt] [value]
#

function printHelp {
   echo "Usage: "
   echo " ./gen_crypto_cfg.sh [opt] [value] "
   echo "    -o: number of orderers, default=1"
   echo "    -p: number of peers per organization, default=1"
   echo "    -r: number of organization, default=1"
   echo "    -C: company name, default=example.com"
   echo " "
   echo "Example:"
   echo " ./gen_crypto_cfg.sh -o 1 -p 2 -r 2"
   exit
}

CWD=$PWD
#default vars
cfgOutFile=$CWD"/crypto-config.yaml"

#default values
nOrderer=1
peersPerOrg=1
nOrg=1
comName="example.com"

while getopts ":o:p:r:C:" opt; do
  case $opt in
    # number of orderers
    o)
      nOrderer=$OPTARG
      echo "nOrderer:  $nOrderer"
      ;;

    # number of peers per org
    p)
      peersPerOrg=$OPTARG
      echo "peersPerOrg: $peersPerOrg"
      ;;

    # number of orgs
    r)
      nOrg=$OPTARG
      echo "nOrg:  $nOrg"
      ;;

    # company name
    C)
      comName=$OPTARG
      echo "comName:  $comName"
      ;;

    # else
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


echo "nOrderer=$nOrderer, peersPerOrg=$peersPerOrg, nOrg=$nOrg"
echo "cfgOutFile=$cfgOutFile"

# rm cfgOutFile
rm -f $cfgOutFile

#begin process
          echo "OrdererOrgs:" >> $cfgOutFile
          #for (( i=1; i<=$nOrderer; i++  ))
          #do
              #echo "    - Name: OrdererOrg$i" >> $cfgOutFile
              echo "    - Name: Orderer" >> $cfgOutFile
              tt=$comName
              echo "      Domain: $tt" >> $cfgOutFile
              echo "      Template:" >> $cfgOutFile
              echo "        Count: $nOrderer" >> $cfgOutFile
          #done

          echo "PeerOrgs:" >> $cfgOutFile
          for (( i=1; i<=$nOrg; i++  ))
          do
              echo "    - Name: PeerOrg$i" >> $cfgOutFile
              tt=org$i"."$comName
              echo "      Domain: $tt" >> $cfgOutFile
              echo "      EnableNodeOUs: true" >> $cfgOutFile
              echo "      Template:" >> $cfgOutFile
              echo "        Count: $peersPerOrg" >> $cfgOutFile
              echo "      Users:" >> $cfgOutFile
              echo "        Count: 1" >> $cfgOutFile
          done
exit

