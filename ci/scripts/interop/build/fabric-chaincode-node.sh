#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b release-2.2 https://github.com/hyperledger/fabric-chaincode-node --single-branch "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-node"
cd "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-node"

# Package source code prior to polluting the directory
tar -czvf "${WORKING_DIRECTORY}/nodeenv-source.tgz" .

node common/scripts/install-run-rush.js install
node common/scripts/install-run-rush.js rebuild

# Package docker artifact and stage
docker save -o "${WORKING_DIRECTORY}/nodeenv-docker.tgz" hyperledger/fabric-nodeenv:latest
