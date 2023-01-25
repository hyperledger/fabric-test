#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

cd "${ARTIFACT_DIRECTORY}/javaenv-source"
tar -xf javaenv-source.tgz

export GITHUB_WORKSPACE=$(pwd)
# 
# copy of the integrationtest github action
./gradlew -I $GITHUB_WORKSPACE/fabric-chaincode-integration-test/chaincodebootstrap.gradle -PchaincodeRepoDir=$GITHUB_WORKSPACE/fabric-chaincode-integration-test/src/contracts/fabric-shim-api/repository publishShimPublicationToFabricRepository
./gradlew -I $GITHUB_WORKSPACE/fabric-chaincode-integration-test/chaincodebootstrap.gradle -PchaincodeRepoDir=$GITHUB_WORKSPACE/fabric-chaincode-integration-test/src/contracts/fabric-ledger-api/repository publishShimPublicationToFabricRepository
./gradlew -I $GITHUB_WORKSPACE/fabric-chaincode-integration-test/chaincodebootstrap.gradle -PchaincodeRepoDir=$GITHUB_WORKSPACE/fabric-chaincode-integration-test/src/contracts/bare-gradle/repository publishShimPublicationToFabricRepository
./gradlew -I $GITHUB_WORKSPACE/fabric-chaincode-integration-test/chaincodebootstrap.gradle -PchaincodeRepoDir=$GITHUB_WORKSPACE/fabric-chaincode-integration-test/src/contracts/bare-maven/repository publishShimPublicationToFabricRepository
./gradlew -I $GITHUB_WORKSPACE/fabric-chaincode-integration-test/chaincodebootstrap.gradle -PchaincodeRepoDir=$GITHUB_WORKSPACE/fabric-chaincode-integration-test/src/contracts/wrapper-maven/repository publishShimPublicationToFabricRepository


curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary
npm install -g @hyperledger-labs/weft  

export PATH=$(pwd)/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/config

peer version

./gradlew :fabric-chaincode-integration-test:build -xdependencyCheckAnalyze 
