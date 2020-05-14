#!/bin/bash
set -euo pipefail

export FABRIC_CFG_PATH=${PWD}/config

CHANNEL_NAME="mychannel"
VERSION="1"

function print() {
	GREEN='\033[0;32m'
  NC='\033[0m'
	echo -e "${GREEN}${1}${NC}"
}

function packageChaincode() {
	setGlobals "${1}"
	print "Packaging Chaincode..."
	peer lifecycle chaincode package fabcar.tar.gz --path chaincode/fabcar/go --lang golang --label fabcar_${VERSION}
}

function installChaincode() {
	setGlobals "${1}"
	print "Installing Chaincode for Org ${1}..."
	peer lifecycle chaincode install fabcar.tar.gz
}

function approveForMyOrg() {
	setGlobals "${1}"
	PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | sed -n "/fabcar_${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}")
	print "Approving Chaincode for Org ${1}..."
	peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name fabcar --version ${VERSION} --init-required --package-id ${PACKAGE_ID} --sequence ${VERSION}
}

function commitChaincodeDefinition() {
	parsePeerConnectionParameters "$@"
	print "Committing Chaincode definition for Org ${1}..."
	peer lifecycle chaincode commit -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name fabcar $PEER_CONN_PARMS --version ${VERSION} --sequence ${VERSION} --init-required
}

function chaincodeInvokeInit() {
	parsePeerConnectionParameters "$@"
	print "Invoking Chaincode..."
	peer chaincode invoke -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n fabcar $PEER_CONN_PARMS --isInit -c '{"function":"initLedger","Args":[]}'
}

function chaincodeQuery() {
	setGlobals "${1}"
	print "Querying Chaincode..."
	peer chaincode query -C $CHANNEL_NAME -n fabcar -c '{"Args":["queryAllCars"]}'
}

source scripts/envVar.sh
packageChaincode 1
installChaincode 1
installChaincode 2
approveForMyOrg 1
approveForMyOrg 2
commitChaincodeDefinition 1 2
chaincodeInvokeInit 1 2
sleep 10
chaincodeQuery 1
