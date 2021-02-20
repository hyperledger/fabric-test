#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

for image in docker-fabric docker-fabric-ca docker-javaenv docker-nodeenv; do
	docker load -i "/tmp/${image}/${image}.tgz"
done
