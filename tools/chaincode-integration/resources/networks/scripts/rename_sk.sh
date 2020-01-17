#!/bin/bash
# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# Rename the key files we use to be key.pem instead of a uuid
BASEDIR=$(dirname "$0")

for KEY in $(find /etc/hyperledger/config -type f -name "*_sk"); do
    KEY_DIR=$(dirname ${KEY})
    mv ${KEY} ${KEY_DIR}/key.pem
done