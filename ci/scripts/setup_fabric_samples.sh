#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b master https://github.com/hyperledger/fabric-samples "${GOPATH}/src/github.com/hyperledger/fabric-samples"
mkdir -p "${GOPATH}/src/github.com/hyperledger/fabric-samples/config"
cp "${GOPATH}"/src/github.com/hyperledger/fabric/sampleconfig/*yaml "${GOPATH}/src/github.com/hyperledger/fabric-samples/config"
