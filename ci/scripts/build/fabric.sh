#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b ${BRANCH} https://github.com/hyperledger/fabric "${GOPATH}/src/github.com/hyperledger/fabric"
cd "${GOPATH}/src/github.com/hyperledger/fabric"
make docker
make release/linux-amd64
cp release/linux-amd64/bin/* "${GOBIN}"
