#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./gen_network.sh [opt] [value]
#


function printHelp {
   echo "Usage: "
   echo " ./gen_network.sh [opt] [value] "
   echo "    network variables"
   echo "       -a: action [create|add], default=create"
   echo "       -p: number of peers per organization, default=1"
   echo "       -o: number of orderers, default=1"
   echo "       -k: number of brokers, default=0"
   echo "       -e: number of replicas, default=brokers"
   echo "       -z: number of zookeeper, default=0"
   echo "       -r: number of organizations, default=1"
   echo "       -S: TLS enablement [enabled|disabled], default=disabled "
   echo "       -m: Mutual TLS enablement [enabled|disabled], default=disabled "
   echo "       -x: number of ca, default=0"
   echo "       -F: local MSP base directory, default=$GOPATH/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config"
   echo "       -G: src MSP base directory, default=/opt/hyperledger/fabric/msp/crypto-config"
   echo "       -C: company name, default=example.com"
   echo "       -M: JSON file containing organization and MSP name mappings (optional) "
   echo " "
   echo "    peer environment variables"
   echo "       -l: peer logging level [(default = not set)|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG]"
   echo "       -d: peer ledger state DB [goleveldb|couchdb], default=goleveldb"
   echo " "
   echo "    orderer environment variables"
   echo "       -t: orderer type [solo|kafka|etcdraft] "
   echo "       -q: orderer logging level [(default = not set)|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG]"
   echo " "
   echo "Example:"
   echo "   ./gen_network.sh -a create -x 2 -p 2 -r 2 -o 1 -k 1 -z 1 -t kafka -d goleveldb -F /root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config -G /opt/hyperledger/fabric/msp/crypto-config "
   echo "   ./gen_network.sh -a create -x 2 -p 2 -r 2 -o 1 -k 1 -z 1 -t kafka -d goleveldb -F /root/gopath/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config -G /opt/hyperledger/fabric/msp/crypto-config -S enabled "
   echo " "
   exit
}

#init var
Req="create"
nBroker=0
nReplica=0
nZoo=0
nPeerPerOrg=1
nOrg=1
nOrderer=1
nCA=0
MSPDIR="$GOPATH/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config"
SRCMSPDIR="/opt/hyperledger/fabric/msp/crypto-config"
TLSEnabled="disabled"
MutualTLSEnabled="disabled"
db="goleveldb"
comName="example.com"
orgMap=
PEER_FABRIC_LOGGING_SPEC=ERROR
ORDERER_FABRIC_LOGGING_SPEC=ERROR

while getopts ":x:z:l:q:d:t:a:o:k:e:p:r:F:G:S:m:C:M:" opt; do
  case $opt in
    # peer environment options
    S)
      TLSEnabled=$OPTARG
      export TLSEnabled=$TLSEnabled
      echo "TLSEnabled: $TLSEnabled"
      ;;
    m)
      MutualTLSEnabled=$OPTARG
      export MutualTLSEnabled=$MutualTLSEnabled
      echo "MutualTLSEnabled: $MutualTLSEnabled"
      ;;
    x)
      nCA=$OPTARG
      echo "number of CA: $nCA"
      ;;
    l)
      PEER_FABRIC_LOGGING_SPEC=$OPTARG
      export PEER_FABRIC_LOGGING_SPEC=$PEER_FABRIC_LOGGING_SPEC
      echo "Peer FABRIC_LOGGING_SPEC=$PEER_FABRIC_LOGGING_SPEC"
      ;;
    d)
      db=$OPTARG
      echo "ledger state database type: $db"
      ;;

    # orderer environment options
    F)
      MSPDIR=$OPTARG
      export MSPDIR=$MSPDIR
      echo "MSPDIR: $MSPDIR"
      ;;
    G)
      SRCMSPDIR=$OPTARG
      export SRCMSPDIR=$SRCMSPDIR
      echo "SRCMSPDIR: $SRCMSPDIR"
      ;;

    t)
      CONFIGTX_ORDERER_ORDERERTYPE=$OPTARG
      export CONFIGTX_ORDERER_ORDERERTYPE=$CONFIGTX_ORDERER_ORDERERTYPE
      echo "CONFIGTX_ORDERER_ORDERERTYPE: $CONFIGTX_ORDERER_ORDERERTYPE"
      if [ $nBroker == 0 ] && [ $CONFIGTX_ORDERER_ORDERERTYPE == 'kafka' ]; then
          nBroker=1   # must have at least 1
      fi
      ;;
    q)
      ORDERER_FABRIC_LOGGING_SPEC=$OPTARG
      export ORDERER_FABRIC_LOGGING_SPEC=$ORDERER_FABRIC_LOGGING_SPEC
      echo "Orderer FABRIC_LOGGING_SPEC=$ORDERER_FABRIC_LOGGING_SPEC"
      ;;

    # network options
    a)
      Req=$OPTARG
      echo "action: $Req"
      ;;
    k)
      nBroker=$OPTARG
      echo "# of Broker: $nBroker"
      ;;
    e)
      nReplica=$OPTARG
      echo "# of Replica: $nReplica"
      ;;
    z)
      nZoo=$OPTARG
      echo "number of zookeeper: $Zoo"
      ;;
    p)
      nPeerPerOrg=$OPTARG
      echo "# of peer per org: $nPeerPerOrg"
      ;;

    r)
      nOrg=$OPTARG
      echo "# of nOrg: $nOrg"
      ;;

    o)
      nOrderer=$OPTARG
      echo "# of orderer: $nOrderer"
      ;;

    C)
      comName=$OPTARG
      export comName=$comName
      echo "comName: $comName"
      ;;

    M)
      orgMap=$OPTARG
      echo "orgMap: $orgMap"
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

if [ $nBroker -gt 0 ] && [ $CONFIGTX_ORDERER_ORDERERTYPE == 'solo' ]; then
    echo "reset Broker number to 0 due to the CONFIGTX_ORDERER_ORDERERTYPE=$CONFIGTX_ORDERER_ORDERERTYPE"
    nBroker=0
fi

if [ $nReplica -le 0 ]; then
    nReplica=$nBroker
fi

myOS=`uname -s`
echo "Operating System: $myOS"

# get current dir for CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE
CWD=${PWD##*/}
HOSTCONFIG_NETWORKMODE="$CWD"
dbType="$db"

if [ "$myOS" != 'Darwin' ]; then
    # macOS cannot run awk, but on Linux we can do better to convert to lowercase
    dbType=`echo "$db" | awk '{print tolower($0)}'`
    HOSTCONFIG_NETWORKMODE=$(echo $CWD | awk '{print tolower($CWD)}')
fi
export HOSTCONFIG_NETWORKMODE=$HOSTCONFIG_NETWORKMODE
echo "HOSTCONFIG_NETWORKMODE: $HOSTCONFIG_NETWORKMODE"

echo "action=$Req nPeerPerOrg=$nPeerPerOrg nBroker=$nBroker nReplica=$nReplica nOrderer=$nOrderer dbType=$dbType"
VP=`docker ps -a | grep 'peer node start' | wc -l`
echo "existing peers: $VP"


echo "remove old docker-composer.yml"
rm -f docker-compose.yml

#echo "docker pull https://hub.docker.com/r/rameshthoomu/fabric-ccenv-x86_64:x86_64-0.7.0-snapshot-b291705"
#docker pull rameshthoomu/fabric-ccenv-x86_64

# form json input file
if [ $nBroker == 0 ]; then
    #jsonFILE="network_solo.json"
    jsonFILE="network.json"
else
#    jsonFILE="network_kafka.json"
    jsonFILE="network.json"
fi
echo "jsonFILE $jsonFILE"

# create docker compose yml
if [ $Req == "add" ]; then
    N1=$[ nPeerPerOrg * nOrg + VP]
    N=$[N1]
    VPN="peer"$[N-1]
else
    N1=$[ nPeerPerOrg * nOrg ]
    N=$[N1 - 1]
    VPN="peer"$N
fi

## echo "N1=$N1 VP=$VP nPeerPerOrg=$nPeerPerOrg VPN=$VPN"

echo "node json2yml.js $jsonFILE $nPeerPerOrg $nOrderer $nBroker $nZoo $nOrg $dbType $nCA $nReplica"

node json2yml.js $jsonFILE $nPeerPerOrg $nOrderer $nBroker $nZoo $nOrg $dbType $nCA $nReplica

#fix CA _sk in docker-compose.yml
CWD=$PWD
echo $CWD
echo "GOPATH: $GOPATH"

myOS=`uname -s`
if [ "$myOS" == 'Darwin' ]; then
   sedOpt="-it"
else
   sedOpt="-i"
fi
echo "$0: myOS: $myOS, sedOpt: $sedOpt"

for (( i=0; i<$nCA; i++ ))
do
    j=$[ i + 1 ]
    simpleOrgName=org$j
    orgName=org$j
    if [ ! -z $orgMap ] && [ -f $orgMap ]
    then
        onVal=$(jq .$orgName $orgMap)
        if [ ! -z $onVal ] && [ $onVal != "null" ]
        then
            # Strip quotes from onVal if they are present
            if [ ${onVal:0:1} == "\"" ]
            then
                onVal=${onVal:1}
            fi
            let "ONLEN = ${#onVal} - 1"
            if [ ${onVal:$ONLEN:1} == "\"" ]
            then
                onVal=${onVal:0:$ONLEN}
            fi
            orgName=$onVal
        fi
    fi
    simpleOrgMSP=PeerOrg$j
    orgMSP=PeerOrg$j
    if [ ! -z $orgMap ] && [ -f $orgMap ]
    then
        omVal=$(jq .$orgMSP $orgMap)
        if [ ! -z $omVal ] && [ $omVal != "null" ]
        then
            # Strip quotes from omVal if they are present
            if [ ${omVal:0:1} == "\"" ]
            then
                omVal=${omVal:1}
            fi
            let "OMLEN = ${#omVal} - 1"
            if [ ${omVal:$OMLEN:1} == "\"" ]
            then
                omVal=${omVal:0:$OMLEN}
            fi
            orgMSP=$omVal
        fi
    fi
    Dir=$MSPDIR/peerOrganizations/$orgName"."$comName"/ca"
    cd $Dir
    tt=`ls *sk`

    cd $CWD

    sed $sedOpt "s/CA_SK$i/$tt/g" docker-compose.yml
    sed $sedOpt "s/$simpleOrgName/$orgName/g" docker-compose.yml
    sed $sedOpt "s/$simpleOrgMSP/$orgMSP/g" docker-compose.yml

done

## sed 's/-x86_64/TEST/g' docker-compose.yml > ss.yml
## cp ss.yml docker-compose.yml
# create network
if [ $Req == "create" ]; then

   #docker-compose -f docker-compose.yml up -d --force-recreate cli $VPN
   docker-compose -f docker-compose.yml up -d --force-recreate
   #docker-compose -f docker-compose.yml up -d --force-recreate $VPN
   ##docker-compose -f docker-compose.yml up -d --force-recreate $VPN
   #for ((i=1; i<$nOrderer; i++))
   #do
       #tmpOrd="orderer"$i
       #docker-compose -f docker-compose.yml up -d $tmpOrd
   #done
fi

if [ $Req == "add" ]; then
   docker-compose -f docker-compose.yml up -d $VPN

fi

exit
