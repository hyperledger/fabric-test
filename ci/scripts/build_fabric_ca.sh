#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b release-1.4 https://github.com/hyperledger/fabric-ca "${GOPATH}/src/github.com/hyperledger/fabric-ca"
cd "${GOPATH}/src/github.com/hyperledger/fabric-ca"
make docker
make release/linux-amd64
cp release/linux-amd64/bin/* "${GOBIN}"
