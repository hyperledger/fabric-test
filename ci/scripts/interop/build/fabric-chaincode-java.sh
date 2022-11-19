#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

git clone -b release-2.4 https://github.com/hyperledger/fabric-chaincode-java --single-branch "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-java"
cd "${GOPATH}/src/github.com/hyperledger/fabric-chaincode-java"
./gradlew buildImage -x javadoc -x test -x checkstyleMain -x checkstyleTest -x dependencyCheckAnalyze

# Package and stage artifacts
tar -czvf "${WORKING_DIRECTORY}/javaenv-source.tgz" .
docker save -o "${WORKING_DIRECTORY}/javaenv-docker.tgz" hyperledger/fabric-javaenv:latest
