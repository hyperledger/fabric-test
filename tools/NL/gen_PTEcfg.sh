#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./gen_PTEcfg.sh [opt] [value]
#

HostIP="localhost"
HostPort=7050
ordererBasePort=5005
CAPort=7054
peerBasePort=7061
peerEventBasePort=6051

function printHelp {
   echo "Usage: "
   echo " ./gen_PTEcfg.sh [opt] [value] "
   echo "    -o: number of orderers, default=1"
   echo "    -p: number of peers per organization, default=1"
   echo "    -r: number of organizations, default=1"
   echo "    -n: number of channels, default=1"
   echo "    -x: number of ca, default=1"
   echo "    -b: MSP directory, default=src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config"
   echo "    -w: host ip, default=localhost"
   echo "    -C: company name, default=example.com"
   echo "    -M: JSON file containing organization and MSP name mappings (optional) "
   echo " "
   echo "Example:"
   echo " ./gen_PTEcfg.sh -n 3 -o 3 -p 2 -r 6 -x 6"
   exit
}


CWD=$PWD

#default vars
nOrderer=1
nOrg=1
nCA=1
nPeersPerOrg=1
nChannel=1
nOrgPerChannel=1
MSPBaseDir="src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/crypto-config"
ordererBaseDir=$MSPBaseDir"/ordererOrganizations"
peerBaseDir=$MSPBaseDir"/peerOrganizations"
comName="example.com"
orgMap=

while getopts ":o:p:r:n:x:b:w:C:M:" opt; do
  case $opt in
    # number of orderers
    o)
      nOrderer=$OPTARG
      echo "nOrderer:  $nOrderer"
      ;;

    # number of peers per org
    p)
      nPeersPerOrg=$OPTARG
      echo "nPeersPerOrg: $nPeersPerOrg"
      ;;

    # number of org
    r)
      nOrg=$OPTARG
      echo "nOrg:  $nOrg"
      ;;

    # number of channel
    n)
      nChannel=$OPTARG
      echo "number of channels: $nChannel"
      ;;

    # number of ca
    x)
      nCA=$OPTARG
      echo "number of CA: $nCA"
      ;;

    # MSP base dir
    b)
      MSPBaseDir=$OPTARG
      echo "MSPBaseDir:  $MSPBaseDir"
      ;;

    # host IP
    w)
      HostIP=$OPTARG
      echo "HostIP:  $HostIP"
      ;;

    # company name
    C)
      comName=$OPTARG
      echo "comName:  $comName"
      ;;

    # filenames containing organization and MSP names
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


echo "nOrderer=$nOrderer, nPeersPerOrg=$nPeersPerOrg, nOrg=$nOrg, nChannel=$nChannel, nCA=$nCA"
echo "GOPATH: $GOPATH"
if echo "$MSPBaseDir" | grep -q "$GOPATH"; then
    echo "remove gopath from MSPBaseDir"
    prelength=${#GOPATH}
    len1=$[prelength+2]
    len2=${#MSPBaseDir}
    MM=$(echo $MSPBaseDir | cut -c $len1-$len2)
    MSPBaseDir=$MM"/crypto-config"
fi
echo "MSPBaseDir=$MSPBaseDir"
nOrgPerChannel=$nOrg
echo "nOrgPerChannel: $nOrgPerChannel"


function outOrderer {
    adminPath=$ordererBaseDir"/"$comName"/users/Admin@"$comName"/msp"

    lastOrderer=$[nOrderer-1]
    for (( i=0; i<$nOrderer; i++ ))
    do
        ordererid="orderer"$i

        tmp="            \"$ordererid\": {" >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"name\": \"OrdererOrg\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"mspid\": \"OrdererOrg\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"mspPath\": \"$MSPBaseDir\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"adminPath\": \"$adminPath\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"comName\": \"$comName\"," >> $scOfile
        echo "$tmp" >> $scOfile

        urlPort=$[ordererBasePort+i]
        url="grpcs://"$HostIP":"$urlPort
        tmp="                \"url\": \"$url\"," >> $scOfile
        echo "$tmp" >> $scOfile

        ordererCom=$ordererid"."$comName
        tmp="                \"server-hostname\": \"$ordererCom\"," >> $scOfile
        echo "$tmp" >> $scOfile

        ordererTlsCert=$ordererBaseDir"/"$comName"/orderers/"$ordererid"."$comName"/msp/tlscacerts/tlsca."$comName"-cert.pem"
        tmp="                \"tls_cacerts\": \"$ordererTlsCert\"" >> $scOfile
        echo "$tmp" >> $scOfile

        if [ $i -ne $lastOrderer ]; then
            tmp="            }," >> $scOfile
            echo "$tmp" >> $scOfile
        else
            tmp="            }" >> $scOfile
            echo "$tmp" >> $scOfile
            if [ $nOrgPerChannel -eq 0 ]; then
                tmp="        }" >> $scOfile
            else
                tmp="        }," >> $scOfile
            fi
            echo "$tmp" >> $scOfile
        fi
    done
}

function outOrg {
    # org/peer
    ordID=0
    caID=0
    for (( i=1; i<=$nOrgPerChannel; i++ ))
    do
        peerid=$i

        orgid="org"$peerid
        if [ ! -z $orgMap ] && [ -f $orgMap ]
        then
            oiVal=$(jq .$orgid $orgMap)
            if [ ! -z $oiVal ] && [ $oiVal != "null" ]
            then
                # Strip quotes from oiVal if they are present
                if [ ${oiVal:0:1} == "\"" ]
                then
                    oiVal=${oiVal:1}
                fi
                let "OILEN = ${#oiVal} - 1"
                if [ ${oiVal:$OILEN:1} == "\"" ]
                then
                    oiVal=${oiVal:0:$OILEN}
                fi
                orgid=$oiVal
            fi
        fi
        adminPath=$peerBaseDir"/"$orgid"."$comName"/users/Admin@"$orgid"."$comName"/msp"
        orgPeer="PeerOrg"$peerid
        if [ ! -z $orgMap ] && [ -f $orgMap ]
        then
            opVal=$(jq .$orgPeer $orgMap)
            if [ ! -z $opVal ] && [ $opVal != "null" ]
            then
                # Strip quotes from opVal if they are present
                if [ ${opVal:0:1} == "\"" ]
                then
                    opVal=${opVal:1}
                fi
                let "OPLEN = ${#opVal} - 1"
                if [ ${opVal:$OPLEN:1} == "\"" ]
                then
                    opVal=${opVal:0:$OPLEN}
                fi
                orgPeer=$opVal
            fi
        fi
        tmp="        \"$orgid\": {" >> $scOfile
        echo "$tmp" >> $scOfile

        tmp="                \"name\": \"$orgPeer\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"mspid\": \"$orgPeer\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"mspPath\": \"$MSPBaseDir\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"adminPath\": \"$adminPath\"," >> $scOfile
        echo "$tmp" >> $scOfile
        tmp="                \"comName\": \"$comName\"," >> $scOfile
        echo "$tmp" >> $scOfile

        if [ $nOrderer -gt 0 ]; then
            ordID=$(( (n-1) % nOrderer ))
            tmp="                \"ordererID\": \"orderer$ordID\"," >> $scOfile
            echo "$tmp" >> $scOfile
        else
            echo "Error: no orderer number is specified."
            exit 1
        fi

        if [ $nCA -gt 0 ]; then
            tmp="                \"ca\": {" >> $scOfile
            echo "$tmp" >> $scOfile
            caID=$(( caID % nCA ))
            capid=$(( CAPort + caID ))
            caPort="https://"$HostIP":"$capid
            tmp="                    \"url\": \"$caPort\"," >> $scOfile
            echo "$tmp" >> $scOfile
            caName="ca"$caID
            caID=$(( caID + 1 ))
            tmp="                    \"name\": \"$caName\"" >> $scOfile
            echo "$tmp" >> $scOfile
            tmp="                }," >> $scOfile
            echo "$tmp" >> $scOfile

            tmp="                \"username\": \"admin\"," >> $scOfile
            echo "$tmp" >> $scOfile
            tmp="                \"secret\": \"adminpw\"," >> $scOfile
            echo "$tmp" >> $scOfile
        fi


        # peer per org
        for (( j=1; j<=$nPeersPerOrg; j++ ))
        do
            orgCom=$orgid"."$comName
            orgTlscaCert=$peerBaseDir"/"$orgCom"/tlsca/tlsca."$orgCom"-cert.pem"

            j0=$(( j - 1 ))
            peerID="peer"$j
            tmp="                \"$peerID\": {" >> $scOfile
            echo "$tmp" >> $scOfile
            peerIP=$(( (i-1)*nPeersPerOrg + j0 + peerBasePort ))
            peerTmp="grpcs://"$HostIP":"$peerIP
            tmp="                    \"requests\": \"$peerTmp\"," >> $scOfile
            echo "$tmp" >> $scOfile
            eventIP=$(( (i-1)*nPeersPerOrg + j0 + peerEventBasePort ))
            eventTmp="grpcs://"$HostIP":"$eventIP
            tmp="                    \"events\": \"$eventTmp\"," >> $scOfile
            echo "$tmp" >> $scOfile
            sHost="peer"$j0"."$orgid"."$comName
            tmp="                    \"server-hostname\": \"$sHost\"," >> $scOfile
            echo "$tmp" >> $scOfile
            tmp="                    \"tls_cacerts\": \"$orgTlscaCert\"" >> $scOfile
            echo "$tmp" >> $scOfile

            if [ $j -ne $nPeersPerOrg ]; then
                tmp="                }," >> $scOfile
                echo "$tmp" >> $scOfile
            else
                tmp="                }" >> $scOfile
                echo "$tmp" >> $scOfile
            fi
        done

        if [ $i -ne $nOrgPerChannel ]; then
            tmp="        }," >> $scOfile
            echo "$tmp" >> $scOfile
        else
            tmp="        }" >> $scOfile
            echo "$tmp" >> $scOfile
        fi
    done

    tmp="    }" >> $scOfile
    echo "$tmp" >> $scOfile

}

#begin process
for (( n=1; n<=$nChannel; n++ ))
do
    scOfile="config-chan"$n"-TLS.json"
    if [ -e $scOfile ]; then
        rm -f $scOfile
    fi

    ## header
    tmp="{"
    echo "$tmp" >> $scOfile
    tmp="    \"test-network\": {" >> $scOfile
    echo "$tmp" >> $scOfile
    tmp="        \"gopath\": \"GOPATH\"," >> $scOfile
    echo "$tmp" >> $scOfile

    ## orderers
    tmp="        \"orderer\": {" >> $scOfile
    echo "$tmp" >> $scOfile

    ## orderers
    outOrderer

    ## orgs with peers
    if [ $nOrgPerChannel -eq 0 ]; then
        tmp="    }" >> $scOfile
        echo "$tmp" >> $scOfile
    else
        outOrg
    fi

    tmp="}" >> $scOfile
    echo "$tmp" >> $scOfile
done


exit

