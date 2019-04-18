#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

CWD=$PWD

cd ../../../NL
echo "[$0] NL dir: $PWD"
# bring down network
echo "[$0] bring down network"
./networkLauncher.sh -a down