#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

make docker

for target in linux-amd64 darwin-amd64; do
	make "release/${target}"
	pushd "release/${target}"
	tar -czvf "/tmp/hyperledger-fabric-ca-${target}-${RELEASE}.tar.gz" bin
	popd
done

docker save -o /tmp/docker-fabric-ca.tgz hyperledger/fabric-ca:latest
echo "::set-output name=sha::$(git rev-parse --verify HEAD)" # Save HEAD Commit SHA to Environment
