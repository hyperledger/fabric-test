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
# bring up network
echo "[$0] bring up network"
./networkLauncher.sh -o 3 -x 2 -r 2 -p 2 -k 4 -z 3 -n 2 -t kafka -f test -w localhost -S enabled -l INFO -B 500

cd $CWD
echo [$0] "current dir: $PWD"
