set -euo pipefail

function cleanUp() {
	rm -rf system-genesis-block/*.block organizations/peerOrganizations organizations/ordererOrganizations
	rm -rf organizations/fabric-ca/org1/msp organizations/fabric-ca/org1/tls-cert.pem organizations/fabric-ca/org1/ca-cert.pem organizations/fabric-ca/org1/IssuerPublicKey organizations/fabric-ca/org1/IssuerRevocationPublicKey organizations/fabric-ca/org1/fabric-ca-server.db
	rm -rf organizations/fabric-ca/org2/msp organizations/fabric-ca/org2/tls-cert.pem organizations/fabric-ca/org2/ca-cert.pem organizations/fabric-ca/org2/IssuerPublicKey organizations/fabric-ca/org2/IssuerRevocationPublicKey organizations/fabric-ca/org2/fabric-ca-server.db
	rm -rf organizations/fabric-ca/ordererOrg/msp organizations/fabric-ca/ordererOrg/tls-cert.pem organizations/fabric-ca/ordererOrg/ca-cert.pem organizations/fabric-ca/ordererOrg/IssuerPublicKey organizations/fabric-ca/ordererOrg/IssuerRevocationPublicKey organizations/fabric-ca/ordererOrg/fabric-ca-server.db
	rm -rf organizations/fabric-ca/org1_tls/msp organizations/fabric-ca/org1_tls/tls-cert.pem organizations/fabric-ca/org1_tls/ca-cert.pem organizations/fabric-ca/org1_tls/IssuerPublicKey organizations/fabric-ca/org1_tls/IssuerRevocationPublicKey organizations/fabric-ca/org1_tls/fabric-ca-server.db
	rm -rf organizations/fabric-ca/org2_tls/msp organizations/fabric-ca/org2_tls/tls-cert.pem organizations/fabric-ca/org2_tls/ca-cert.pem organizations/fabric-ca/org2_tls/IssuerPublicKey organizations/fabric-ca/org2_tls/IssuerRevocationPublicKey organizations/fabric-ca/org2_tls/fabric-ca-server.db
	rm -rf organizations/fabric-ca/ordererOrg_tls/msp organizations/fabric-ca/ordererOrg_tls/tls-cert.pem organizations/fabric-ca/ordererOrg_tls/ca-cert.pem organizations/fabric-ca/ordererOrg_tls/IssuerPublicKey organizations/fabric-ca/ordererOrg_tls/IssuerRevocationPublicKey organizations/fabric-ca/ordererOrg_tls/fabric-ca-server.db
	rm -rf channel-artifacts fabcar.tar.gz fabcar
	rm -rf system-genesis-block
	for org in ordererOrg org1 org2; do
    rm -rf "organizations/fabric-ca/${org}"
    rm -rf "organizations/fabric-ca/${org}_tls"
  done
}

cleanUp
