#!/bin/bash -e

if [[ $# != 6 && $# != 9 ]]; then
    echo "Invalid number of arguments. Usage:"
    echo "./validateNetworkInSync.sh <kubeconfig path> <MSPID> <artifactsLocation> <ordererOrganizations list> <numOrderer in each org> <numChannels> <peerOrganizations list> <numpeers in each org> <peerOrganizations MSPID list>"
    exit 1
fi

export KUBECONFIG=$1
export CORE_PEER_LOCALMSPID=$2
ARTIFACTS_LOCATION=$3
IFS=,
ORDERER_ORGS=($4)
NUM_ORDERERS=($5)
PEER_ORGS=($7)
NUM_PEERS=($8)
PEER_ORGS_MSPID=($9)
unset IFS
NUM_CHANNELS=$6
ORDERERS=()
CHANNELS=("orderersystemchannel")
PORT=30000
CHANNELEXISTS=false
if [[ "$ARTIFACTS_LOCATION" == */ ]]; then
    ARTIFACTS_LOCATION="${ARTIFACTS_LOCATION::-1}"
fi

for (( i=0; i < $NUM_CHANNELS; ++i ))
do
    CHANNELS+=("testorgschannel$i")
done

ORDERER_ORG=${ORDERER_ORGS[0]}
export ORDERER_NAME=orderer0-$ORDERER_ORG
CURRENT_DIR=$(cd `dirname $0` && pwd)
export FABRIC_CFG_PATH=$CURRENT_DIR/../../../fabric/.build/config/


validateNetworkInSync(){
    export CORE_PEER_MSPCONFIGPATH="$ARTIFACTS_LOCATION/crypto-config/$4Organizations/$1/users/Admin@$1/msp"
    export CORE_PEER_TLS_ROOTCERT_FILE="$ARTIFACTS_LOCATION/crypto-config/$4Organizations/$1/$4s/$2.$1/tls/ca.crt"
    export ORDERER_NAME=$2
    NODEPORT=$(kubectl --kubeconfig=$KUBECONFIG get -o jsonpath="{.spec.ports[0].nodePort}" services $2)
    NODEIP=$(kubectl --kubeconfig=$KUBECONFIG get nodes -o jsonpath='{ $.items[*].status.addresses[?(@.type=="ExternalIP")].address }' | cut -d' ' -f1)
    export CORE_PEER_ADDRESS=$NODEIP:$NODEPORT
    CHANNEL_NAME=$3
    if [[ "$VALIDATE_BLOCK" == "true" ]]; then
        if [[ "$4" == "peer" ]]; then
            peerBlockValidation
        else
            ordererBlockValidation
        fi
    fi
    if [[ -n "$CONSENSUS_CHECK" && "$CONSENSUS_CHECK" == "true" ]]; then
        peer channel fetch config config_block.pb -o $CORE_PEER_ADDRESS -c $CHANNEL_NAME --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE --ordererTLSHostnameOverride $ORDERER_NAME
        configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json
        validateConsensus $CONSENSUS_TYPE $CONSENSUS_STATE
    fi
}

validateConsensus(){
    consensusType=$(jq -r '.channel_group.groups.Orderer.values.ConsensusType.value.type' config.json)
    consensusState=$(jq -r '.channel_group.groups.Orderer.values.ConsensusType.value.state' config.json)
    if [[ "${consensusType}" == "$1" && "${consensusState}" == "$2" ]]; then
        echo "Consensus type:$consensusType and state:$consensusState"
    else
        echo "$CHANNEL_NAME failed to migrate to etcdraft"
        exit 1
    fi
}

ordererBlockValidation(){
    blockNum=$(getLatestBlockHeight orderer)
    validateBlock $blockNum orderer
}

getLatestBlockHeight(){
    if [[ "$1" == "orderer" ]];then
        peer channel fetch newest config_block.pb -o $CORE_PEER_ADDRESS -c $CHANNEL_NAME --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE --ordererTLSHostnameOverride $ORDERER_NAME > block.txt 2>&1
        blockHeight=`cat block.txt | grep "Received block" | awk '{print $11}'`
        echo $blockHeight
    else
        export CORE_PEER_TLS_ENABLED=true
        peer channel getinfo -o $CORE_PEER_ADDRESS -c $CHANNEL_NAME --tls > block.txt 2>&1
        cat block.txt | grep '"height":' | awk '{print $3}' > block.json
        blockHeight=$(jq -r '.height' block.json)
        echo $blockHeight
    fi
}

peerBlockValidation(){
    blockHeight=$(getLatestBlockHeight peer)
    validateBlock $blockHeight peer
    rm -rf block.json
}

validateBlock(){
    echo "--------------------------------------------------------------------------"
    echo "Block validation for $ORDERER_NAME in $CHANNEL_NAME"
    echo "--------------------------------------------------------------------------"
    blockNum=$1
    if [ $CHANNELEXISTS == true ]; then
        count=0
        while [ $count -lt 3 ];
        do
            echo $blockNum $LATEST_BLOCK
            if (( $blockNum >= $LATEST_BLOCK )); then
                echo "Latest block:$LATEST_BLOCK, current block:$blockNum"
                count=3
            elif [ $blockNum < $LATEST_BLOCK && $count -lt 3 ]; then
                echo "$ORDERER_NAME didn't receive the latest block in $CHANNEL_NAME"
                echo "Waiting for 3 seconds"
                blockNum=$(getLatestBlockHeight $2)
                sleep 3
                count=$[$count+1]
            else
                echo "$ORDERER_NAME didn't receive the latest config block in $CHANNEL_NAME"
                exit 1
            fi
        done
    else
        export LATEST_BLOCK=$blockNum
        echo "Latest block:$LATEST_BLOCK, current block:$blockNum"
        CHANNELEXISTS=true
    fi
}

for i in ${CHANNELS[*]}
do
    for j in ${!ORDERER_ORGS[@]}
    do
        for (( k=0; k < ${NUM_ORDERERS[$j]}; k++ ))
        do
            ORDERER_NAME="orderer$k-${ORDERER_ORGS[$j]}"
            if [ "$CONSENSUS_CHECK" == "true" ]; then
                echo "--------------------------------------------------------------------------"
                echo "Checking the consensus type and state of $ORDERER_NAME in $i "
                echo "--------------------------------------------------------------------------"
            fi
            validateNetworkInSync ${ORDERER_ORGS[$j]} $ORDERER_NAME $i orderer
        done
    done
    CHANNELEXISTS=false
done
for i in ${CHANNELS[*]}
do
    if [[ "$7" != "" && "$8" != "" ]] && [[ $i != orderersystemchannel ]]; then
        for j in ${!PEER_ORGS[@]}
        do
            for (( k=0; k < ${NUM_PEERS[$j]}; k++ ))
            do
                PEER_NAME="peer$k-${PEER_ORGS[$j]}"
                export CORE_PEER_LOCALMSPID=${PEER_ORGS_MSPID[$j]}
                validateNetworkInSync ${PEER_ORGS[$j]} $PEER_NAME $i peer
            done
        done
        CHANNELEXISTS=false
    fi
done
echo "--------------------------------------------------------------------------"