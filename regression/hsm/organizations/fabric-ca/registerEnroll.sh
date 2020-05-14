#!/bin/bash
set -euo pipefail

export CA_ORG1_ENDPOINT=ca.org1.example.com:7054
export CA_ORG2_ENDPOINT=ca.org2.example.com:7054
export CA_ORDERER_ENDPOINT=ca.orderer.example.com:7054

function createClientConfigs() {
	mkdir -p organizations/ordererOrganizations/example.com
	mkdir -p organizations/peerOrganizations/org1.example.com
	mkdir -p organizations/peerOrganizations/org2.example.com
	cp config/fabric-ca-client-config.yaml organizations/ordererOrganizations/example.com/fabric-ca-client-config.yaml
	cp config/fabric-ca-client-config.yaml organizations/peerOrganizations/org1.example.com/fabric-ca-client-config.yaml
	cp config/fabric-ca-client-config.yaml organizations/peerOrganizations/org2.example.com/fabric-ca-client-config.yaml
}

function createOrg1MSP() {
	mkdir -p organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com
	mkdir -p organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com
	mkdir -p organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com
	mkdir -p organizations/peerOrganizations/org1.example.com/msp

	echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca-org1-example-com-7054-ca-org1.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca-org1-example-com-7054-ca-org1.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca-org1-example-com-7054-ca-org1.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca-org1-example-com-7054-ca-org1.pem
    OrganizationalUnitIdentifier: orderer' >organizations/peerOrganizations/org1.example.com/msp/config.yaml

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

	echo "Enroll the CA admin"
	fabric-ca-client enroll -u http://admin:adminpw@${CA_ORG1_ENDPOINT} \
	  --caname ca-org1

	echo "Register peer0"
	fabric-ca-client register -u http://${CA_ORG1_ENDPOINT}  \
	  --caname ca-org1  \
	  --id.name peer0  \
	  --id.secret peer0pw  \
	  --id.type peer

	echo "Register user"
	fabric-ca-client register -u http://${CA_ORG1_ENDPOINT}  \
	  --caname ca-org1  \
	  --id.name user1  \
	  --id.secret user1pw  \
	  --id.type client

	echo "Register the org admin"
	fabric-ca-client register -u http://${CA_ORG1_ENDPOINT}  \
	  --caname ca-org1  \
	  --id.name org1admin  \
	  --id.secret org1adminpw  \
	  --id.type admin

	echo "## Generate the peer0 msp"
	fabric-ca-client enroll -u http://peer0:peer0pw@${CA_ORG1_ENDPOINT}  \
	  --caname ca-org1  \
	  -M ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp  \
	  --csr.hosts localhost \
	  --csr.hosts peer0.org1.example.com

	echo "## Generate the user msp"
	fabric-ca-client enroll -u http://user1:user1pw@${CA_ORG1_ENDPOINT}  \
	  --caname ca-org1  \
	  -M ${PWD}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp

	echo "## Generate the org admin msp"
	fabric-ca-client enroll -u http://org1admin:org1adminpw@${CA_ORG1_ENDPOINT}  \
	  --caname ca-org1  \
	  -M ${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp

	cp organizations/peerOrganizations/org1.example.com/msp/config.yaml \
		organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/config.yaml
	cp organizations/peerOrganizations/org1.example.com/msp/config.yaml \
		organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/config.yaml
}

function createOrg2MSP() {
	mkdir -p organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com
	mkdir -p organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com
	mkdir -p organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com
	mkdir -p organizations/peerOrganizations/org2.example.com/msp

	echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca-org2-example-com-7054-ca-org2.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca-org2-example-com-7054-ca-org2.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca-org2-example-com-7054-ca-org2.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca-org2-example-com-7054-ca-org2.pem
    OrganizationalUnitIdentifier: orderer' >organizations/peerOrganizations/org2.example.com/msp/config.yaml

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org2.example.com/

	echo "Enroll the CA admin"
	fabric-ca-client enroll -u http://admin:adminpw@${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2

	echo "Register peer0"
	fabric-ca-client register -u http://${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2  \
	  --id.name peer0  \
	  --id.secret peer0pw  \
	  --id.type peer

	echo "Register user"
	fabric-ca-client register -u http://${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2  \
	  --id.name user1  \
	  --id.secret user1pw  \
	  --id.type client

	echo "Register the org admin"
	fabric-ca-client register -u http://${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2  \
	  --id.name org2admin  \
	  --id.secret org2adminpw  \
	  --id.type admin

	echo "## Generate the peer0 msp"
	fabric-ca-client enroll -u http://peer0:peer0pw@${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2  \
	  -M ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp  \
	  --csr.hosts localhost \
	  --csr.hosts peer0.org2.example.com

	echo "## Generate the user msp"
	fabric-ca-client enroll -u http://user1:user1pw@${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2  \
	  -M ${PWD}/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp

	echo "## Generate the org admin msp"
	fabric-ca-client enroll -u http://org2admin:org2adminpw@${CA_ORG2_ENDPOINT}  \
	  --caname ca-org2  \
	  -M ${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp

	cp organizations/peerOrganizations/org2.example.com/msp/config.yaml \
		organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp/config.yaml
	cp organizations/peerOrganizations/org2.example.com/msp/config.yaml \
		organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/config.yaml
}

function createOrdererMSP() {
	mkdir -p organizations/ordererOrganizations/example.com/orderers/example.com
	mkdir -p organizations/ordererOrganizations/example.com/orderers/orderer.example.com
	mkdir -p organizations/ordererOrganizations/example.com/users/Admin@example.com
	mkdir -p organizations/ordererOrganizations/example.com/msp/

	echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca-orderer-example-com-7054-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca-orderer-example-com-7054-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca-orderer-example-com-7054-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca-orderer-example-com-7054-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer' >organizations/ordererOrganizations/example.com/msp/config.yaml

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/ordererOrganizations/example.com

	echo "Enroll the CA admin"
	fabric-ca-client enroll -u http://admin:adminpw@${CA_ORDERER_ENDPOINT}  \
	  --caname ca-orderer

	echo "Register orderer"
	fabric-ca-client register -u http://${CA_ORDERER_ENDPOINT}  \
	  --caname ca-orderer  \
	  --id.name orderer  \
	  --id.secret ordererpw  \
	  --id.type orderer

	echo "Register the orderer admin"
	fabric-ca-client register -u http://${CA_ORDERER_ENDPOINT}  \
	  --caname ca-orderer  \
	  --id.name ordererAdmin  \
	  --id.secret ordererAdminpw  \
	  --id.type admin

	echo "## Generate the orderer msp"
	fabric-ca-client enroll -u http://orderer:ordererpw@${CA_ORDERER_ENDPOINT}  \
	  --caname ca-orderer  \
	  -M ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp  \
	  --csr.hosts localhost \
	  --csr.hosts orderer.example.com

	echo "## Generate the admin msp"
	fabric-ca-client enroll -u http://ordererAdmin:ordererAdminpw@${CA_ORDERER_ENDPOINT}  \
	  --caname ca-orderer  \
	  -M ${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp

	cp organizations/ordererOrganizations/example.com/msp/config.yaml \
		organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/config.yaml
	cp organizations/ordererOrganizations/example.com/msp/config.yaml \
		organizations/ordererOrganizations/example.com/users/Admin@example.com/msp/config.yaml
}

createClientConfigs
createOrg1MSP
createOrg2MSP
createOrdererMSP
