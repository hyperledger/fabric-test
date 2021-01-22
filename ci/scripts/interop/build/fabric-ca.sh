#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b master https://github.com/hyperledger/fabric-ca --single-branch "${GOPATH}/src/github.com/hyperledger/fabric-ca"
cd "${GOPATH}/src/github.com/hyperledger/fabric-ca"
make docker

# Package and stage artifacts
tar -czvf "${WORKING_DIRECTORY}/ca-source.tgz" .
docker save -o "${WORKING_DIRECTORY}/ca-docker.tgz" hyperledger/fabric-ca:latest
