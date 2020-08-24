#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This is a collection of bash functions used by different scripts
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export PEER0_ORG3_CA=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

# Set OrdererOrg.Admin globals
setOrdererGlobals() {
	export CORE_PEER_LOCALMSPID="OrdererMSP"
	export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
	export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp
}

# Set environment variables for the peer org
setGlobals() {
	if [[ ${1} -eq 1 ]]; then
		export CORE_PEER_LOCALMSPID="Org1MSP"
		export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
		export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
		export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
	elif [[ ${1} -eq 2 ]]; then
		export CORE_PEER_LOCALMSPID="Org2MSP"
		export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
		export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
		export CORE_PEER_ADDRESS=peer0.org2.example.com:7051
	fi
}

# parsePeerConnectionParameters $@
# Helper function that sets the peer connection parameters for a chaincode
# operation
parsePeerConnectionParameters() {

	PEER_CONN_PARMS=""
	PEERS=""
	while [ "$#" -gt 0 ]; do
		setGlobals $1
		PEER="peer0.org$1"
		## Set peer adresses
		PEERS="$PEERS $PEER"
		PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses $CORE_PEER_ADDRESS"
		## Set path to TLS certificate
		TLSINFO=$(eval echo "--tlsRootCertFiles \$PEER0_ORG$1_CA")
		PEER_CONN_PARMS="$PEER_CONN_PARMS $TLSINFO"
		# shift by one to get to the next organization
		shift
	done
	# remove leading space for output
	PEERS="$(echo -e "$PEERS" | sed -e 's/^[[:space:]]*//')"
}
