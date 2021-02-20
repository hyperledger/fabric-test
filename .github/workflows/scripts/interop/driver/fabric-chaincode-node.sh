#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

sed -i 's/.\/tools\/getEdgeDocker.sh/docker images/g' common/config/rush/command-line.json
node common/scripts/install-run-rush.js install
node common/scripts/install-run-rush.js rebuild
node common/scripts/install-run-rush.js update
node common/scripts/install-run-rush.js publish --include-all --pack --release-folder ./build --publish
node common/scripts/install-run-rush.js start-fabric
node common/scripts/install-run-rush.js start-verdaccio
node common/scripts/install-run-rush.js test:fv
node common/scripts/install-run-rush.js test:e2e
