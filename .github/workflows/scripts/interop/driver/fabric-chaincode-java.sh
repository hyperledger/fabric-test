#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

./gradlew build -x getLatestDockerImages -x buildImage -x checkstyleMain -x checkstyleTest -x dependencyCheckAnalyze -x javadoc
