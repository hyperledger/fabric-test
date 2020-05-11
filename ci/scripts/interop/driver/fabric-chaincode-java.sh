#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

cd "${ARTIFACT_DIRECTORY}/javaenv-source"
tar -xf javaenv-source.tgz

./gradlew build -x getLatestDockerImages -x buildImage
