#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b master https://github.com/hyperledger/fabric-chaincode-java "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-java"
cd "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-java"
./gradlew buildImage -x test

# This is temporary until chaincode-java starts adding 2 digit tags
docker tag hyperledger/fabric-javaenv hyperledger/fabric-javaenv:2.1
