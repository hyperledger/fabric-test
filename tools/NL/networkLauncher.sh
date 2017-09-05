#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# default directories
FabricDir="$GOPATH/src/github.com/hyperledger/fabric"
MSPDir="$GOPATH/src/github.com/hyperledger/fabric/common/tools/cryptogen"
SRCMSPDir="/opt/hyperledger/fabric/msp/crypto-config"

function printHelp {

   echo "Usage: "
   echo " ./networkLauncher.sh [opt] [value] "
   echo "    -a: network action [up|down], default=up"
   echo "    -x: number of ca, default=0"
   echo "    -d: ledger database type, default=goleveldb"
   echo "    -f: profile string, default=test"
   echo "    -h: hash type, default=SHA2"
   echo "    -k: number of kafka, default=solo"
   echo "    -z: number of zookeepers, default=0"
   echo "    -n: number of channels, default=1"
   echo "    -o: number of orderers, default=1"
   echo "    -p: number of peers per organization, default=1"
   echo "    -r: number of organizations, default=1"
   echo "    -s: security type, default=256"
   echo "    -t: ledger orderer service type [solo|kafka], default=solo"
   echo "    -w: host ip, default=0.0.0.0"
   echo "    -F: local MSP base directory, default=$GOPATH/src/github.com/hyperledger/fabric/common/tools/cryptogen/"
   echo "    -G: src MSP base directory, default=/opt/hyperledger/fabric/msp/crypto-config"
   echo "    -S: TLS enablement [enabled|disabled], default=disabled"
   echo "    -C: company name, default=example.com "
   echo " "
   echo " example: "
   echo " ./networkLauncher.sh -o 1 -x 2 -r 2 -p 2 -k 1 -n 2 -t kafka -f test -w 10.120.223.35 "
   echo " ./networkLauncher.sh -o 1 -x 2 -r 2 -p 2 -n 1 -f test -w 10.120.223.35 "
   echo " ./networkLauncher.sh -o 1 -x 2 -r 2 -p 2 -k 1 -n 2 -t kafka -f test -w 10.120.223.35 -S enabled "
   echo " ./networkLauncher.sh -o 4 -x 2 -r 2 -p 2 -k 4 -z 4 -n 2 -t kafka -f test -w localhost -S enabled "
   echo " ./networkLauncher.sh -o 3 -x 6 -r 6 -p 2 -k 3 -z 3 -n 3 -t kafka -f test -w localhost -S enabled "
   exit
}

#defaults
PROFILE_STRING="test"
ordServType="solo"
nKafka=0
nZoo=0
nCA=0
nOrderer=1
nOrg=1
nPeersPerOrg=1
ledgerDB="goleveldb"
hashType="SHA2"
secType="256"
CryptoBaseDir=$GOPATH/src/github.com/hyperledger/fabric/common/tools/cryptogen
nChannel=1
HostIP1="0.0.0.0"
comName="example.com"
networkAction="up"
BuildDir=$GOPATH/src/github.com/hyperledger/fabric/build/bin

while getopts ":a:z:x:d:f:h:k:n:o:p:r:t:s:w:F:G:S:C:" opt; do
  case $opt in
    # peer environment options
    a)
      tt=$OPTARG
      networkAction=$(echo $tt | awk '{print tolower($tt)}')
      echo "network action: $networkAction"
      ;;
    x)
      nCA=$OPTARG
      echo "number of CA: $nCA"
      ;;
    d)
      ledgerDB=$OPTARG
      echo "ledger state database type: $ledgerDB"
      ;;

    f)
      PROFILE_STRING=$OPTARG
      echo "PROFILE_STRING: $PROFILE_STRING"
      ;;

    h)
      hashType=$OPTARG
      echo "hash type: $hashType"
      ;;

    k)
      nKafka=$OPTARG
      echo "number of kafka: $nKafka"
      ;;

    z)
      nZoo=$OPTARG
      echo "number of zookeeper: $nZoo"
      ;;
    n)
      nChannel=$OPTARG
      echo "number of channels: $nChannel"
      ;;

    o)
      nOrderer=$OPTARG
      echo "number of orderers: $nOrderer"
      ;;

    p)
      nPeersPerOrg=$OPTARG
      echo "number of peers: $nPeersPerOrg"
      ;;

    r)
      nOrg=$OPTARG
      echo "number of organizations: $nOrg"
      ;;

    s)
      secType=$OPTARG
      echo "security type: $secType"
      ;;

    t)
      ordServType=$OPTARG
      echo "orderer service type: $ordServType"
      ;;

    w)
      HostIP1=$OPTARG
      echo "HostIP1:  $HostIP1"
      ;;

    F)
      MSPDir=$OPTARG
      export MSPDIR=$MSPDir
      echo "MSPDir: $MSPDir"
      ;;

    G)
      SRCMSPDir=$OPTARG
      export SRCMSPDIR=$SRCMSPDir
      echo "SRCMSPDir: $SRCMSPDir"
      ;;

    S)
      TLSEnabled=`echo $OPTARG | tr [A-Z] [a-z]`
      if [ $TLSEnabled == "enabled" ]; then
          TLSDir=$CryptoBaseDir"/crypto-config"
      fi
      echo "TLSDir: $TLSDir"
      ;;

    C)
      comName=$OPTARG
      echo "comName: $comName"
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

#first handle network action: up|down
if [ $networkAction == "down" ]; then
    ./cleanNetwork.sh $comName
    exit;
elif [ $networkAction != "up" ]; then
    echo "invalid network action option: $networkAction"
    printHelp
    exit;
fi

#if [ $nCA -eq 0 ]; then
#   nCA=$nOrg
#fi

# sanity check
echo " PROFILE_STRING=$PROFILE_STRING, ordServType=$ordServType, nKafka=$nKafka, nOrderer=$nOrderer, nZoo=$nZoo"
echo " nOrg=$nOrg, nPeersPerOrg=$nPeersPerOrg, ledgerDB=$ledgerDB, hashType=$hashType, secType=$secType, comName=$comName"

CHAN_PROFILE=$PROFILE_STRING"Channel"
ORDERER_PROFILE=$PROFILE_STRING"OrgsOrdererGenesis"
ORG_PROFILE=$PROFILE_STRING"orgschannel"

CWD=$PWD
echo "current working directory: $CWD"
echo "GOPATH=$GOPATH"

echo " "
echo "        ####################################################### "
echo "        #                generate crypto-config.yaml          # "
echo "        ####################################################### "
echo "generate crypto-config.yaml ..."
rm -f crypto-config.yaml
echo "./gen_crypto_cfg.sh -o $nOrderer -r $nOrg -p $nPeersPerOrg -C $comName"
./gen_crypto_cfg.sh -o $nOrderer -r $nOrg -p $nPeersPerOrg -C $comName

echo " "
echo "        ####################################################### "
echo "        #                execute cryptogen                    # "
echo "        ####################################################### "
echo "generate crypto ..."
CRYPTOEXE=$BuildDir/cryptogen
CRYPTOCFG=$CWD/crypto-config.yaml
cd $CryptoBaseDir
# remove existing crypto-config
rm -rf crypto-config
echo "current working directory: $PWD"
if [ ! -f $CRYPTOEXE ]; then
echo "build $CRYPTOEXE "
    cd $FabricDir
    make cryptogen
fi
cd $CWD
echo "current working directory: $PWD"

echo "$CRYPTOEXE generate --output=$MSPDir/crypto-config --config=$CRYPTOCFG"
$CRYPTOEXE generate --output=$MSPDir/crypto-config --config=$CRYPTOCFG

echo " "
echo "        ####################################################### "
echo "        #                 generate configtx.yaml              # "
echo "        ####################################################### "
echo " "
echo "generate configtx.yaml ..."
cd $CWD
echo "current working directory: $PWD"

echo "./gen_configtx_cfg.sh -o $nOrderer -k $nKafka -p $nPeersPerOrg -r $nOrg -h $hashType -s $secType -t $ordServType -f $PROFILE_STRING -w $HostIP1 -C $comName -b $MSPDir/crypto-config"
./gen_configtx_cfg.sh -o $nOrderer -k $nKafka -p $nPeersPerOrg -r $nOrg -h $hashType -s $secType -t $ordServType -f $PROFILE_STRING -w $HostIP1 -C $comName -b $MSPDir/crypto-config

echo " "
echo "        ####################################################### "
echo "        #         create orderer genesis block                # "
echo "        ####################################################### "
echo " "
CFGEXE=$BuildDir/configtxgen
ordererDir=$MSPDir/crypto-config/ordererOrganizations
#cp configtx.yaml $FabricDir"/common/configtx/tool"
#cd $CFGGenDir
if [ ! -f $CFGEXE ]; then
    cd $FabricDir
    make configtxgen
fi
#create orderer blocks
cd $CWD
echo "current working directory: $PWD"
ordBlock=$ordererDir/orderer.block
echo "$CFGEXE -profile $ORDERER_PROFILE -outputBlock $ordBlock"
$CFGEXE -profile $ORDERER_PROFILE -outputBlock $ordBlock

#create channels configuration transaction
echo " "
echo "        ####################################################### "
echo "        #     create channel configuration transaction        # "
echo "        ####################################################### "
echo " "
for (( i=1; i<=$nChannel; i++ ))
do
    channelTx=$ordererDir"/"$ORG_PROFILE$i".tx"
    #channelTx=$ordererDir"/mychannel.tx"
    echo "$CFGEXE -profile $ORG_PROFILE -channelID $ORG_PROFILE"$i" -outputCreateChannelTx $channelTx"
    $CFGEXE -profile $ORG_PROFILE -channelID $ORG_PROFILE"$i" -outputCreateChannelTx $channelTx
done

echo " "
echo "        ####################################################### "
echo "        #                   bring up network                  # "
echo "        ####################################################### "
echo " "
echo "generate docker-compose.yml ..."
echo "current working directory: $PWD"
nPeers=$[ nPeersPerOrg * nOrg ]
echo "number of peers: $nPeers"
echo "./gen_network.sh -a create -x $nCA -p $nPeersPerOrg -r $nOrg -o $nOrderer -k $nKafka -z $nZoo -t $ordServType -d $ordServType -F $MSPDir -G $SRCMSPDir -S $TLSDir"
if [ -z $TLSDir ]; then
    ./gen_network.sh -a create -x $nCA -p $nPeersPerOrg -r $nOrg -o $nOrderer -k $nKafka -z $nZoo -t $ordServType -d $ordServType -F $MSPDir -G $SRCMSPDir -C $comName
else
    ./gen_network.sh -a create -x $nCA -p $nPeersPerOrg -r $nOrg -o $nOrderer -k $nKafka -z $nZoo -t $ordServType -d $ordServType -F $MSPDir -G $SRCMSPDir -S $TLSDir -C $comName
fi

