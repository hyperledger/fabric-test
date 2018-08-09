#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./gen_configtx_cfg.sh [opt] [value]
#

HostIP1="0.0.0.0"
HostPort=7050
ordererPort=5005
kafkaPort=9092
peerPort=7061

function printHelp {
   echo "Usage: "
   echo " ./gen_configtx_cfg.sh [opt] [value] "
   echo "    -o: number of orderers, default=1"
   echo "    -k: number of kafka, default=0"
   echo "    -p: number of peers per organization, default=1"
   echo "    -h: hash type, default=SHA2"
   echo "    -r: number of organization, default=1"
   echo "    -s: security service type, default=256"
   echo "    -t: orderer service [solo|kafka], default=solo"
   echo "    -f: profile name, default=test"
   echo "    -b: MSP directory, default=$GOPATH/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config"
   echo "    -w: host ip 1, default=0.0.0.0"
   echo "    -c: batch timeout, default=2s"
   echo "    -B: batch size, default=10"
   echo "    -v: array of organization name, default=0"
   echo "    -C: company name, default=example.com"
   echo "    -M: JSON file containing organization and MSP name mappings (optional) "
   echo " "
   echo "Example:"
   echo " ./gen_configtx_cfg.sh -o 1 -k 1 -p 2 -r 2 -h SHA2 -s 256 -t kafka -b $GOPATH/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config -w 10.120.223.35 -v 1 -v 3"
   exit
}

function getIP {
   ik=0
   io=0
   ip=0
   while IFS= read line
   do
       t1=$(echo $line | awk '{print $1}')
       t2=$(echo $line | awk '{print $2}')
       t3=$(echo $line | awk '{print $3}')
       #echo " $t1 $t2 $t3"
       if [ "$t1" == "kafka" ]; then
           ik=$[ ik + 1 ]
           kafkaIP[$ik]=$t2
           kafkaPort[$ik]=$t3
       elif [ "$t1" == "orderer" ]; then
           io=$[ io + 1 ]
           ordererIP[$io]=$t2
           ordererPort[$io]=$t3
       elif [ "$t1" == "peer" ]; then
           ip=$[ ip + 1 ]
           peerIP[$ip]=$t2
           peerPort[$ip]=$t3
       fi

   done < input.txt

   for (( i=1; i <= ${#kafkaIP[@]}; i++ ))
   do
       echo "Kafka: ${kafkaIP[$i]}: ${kafkaPort[$i]}"
   done
   for (( i=1; i <= ${#ordererIP[@]}; i++ ))
   do
       echo "orderer: ${ordererIP[$i]}: ${ordererPort[$i]}"
   done
   for (( i=1; i <= ${#peerIP[@]}; i++ ))
   do
       echo "peer: ${peerIP[$i]}: ${peerPort[$i]}"
   done

}

####getIP

CWD=$PWD
#default vars
inFile=$CWD"/configtx.yaml-in"
cfgOutFile=$CWD"/configtx.yaml"

nOrderer=1
nKafka=0
ordServType="solo"
SecTypenOrderer=1
nOrg=1
peersPerOrg=1
hashType="SHA2"
SecType="256"
PROFILE_STRING="test"
MSPBaseDir=$GOPATH"/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config"
comName="example.com"
batchTimeOut="2s"
batchSize=10
orgMap=

k=0
while getopts ":o:k:p:s:h:r:t:f:b:w:v:c:B:C:M:" opt; do
  case $opt in
    # number of orderers
    o)
      nOrderer=$OPTARG
      echo "nOrderer:  $nOrderer"
      ;;

    # number of kafka
    k)
      nKafka=$OPTARG
      echo "nKafka:  $nKafka"
      ;;

    # number of peers
    p)
      peersPerOrg=$OPTARG
      echo "peersPerOrg: $peersPerOrg"
      ;;

    h)
      hashType=$OPTARG
      echo "hashType:  $hashType"
      ;;

    r)
      nOrg=$OPTARG
      echo "nOrg:  $nOrg"
      ;;

    s)
      SecType=$OPTARG
      echo "SecType:  $SecType"
      ;;

    t)
      ordServType=$OPTARG
      echo "ordServType:  $ordServType"
      ;;

    f)
      PROFILE_STRING=$OPTARG
      echo "PROFILE_STRING:  $PROFILE_STRING"
      ;;

    b)
      MSPBaseDir=$OPTARG
      echo "MSPBaseDir:  $MSPBaseDir"
      ;;

    w)
      HostIP1=$OPTARG
      KafkaAIP=$OPTARG
      peerIP=$OPTARG
      echo "HostIP1:  $HostIP1"
      ;;

    v)
      k=$[ k + 1 ]
      OrgArray[$k]=$OPTARG
      echo "k:  $k, ${#OrgArray[@]}, OrgArray=${OrgArray[@]}"
      ;;

    c)
      batchTimeOut=$OPTARG
      echo "batchTimeOut:  $batchTimeOut"
      ;;

    B)
      batchSize=$OPTARG
      echo "batchSize:  $batchSize"
      ;;

    C)
      comName=$OPTARG
      echo "comName:  $comName"
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


echo "nOrderer=$nOrderer, peersPerOrg=$peersPerOrg, ordServType=$ordServType, nOrg=$nOrg, hashType=$hashType, SecType=$SecType"
echo "MSPBaseDir=$MSPBaseDir"
echo "Host IP=$HostIP1, Port=$HostPort"
echo "Kafka IP=$KafkaAIP, $KafkaBIP, $KafkaCIP"
echo "inFile=$inFile"
echo "cfgOutFile=$cfgOutFile"
echo "OrgArray length=${#OrgArray[@]}, OrgArray=${OrgArray[@]}"

# sanity check on OrgArray
if (( ${#OrgArray[@]} > $nOrg )); then
   echo "invalid number of org "
   exit
elif [ ${#OrgArray[@]} = 0 ]; then
   for (( i=1; i <= $nOrg; i++ ))
   do
       OrgArray[$i]=$i
   done
fi
#echo "after loop OrgArray length=${#OrgArray[@]}, OrgArray=${OrgArray[@]}"
#begin process
#remove existing cfgOutFile
rm -f $cfgOutFile

#begin process
while IFS= read line
do
    t1=$(echo $line | awk '{print $1}')
    t2=$(echo $line | awk '{print $2}')
    #echo "$line"
    #echo "t1:t2=$t1:$t2"
      #Profiles
      if [ "$t2" == "*PeerOrg" ]; then
          for (( i=1; i<=${#OrgArray[@]}; i++ ))
          do
              tmp=${OrgArray[$i]}
              orgMSP=PeerOrg$tmp
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
              echo "                - *$orgMSP" >> $cfgOutFile
          done

      elif [ "$t1" == "OrdererType:" ]; then
          echo "    $t1 $ordServType" >> $cfgOutFile

      elif [ "$t1" == "&ProfileOrderString" ]; then
          tmp=$PROFILE_STRING"OrgsOrdererGenesis"
          echo "    $tmp:" >> $cfgOutFile
          tmp="<<: *ChannelDefaults"
          echo "        $tmp" >> $cfgOutFile

      elif [ "$t1" == "&ProfileOrgString" ]; then
          tmp=$PROFILE_STRING"orgschannel"
          echo "    $tmp:" >> $cfgOutFile

      elif [ "$t1" == "Addresses:" ]; then
          echo "$line" >> $cfgOutFile
          #echo "         - $peerIP":"$ordererPort, $peerIP":"$[ ordererPort + 1 ], $peerIP":"$[ ordererPort + 2 ]" >> $cfgOutFile
          #tmp="orderer1."$comName":"$ordererPort
          tmpPort=$ordererPort
          for (( i=1; i<=$nOrderer; i++  ))
          do
              j=$[ i - 1 ]
              tmpAddr="orderer"$j"."$comName
              tmpPort=$[ ordererPort + j ]
              tmp=$tmpAddr":"$tmpPort
              ##tmp=$tmpAddr":7050"
              echo "         - $tmp" >> $cfgOutFile
          done

      elif [ "$t1" == "Brokers:" ]; then
          echo "        $t1" >> $cfgOutFile
          for (( i=0; i<$nKafka; i++  ))
          do
              echo "             - kafka"$i":"$kafkaPort >> $cfgOutFile
          done

      elif [ "$t1" == "BatchTimeout:" ]; then
          echo "    $t1 $batchTimeOut" >> $cfgOutFile

      elif [ "$t1" == "MaxMessageCount:" ]; then
          echo "        $t1 $batchSize" >> $cfgOutFile

      elif [ "$t2" == "*OrdererOrg" ]; then
          echo "*OrdererOrg ... "
          #Save this idea for later; the cryptogen tool version only supports one OrdererOrg for now.
          #for (( i=1; i<=$nOrderer; i++ ))
          for (( i=1; i<=1; i++ ))
          do
             echo "                - $t2" >> $cfgOutFile
             #echo "                - $t2$i" >> $cfgOutFile
          done

      elif [ "$t2" == "&OrdererOrg" ]; then
          echo "&OrdererOrg ... "
          #Save this idea for later; the cryptogen tool version only supports one OrdererOrg for now.
          #We will have to figure out which Orderers are in which Orgs - the same way cryptogen does it.
          #for (( i=1; i<=$nOrderer; i++ ))
          for (( i=1; i<=1; i++ ))
          do
             j=$[ peersPerOrg * ( i - 1 ) + 1 ]
             #tmp="OrdererOrg"$i
             tmp="OrdererOrg"
             tt="Orderer"$i"MSP"
             echo "    - &$tmp" >> $cfgOutFile
             echo "        Name: $tmp" >> $cfgOutFile
             echo "        ID: $tmp" >> $cfgOutFile
             #echo "        ID: $tt" >> $cfgOutFile
             ordDir=$MSPBaseDir"/ordererOrganizations/"$comName"/msp"
             echo "        MSPDir: $ordDir" >> $cfgOutFile
             ordMSP="OrdererOrg"
             echo "        Policies:" >> $cfgOutFile
             echo "            Readers:" >> $cfgOutFile
             echo "                Type: Signature" >> $cfgOutFile
             echo "                Rule: \"OR('$ordMSP.member')\"" >> $cfgOutFile
             echo "            Writers:" >> $cfgOutFile
             echo "                Type: Signature" >> $cfgOutFile
             echo "                Rule: \"OR('$ordMSP.member')\"" >> $cfgOutFile
             echo "            Admins:" >> $cfgOutFile
             echo "                Type: Signature" >> $cfgOutFile
             echo "                Rule: \"OR('$ordMSP.admin')\"" >> $cfgOutFile

             echo "" >> $cfgOutFile
#             echo "        BCCSP:" >> $cfgOutFile
#             echo "            Default: SW" >> $cfgOutFile
#             echo "            SW:" >> $cfgOutFile
#             echo "                Hash: $hashType" >> $cfgOutFile
#             echo "                Security: $SecType" >> $cfgOutFile
#             echo "                FileKeyStore:" >> $cfgOutFile
#             echo "                    KeyStore:" >> $cfgOutFile
             echo "" >> $cfgOutFile

          done
      elif [ "$t2" == "&PeerOrg" ]; then
          for (( i=1; i<=$nOrg; i++ ))
          do
             j=$[ peersPerOrg * ( i - 1 ) + 1 ]
             #orgMSP="PeerOrg"$i"MSP"
             orgMSP="PeerOrg"$i
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
             echo "    - &$orgMSP" >> $cfgOutFile
             tmp="Peer"$i"MSP"
             echo "        Name: $orgMSP" >> $cfgOutFile
             echo "        ID: $orgMSP" >> $cfgOutFile
             #echo "        ID: $tmp" >> $cfgOutFile
             orgName="org"$i
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
             peerDir=$MSPBaseDir"/peerOrganizations/"$orgName"."$comName"/msp"
             echo "        MSPDir: $peerDir" >> $cfgOutFile
             echo "        Policies:" >> $cfgOutFile
             echo "            Readers:" >> $cfgOutFile
             echo "                Type: Signature" >> $cfgOutFile
             echo "                Rule: \"OR('$orgMSP.admin', '$orgMSP.peer')\"" >> $cfgOutFile
             echo "            Writers:" >> $cfgOutFile
             echo "                Type: Signature" >> $cfgOutFile
             echo "                Rule: \"OR('$orgMSP.admin', '$orgMSP.client')\"" >> $cfgOutFile
             echo "            Admins:" >> $cfgOutFile
             echo "                Type: Signature" >> $cfgOutFile
             echo "                Rule: \"OR('$orgMSP.admin')\"" >> $cfgOutFile

             echo "" >> $cfgOutFile
#             echo "        BCCSP:" >> $cfgOutFile
#             echo "            Default: SW" >> $cfgOutFile
#             echo "            SW:" >> $cfgOutFile
#             echo "                Hash: $hashType" >> $cfgOutFile
#             echo "                Security: $SecType" >> $cfgOutFile
#             echo "                FileKeyStore:" >> $cfgOutFile
#             echo "                    KeyStore:" >> $cfgOutFile
             echo "" >> $cfgOutFile

             #tmpPort=$[ HostPort + peersPerOrg * ( i - 1 ) ]
             tmpPort=$[ peerPort + peersPerOrg * ( i - 1 ) ]
             ###tmpPort=7051
             tmpHost="peer0."$orgName"."$comName
             echo "        AnchorPeers:" >> $cfgOutFile
             echo "            - Host: $tmpHost" >> $cfgOutFile
             echo "              Port: $tmpPort" >> $cfgOutFile
             echo "" >> $cfgOutFile

          done

      else
          echo "$line" >> $cfgOutFile
      fi

done < "$inFile"

exit

