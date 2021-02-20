#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

sed -i '/source/d' ./scripts/run-integration-tests.sh
./scripts/run-integration-tests.sh
