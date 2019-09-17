#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
NLDir=$FabricTestDir/tools/NL

CWD=$PWD

cd $NLDir
echo "[$0] NL dir: $PWD"
# bring down network
echo "[$0] bring down network"
./networkLauncher.sh -a down
# bring up network
echo "[$0] bring up network"
# This would create 6 orderers in a kafka network - not a raft network as specified in the jira. This networkLauncher
# was NOT used to bring up our test network in the k8s cluster. 
# Also notice the path of the create-channel-config transaction referenced in the 3 channel files:
#   preconfig/channels/chan1-create-TLS.json
#   preconfig/channels/chan2-create-TLS.json
#   preconfig/channels/chan3-create-TLS.json
./networkLauncher.sh -o 6 -x 1 -r 1 -p 2 -k 4 -z 3 -n 1 -e 3 -t kafka -f test -w localhost -S enabled -c 2s -l INFO -B 1

cd $CWD
echo [$0] "current dir: $PWD"
