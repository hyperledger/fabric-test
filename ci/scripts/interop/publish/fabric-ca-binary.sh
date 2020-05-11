#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

mkdir -p "${GOPATH}/src/github.com/hyperledger/fabric-ca"
cd "${GOPATH}/src/github.com/hyperledger/fabric-ca"
cp "${ARTIFACT_DIRECTORY}/ca-source/ca-source.tgz" .
tar -xzf ca-source.tgz

for target in linux-amd64 darwin-amd64; do
	make "release/${target}"
	pushd "release/${target}"
	tar -czvf "hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" bin
	curl -u"${ARTIFACTORY_USERNAME}":"${ARTIFACTORY_PASSWORD}" \
		-T "hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" \
		"https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz"
    popd
done
