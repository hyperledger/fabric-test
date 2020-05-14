#!/bin/bash
set -eo pipefail

export FABRIC_CFG_PATH=${PWD}/config

function printHelp() {
  echo "  Execute end-to-end test: network.sh"
  echo "  Execute end-to-end test, and leave network running: network.sh up"
	echo "  Destroy network and all artifacts: network.sh down"
}

function print() {
	GREEN='\033[0;32m'
  NC='\033[0m'
	echo -e "${GREEN}${1}${NC}"
}

function setup() {
  mkdir -p system-genesis-block
  for org in ordererOrg org1 org2; do
    mkdir -p "organizations/fabric-ca/${org}"
    mkdir -p "organizations/fabric-ca/${org}_tls"
    cp config/fabric-ca-server-config.yaml "organizations/fabric-ca/${org}"
    cp config/fabric-ca-server-config.yaml "organizations/fabric-ca/${org}_tls"
  done
}

function clearContainers() {
  print "Removing Chaincode containers..."
	CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /dev-peer.*/) {print $1}')
	if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
		echo "---- No containers available for deletion ----"
	else
		docker rm -f $CONTAINER_IDS >/dev/null
	fi
}

function removeUnwantedImages() {
  print "Removing Chaincode images..."
	DOCKER_IMAGE_IDS=$(docker images | awk '($1 ~ /dev-peer.*/) {print $3}')
	if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
		echo "---- No images available for deletion ----"
	else
		docker rmi -f $DOCKER_IMAGE_IDS >/dev/null
	fi
}

function createOrgs() {
  print "Launching CA's, HSM proxy, and HSM tools"
	docker-compose -f docker/docker-compose-ca.yaml up -d 2>&1
	sleep 5
	print "Generating MSP's and TLS certificates..."
	docker exec proxy_tools sh -c "cd /data && ./organizations/fabric-ca/registerEnroll.sh"
	docker exec proxy_tools sh -c "cd /data && ./organizations/fabric-ca/registerEnrollTLS.sh"

	print "Generating connection profiles..."
	docker run --net testnet --rm \
	  -v "${PWD}:/data" \
	  busybox \
	  sh -c "cd /data && ./organizations/ccp-generate.sh"
}

function createConsortium() {
	print "Generating Genesis Block..."
	docker run --net testnet --rm \
	  -e FABRIC_CFG_PATH=/data/config \
	  -v "${PWD}:/data" \
	  hyperledger-fabric.jfrog.io/fabric-proxy-tools:hsm \
	  bash -c "cd /data && configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block"
}

function networkUp() {
  print "Starting network..."
	docker-compose -f docker/docker-compose-test-net.yaml up -d 2>&1
	docker ps -a
}

function createChannel() {
	docker run --net testnet --rm \
	  -e PKCS11_PROXY_SOCKET=tcp://proxy.example.com:2345 \
	  -v "${PWD}:/data" \
	  hyperledger-fabric.jfrog.io/fabric-proxy-tools:hsm \
	  bash -c "cd /data && ./scripts/createChannel.sh"
}

function deployCC() {
	docker run --net testnet --rm \
	  -e PKCS11_PROXY_SOCKET=tcp://proxy.example.com:2345 \
	  -v "${PWD}:/data" \
	  hyperledger-fabric.jfrog.io/fabric-proxy-tools:hsm \
	  bash -c "cd /data && ./scripts/deployCC.sh"
}

function networkDown() {
  printf "Destroying network..."
  docker-compose -f docker/docker-compose-test-net.yaml -f docker/docker-compose-ca.yaml down -t 0 --volumes --remove-orphans
	clearContainers
	removeUnwantedImages
  docker run --rm \
	  -v "${PWD}:/data" \
	  busybox \
	  sh -c "cd /data && ./scripts/cleanup.sh"
}

if [[ "${1}" == "help" ]]; then
	printHelp
elif [[ "${1}" == "up" ]]; then
  networkDown
	setup
	createOrgs
	createConsortium
	networkUp
	createChannel
	deployCC
	print "Network and Chaincode initialized!"
elif [[ "${1}" == "down" ]]; then
    networkDown
else
	networkDown
	trap networkDown EXIT
	setup
	createOrgs
	createConsortium
	networkUp
	createChannel
	deployCC
	print "End-To-End test successfully executed!"
fi
