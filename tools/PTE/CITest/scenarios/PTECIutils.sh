#!/bin/bash
set -euo pipefail
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test utilits ##########

# common test directories
CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
NLDir=$FabricTestDir"/tools/NL"
PTEDir=$FabricTestDir"/tools/PTE"
CMDDir=$PTEDir"/CITest/scripts"
LOGDir=$PTEDir"/CITest/Logs"

# PTEReport()
# purpose: calcuate TPS and latency statistics from PTE generated report
# $1: input pteReport.txt generated from PTE
# $2: output pteReport.txt which the calcuated results will be appended
PTEReport () {

    if [ $# != 2 ]; then
       echo "[PTEReport] Error: invalid arguments number $# "
       exit 1;
    fi

    # save current working directory
    CurrWD=$PWD

    cd $CMDDir
    # calculate overall TPS and output report
    echo
    node get_pteReport.js $1
    cat $1 >> $2

    # restore working directory
    cd $CurrWD
}


# PTE execution loop
# $1: min channel
# $2: max channel
# $3: channel incrment
# $4: min thread
# $5: max thread
# $6: thread increment
# $7: key increment
# $8: key0
# $9: options string
PTEExecLoop () {

    echo "[PTEExecLoop] number of in var=$#"
    myMinChan=$1
    myMaxChan=$2
    myChanIncr=$3
    myMinTh=$4
    myMaxTh=$5
    myThIncr=$6
    myKeyIncr=$7
    myKey0=$8
    args=$9

    echo "[PTEExecLoop] myMinChan=$myMinChan myMaxChan=$myMaxChan myChanIncr=$myChanIncr"
    echo "[PTEExecLoop] myMinTh=$myMinTh myMaxTh=$myMaxTh myThIncr=$myThIncr"
    echo "[PTEExecLoop] args=${args[@]}"

    # channels loop
    for (( myNCHAN = $myMinChan; myNCHAN <= $myMaxChan; myNCHAN+=$myChanIncr )); do
        # threads loop
        for (( myNTHREAD = $myMinTh; myNTHREAD <= $myMaxTh; myNTHREAD+=$myThIncr )); do
            cd $CWD
            set -x
            ./runScaleTraffic.sh --nchan $myNCHAN --nproc $myNTHREAD --keystart $myKey0 ${args[@]}
            CMDResult="$?"
            set +x
            if [ $CMDResult -ne "0" ]; then
                echo "Error: Failed to execute runScaleTraffic.sh"
                exit 1
            fi
            myKey0=$(( myKey0+myKeyIncr ))
        done
    done

}


# AddOrderer
# $1: RAFT base directory. When run on personal vLaunch,
#     this is the directory (e.g. raft-quality) relative to .../PTE/CITest/scenarios/,
#     or optionally the absolute path. When run on k8s from cello-launcher, this is the
#     directory name (e.g. raft-quality) relative to ~/cello/src/agent/ansible/vars/.
# $2: chanel name, e.g., orderersystemchannel or testorgchannel1
# $3: one orderer IP to retrieve orderer block, e.g., 169.60.99.43
# $4: one orderer name to retrieve orderer block, e.g., orderer1st-ordererorg
# $5: new orderer name, for example, orderer4th-ordererorg
#
# Example:
#      source PTECIutils.sh
#      AddOrderer raft-quality testorgchannel1 169.60.99.43 orderer1st-ordererorg1 orderer4th-ordererorg2

AddOrderer() {

    RaftBaseDir=$1
    ChannelName=$2
    OrdererIP=$3
    OrdererName=$4
    NewOrderer=$5

    CWD=$PWD
    BINDir=$CWD/$RaftBaseDir/bin
    CFGDir=$CWD/$RaftBaseDir/config

    OrdererOrg=(${OrdererName//-/ })
    OrdererOrg=${OrdererOrg[1]}

    NewOrdererOrg=(${NewOrderer//-/ })
    NewOrdererOrg=${NewOrdererOrg[1]}

    echo "[$0] RaftBaseDir=$RaftBaseDir, ChannelName=$ChannelName"
    echo "[$0] SendToOrdererIP=$OrdererIP, SendToOrdererName=$OrdererName"
    echo "[$0] NewOrderer=$NewOrderer"
    echo "[$0] BINDir=$BINDir"
    echo "[$0] CFGDir=$CFGDir"

    set -x
    mkdir -p $RaftBaseDir/fabric/configUpdate

    cd $RaftBaseDir/fabric/configUpdate
    rm -rf *
    export CHANNEL_NAME=$ChannelName
    export CORE_PEER_LOCALMSPID=$OrdererOrg
    export CORE_PEER_MSPCONFIGPATH="$PWD/../keyfiles/$OrdererOrg/users/Admin@$OrdererOrg/msp"
    export CORE_PEER_TLS_ROOTCERT_FILE="$PWD/../keyfiles/$OrdererOrg/orderers/$OrdererName.$OrdererOrg/tls/ca.crt"
    export CORE_PEER_ADDRESS=$OrdererName":7050"
    export PATH=$PATH:$BINDir
    export FABRIC_CFG_PATH=$CFGDir
    #sudo su << EOF
    #sudo echo "$OrdererIP $OrdererName" >> /etc/hosts
    #EOF
    #sudo echo "169.60.99.43 orderer1st-ordererorg" >> /etc/hosts
    mkdir -p $PWD/../../config

    #fetch orderer config block
    peer channel fetch config config_block.pb -o $OrdererName:7050 -c $CHANNEL_NAME --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE

    configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json
    cp config.json modified_config.json


    ## get orderer server cert
    cat ../keyfiles/$NewOrdererOrg/orderers/$NewOrderer.$NewOrdererOrg/tls/server.crt | base64 >& certTmp.txt
    ordererCert=`cat certTmp.txt | tr -d '\n'`
    #echo $ordererCert

    ## add new orderer to modified_config.json in consentors section and orderer addresses list
    ##### add new orderer to address list
    jq '.channel_group.values.OrdererAddresses.value.addresses += ["'$NewOrderer':7050"]' modified_config.json >& cfgTmp.json

    ##### add new orderer to consenter list
    jq '.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters += [{"client_tls_cert": "'$ordererCert'", "host": "'$NewOrderer'", "port": "7050", "server_tls_cert": "'$ordererCert'" }]' cfgTmp.json >& modified_config.json


    ## prepare protobuf for update
    configtxlator proto_encode --input config.json --type common.Config --output config.pb
    configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
    configtxlator compute_update --channel_id $CHANNEL_NAME --original config.pb --updated modified_config.pb --output addOrderer_update.pb
    configtxlator proto_decode --input addOrderer_update.pb --type common.ConfigUpdate | jq . > addOrderer_update.json
    echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat addOrderer_update.json)'}}}' | jq . > addOrderer_update_in_envelope.json
    configtxlator proto_encode --input addOrderer_update_in_envelope.json --type common.Envelope --output addOrderer_update_in_envelope.pb

    peer channel update -f addOrderer_update_in_envelope.pb -c $CHANNEL_NAME -o $OrdererName:7050 --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE
    set +x

    # return to CWD
    cd $CWD
}

# RemoveOrderer
# $1: RAFT base directory. When run on personal vLaunch,
#     this is the directory (e.g. raft-quality) relative to .../PTE/CITest/scenarios/,
#     or optionally the absolute path. When run on k8s from cello-launcher, this is the
#     directory name (e.g. raft-quality) relative to ~/cello/src/agent/ansible/vars/.
# $2: chanel name, e.g., orderersystemchannel or testorgchannel1
# $3: one orderer IP to retrieve orderer block, e.g., 169.60.99.43
# $4: one orderer name to retrieve orderer block, e.g., orderer1st-ordererorg
# $5: name of the orderer to remove, for example, orderer4th-ordererorg
#
# Example:
#      source PTECIutils.sh
#      RemoveOrderer raft-quality testorgchannel1 169.60.99.43 orderer1st-ordererorg1 orderer4th-ordererorg2
RemoveOrderer(){
    RaftBaseDir=$1
    ChannelName=$2
    OrdererIP=$3
    OrdererName=$4
    RemoveOrderer=$5

    CWD=$PWD
    BINDir=$CWD/$RaftBaseDir/bin
    CFGDir=$CWD/$RaftBaseDir/config

    OrdererOrg=(${OrdererName//-/ })
    OrdererOrg=${OrdererOrg[1]}

    echo "[$0] RaftBaseDir=$RaftBaseDir, ChannelName=$ChannelName"
    echo "[$0] SendToOrdererIP=$OrdererIP, SendToOrdererName=$OrdererName"
    echo "[$0] OrdererToRemove=$RemoveOrderer"
    echo "[$0] BINDir=$BINDir"
    echo "[$0] CFGDir=$CFGDir"

    set -x
    mkdir -p $RaftBaseDir/fabric/configUpdate

    cd $RaftBaseDir/fabric/configUpdate
    rm -rf *
    export CHANNEL_NAME=$ChannelName
    export CORE_PEER_LOCALMSPID=$OrdererOrg
    export CORE_PEER_MSPCONFIGPATH="$PWD/../keyfiles/$OrdererOrg/users/Admin@$OrdererOrg/msp"
    export CORE_PEER_TLS_ROOTCERT_FILE="$PWD/../keyfiles/$OrdererOrg/orderers/$OrdererName.$OrdererOrg/tls/ca.crt"
    export CORE_PEER_ADDRESS=$OrdererName":7050"
    export PATH=$PATH:$BINDir
    export FABRIC_CFG_PATH=$CFGDir
    #fetch orderer config block
    peer channel fetch config config_block.pb -o $OrdererName:7050 -c $CHANNEL_NAME --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE

    configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json
    cp config.json modified_config.json


    #Remove orderer data
    jq '.channel_group.values.OrdererAddresses.value.addresses -= ["'$RemoveOrderer':7050"]' modified_config.json >& cfgTmp.json
    for i in $(jq '.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters | keys | .[]' config.json); do
        hostName=$(echo $(jq '.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters['${i}'].host' config.json))
        if [ $hostName = "\"${RemoveOrderer}\"" ]; then
            concenter=$(jq '.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters['${i}']' config.json)
            jq '.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters -= ['"${concenter}"']' cfgTmp.json >& modified_config.json
        fi
    done

    ## prepare protobuf for update
    configtxlator proto_encode --input config.json --type common.Config --output config.pb
    configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
    configtxlator compute_update --channel_id $CHANNEL_NAME --original config.pb --updated modified_config.pb --output removeOrderer_update.pb
    configtxlator proto_decode --input removeOrderer_update.pb --type common.ConfigUpdate | jq . > removeOrderer_update.json
    echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat removeOrderer_update.json)'}}}' | jq . > removeOrderer_update_in_envelope.json
    configtxlator proto_encode --input removeOrderer_update_in_envelope.json --type common.Envelope --output removeOrderer_update_in_envelope.pb

    peer channel update -f removeOrderer_update_in_envelope.pb -c $CHANNEL_NAME -o $OrdererName:7050 --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE
    set +x

    # return to CWD
    cd $CWD

}
