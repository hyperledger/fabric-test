#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -uo pipefail

cd "${GOPATH}/src/github.com/hyperledger/fabric-samples/first-network"
echo y | ./byfn.sh -m up -l node -s couchdb -t 60 -d 20
echo y | ./eyfn.sh -m up -l node -s couchdb -t 60 -d 20
echo y | ./eyfn.sh -m down
