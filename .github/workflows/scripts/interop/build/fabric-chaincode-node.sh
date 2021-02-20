#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

node common/scripts/install-run-rush.js install
node common/scripts/install-run-rush.js rebuild

docker save -o /tmp/docker-nodeenv.tgz hyperledger/fabric-nodeenv:latest
echo "::set-output name=sha::$(git rev-parse --verify HEAD)" # Save HEAD Commit SHA to Environment
