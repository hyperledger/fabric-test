#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

for target in linux-amd64 darwin-amd64; do
  jfrog rt upload "/tmp/binaries-fabric-ca/hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" \
    "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz"
  jfrog rt upload "/tmp/binaries-fabric-ca/hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" \
    "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-ca-${target}-latest.tar.gz"
done
