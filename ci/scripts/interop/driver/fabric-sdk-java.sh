#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b main https://github.com/hyperledger/fabric-sdk-java --single-branch "${ARTIFACT_DIRECTORY}/fabric-sdk-java"
cd "${ARTIFACT_DIRECTORY}/fabric-sdk-java"

sed -i '/source/d' ./scripts/run-integration-tests.sh
./scripts/run-integration-tests.sh
