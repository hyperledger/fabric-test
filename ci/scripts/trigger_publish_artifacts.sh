#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -uo pipefail

docker login -u "${ARTIFACTORY_USERNAME}" -p "${ARTIFACTORY_PASSWORD}" hyperledger-fabric.jfrog.io

for image in baseos peer orderer ccenv tools ca javaenv nodeenv; do
    docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"
    docker push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-${RELEASE}"

    docker tag "hyperledger/fabric-${image}" "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-latest"
    docker push "hyperledger-fabric.jfrog.io/fabric-${image}:amd64-latest"
done


for target in linux-amd64 darwin-amd64 windows-amd64; do
    cd "${GOPATH}/src/github.com/hyperledger/fabric"
    make "release/${target}"

    cd "release/${target}/"
    mkdir -p "config"
    cp ../../sampleconfig/*yaml "config"
    tar -czvf "hyperledger-fabric-${target}-${RELEASE}.tar.gz" bin config
    curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
         -T "hyperledger-fabric-${target}-${RELEASE}.tar.gz" \
         "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-${target}-${RELEASE}.tar.gz"

    cd "${GOPATH}/src/github.com/hyperledger/fabric-ca"
    make "release/${target}"

    cd "release/${target}"
    tar -czvf "hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" bin
    curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
         -T "hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" \
         "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz"
done