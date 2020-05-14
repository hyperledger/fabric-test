#!/bin/bash
set -euo pipefail

export FABRIC_CFG_PATH=${PWD}/config
mkdir -p channel-artifacts

CHANNEL_NAME="mychannel"

function print() {
	GREEN='\033[0;32m'
  NC='\033[0m'
	echo -e "${GREEN}${1}${NC}"
}

function createChannelTx() {
  print "Creating channel config block..."
	configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
}

function createAnchorPeerTx() {
  print "Create anchor peer config blocks..."
	configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP
	configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org2MSP
}

function createChannel() {
	setGlobals 1
	sleep 3
	print "Creating channel ${CHANNEL_NAME}..."
	peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA
}

function joinChannel() {
	setGlobals "${1}"
	print "Joining Org ${1} to channel ${CHANNEL_NAME}..."
	peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block
}

function updateAnchorPeers() {
	setGlobals "${1}"
	print "Updating Org ${1} Peer to act as anchor peer..."
	peer channel update -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/${CORE_PEER_LOCALMSPID}anchors.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA
}

source scripts/envVar.sh
createChannelTx
createAnchorPeerTx
createChannel
joinChannel 1
joinChannel 2
updateAnchorPeers 1
updateAnchorPeers 2
