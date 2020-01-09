#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -uo pipefail

docker login -u "${ARTIFACTORY_USERNAME}" -p "${ARTIFACTORY_PASSWORD}" hyperledger-fabric.jfrog.io

for image in peer orderer ccenv tools ca javaenv; do
    docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"
    docker push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"
done

cd "${GOPATH}/src/github.com/hyperledger/fabric/release/linux-amd64/"
mkdir -p "config"
cp ../../sampleconfig/*yaml "config"
tar -czvf "hyperledger-fabric-linux-amd64-${RELEASE}.tar.gz" bin config
curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
     -T "./hyperledger-fabric-linux-amd64-${RELEASE}.tar.gz" \
     "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-linux-amd64-${RELEASE}.tar.gz"

cd "${GOPATH}/src/github.com/hyperledger/fabric-ca/release/linux-amd64"
tar -czvf "hyperledger-fabric-ca-linux-amd64-${RELEASE}.tar.gz" bin
curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
     -T "./hyperledger-fabric-ca-linux-amd64-${RELEASE}.tar.gz" \
     "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-ca-linux-amd64-${RELEASE}.tar.gz"
