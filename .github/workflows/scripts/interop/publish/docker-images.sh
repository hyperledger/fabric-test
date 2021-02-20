#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

for image in baseos peer orderer ccenv tools ca javaenv nodeenv; do
  docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"
  jfrog rt docker-push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}" hyperledger-fabric.jfrog.io

  docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-latest"
  jfrog rt docker-push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-latest" hyperledger-fabric.jfrog.io
done
