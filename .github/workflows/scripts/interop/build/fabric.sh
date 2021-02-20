#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

make docker

for target in linux-amd64 darwin-amd64; do
  make "release/${target}"
  pushd "release/${target}/"
  mkdir -p config
  cp ../../sampleconfig/*yaml config
  tar -czvf "/tmp/hyperledger-fabric-${target}-${RELEASE}.tar.gz" bin config
  popd
done

docker save -o /tmp/docker-fabric.tgz $(docker images --filter reference='hyperledger/*:latest' | grep hyperledger | cut -d' ' -f1)
echo "::set-output name=sha::$(git rev-parse --verify HEAD)" # Save HEAD Commit SHA to Environment
