#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b ${BRANCH} https://github.com/hyperledger/fabric-chaincode-java "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-java"
cd "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-java"
./gradlew buildImage -x test
