#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

cd "${ARTIFACT_DIRECTORY}/javaenv-source"
tar -xf javaenv-source.tgz

# java chaincode integration tests look for hyperledger/fabric-javaenv:amd64-latest in release-2.2
docker tag hyperledger/fabric-javaenv:latest hyperledger/fabric-javaenv:amd64-latest

./gradlew build -x getLatestDockerImages -x buildImage
