#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
cd "$FabricTestDir/regression/systemtest"

echo "======== System Tests on k8s cluster... ========"
export GinkoTests=true
ginkgo && echo "------> System tests completed"
cd -

