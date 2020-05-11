#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
#set -euo pipefail

for image in ca baseos tools peer orderer nodeenv ccenv javaenv; do
	cd "${ARTIFACT_DIRECTORY}/${image}-docker"
	docker load -i "${image}-docker.tgz"
	rm -rf *.tgz
done
