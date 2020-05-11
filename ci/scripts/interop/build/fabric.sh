#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

cd "${ARTIFACT_DIRECTORY}/fabric-source"
tar -xzf fabric-source.tgz
make "${TARGET}-docker"

# Package and stage artifacts
docker save -o "${WORKING_DIRECTORY}/${TARGET}-docker.tgz" "hyperledger/fabric-${TARGET}:latest"
