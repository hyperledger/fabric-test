#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b main https://github.com/hyperledger/fabric-sdk-node --single-branch "${ARTIFACT_DIRECTORY}/fabric-sdk-node"
cd "${ARTIFACT_DIRECTORY}/fabric-sdk-node"

npm install
npm run installAndGenerateCerts
npm test
