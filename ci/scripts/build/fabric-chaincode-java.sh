#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

docker pull hyperledger/fabric-javaenv:2.0
docker tag hyperledger/fabric-javaenv:2.0 hyperledger/fabric-javaenv:latest
