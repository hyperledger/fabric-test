#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

cd "${ARTIFACT_DIRECTORY}/fabric-source"
tar -xzf fabric-source.tgz

for target in linux-amd64 darwin-amd64; do
    make "release/${target}"
    pushd "release/${target}/"
    mkdir -p config
    cp ../../sampleconfig/*yaml config
    tar -czvf "hyperledger-fabric-${target}-${RELEASE}.tar.gz" bin config
    curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
		  -T "hyperledger-fabric-${target}-${RELEASE}.tar.gz" \
		  "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-${target}-${RELEASE}.tar.gz"
		curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
		  -T "hyperledger-fabric-${target}-${RELEASE}.tar.gz" \
		  "https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-${target}-latest.tar.gz"
    popd
done
