#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

for target in linux-amd64 darwin-amd64; do
  jfrog rt upload "/tmp/binaries-fabric/hyperledger-fabric-${target}-${RELEASE}.tar.gz"  \
    "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-${target}-${RELEASE}.tar.gz"
  jfrog rt upload "/tmp/binaries-fabric/hyperledger-fabric-${target}-${RELEASE}.tar.gz" \
    "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-${target}-latest.tar.gz"
done
