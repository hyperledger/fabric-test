#!/bin/bash
set -euo pipefail

export TLSCA_ORG1_ENDPOINT=ca.org1.example.com:7054
export TLSCA_ORG2_ENDPOINT=ca.org2.example.com:7054
export TLSCA_ORDERER_ENDPOINT=ca.orderer.example.com:7054
export FABRIC_CA_CLIENT_BCCSP_DEFAULT=SW

function print() {
	GREEN='\033[0;32m'
  NC='\033[0m'
	echo -e "${GREEN}${1}${NC}"
}

function createOrg1TLS() {
	mkdir -p organizations/peerOrganizations/org1.example.com
	mkdir -p organizations/peerOrganizations/org1.example.com/msp/tlscacerts
	mkdir -p organizations/peerOrganizations/org1.example.com/tlsca
	mkdir -p organizations/peerOrganizations/org1.example.com/ca

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

	print "Generating Org1 peer TLS certificates..."
	fabric-ca-client enroll -u http://peer0:peer0pw@${TLSCA_ORG1_ENDPOINT} \
	  --caname ca-org1 \
	  -M ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls \
	  --enrollment.profile tls \
	  --csr.hosts peer0.org1.example.com

	cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/tlscacerts/* \
		organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
	cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/signcerts/* \
		organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.crt
	cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/keystore/* \
		organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.key
	cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/tlscacerts/* \
		organizations/peerOrganizations/org1.example.com/msp/tlscacerts/ca.crt
	cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/tlscacerts/* \
		organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
	cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/cacerts/* \
		organizations/peerOrganizations/org1.example.com/ca/ca-tls.org1.example.com-cert.pem
}

function createOrg2TLS() {
	mkdir -p organizations/peerOrganizations/org2.example.com
	mkdir -p organizations/peerOrganizations/org2.example.com/msp/tlscacerts
	mkdir -p organizations/peerOrganizations/org2.example.com/tlsca
	mkdir -p organizations/peerOrganizations/org2.example.com/ca

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org2.example.com/

	print "Generating Org2 peer TLS certificates..."
	fabric-ca-client enroll -u http://peer0:peer0pw@${TLSCA_ORG2_ENDPOINT} \
	  --caname ca-org2 \
	  -M ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls \
	  --enrollment.profile tls \
	  --csr.hosts peer0.org2.example.com

	cp organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/* \
		organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
	cp organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/signcerts/* \
		organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.crt
	cp organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/keystore/* \
		organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.key
	cp organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/* \
		organizations/peerOrganizations/org2.example.com/msp/tlscacerts/ca.crt
	cp organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/* \
		organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem
	cp organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp/cacerts/* \
		organizations/peerOrganizations/org2.example.com/ca/ca-tls.org2.example.com-cert.pem
}

function createOrdererOrgTLS() {
	mkdir -p organizations/ordererOrganizations/example.com
	mkdir -p organizations/ordererOrganizations/example.com/msp/tlscacerts
	mkdir -p organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/ordererOrganizations/example.com

	print "Generating OrdererOrg orderer TLS certificates..."
	fabric-ca-client enroll -u http://orderer:ordererpw@${TLSCA_ORDERER_ENDPOINT} \
	  --caname ca-orderer \
	  -M ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls \
	  --enrollment.profile tls \
	  --csr.hosts orderer.example.com

	cp organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/tlscacerts/* \
		organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt
	cp organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/signcerts/* \
		organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
	cp organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/keystore/* \
		organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key
	cp organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/tlscacerts/* \
		organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
	cp organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/tlscacerts/* \
		organizations/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem
}

createOrg1TLS
createOrg2TLS
createOrdererOrgTLS
