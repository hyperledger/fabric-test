#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

docker login -u "${ARTIFACTORY_USERNAME}" -p "${ARTIFACTORY_PASSWORD}" hyperledger-fabric.jfrog.io

for image in baseos peer orderer ccenv tools ca javaenv nodeenv; do
    docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"
    docker push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"

    docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-latest"
    docker push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-latest"
done