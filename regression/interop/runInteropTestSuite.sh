#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
INTEROPDIR="$FabricTestDir/regression/interop"
cd $INTEROPDIR

echo "======== Interoperability tests... ========"
cd ../../feature
behave --junit --junit-directory ../regression/interop/. --tags=-skip --tags=interop -k -D logs=y
cd -

