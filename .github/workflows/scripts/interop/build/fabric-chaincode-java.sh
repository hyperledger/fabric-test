#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

./gradlew buildImage -x javadoc -x test -x checkstyleMain -x checkstyleTest -x dependencyCheckAnalyze

docker save -o /tmp/docker-javaenv.tgz hyperledger/fabric-javaenv:latest
echo "::set-output name=sha::$(git rev-parse --verify HEAD)" # Save HEAD Commit SHA to Environment
