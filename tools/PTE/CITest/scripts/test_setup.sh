#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

CWD=$PWD

cd ../..
PTEDir=$PWD
echo "[$0] PTEDir= $PTEDir"

# install fablric-client and fabric-ca-client
cd $PTEDir
echo "***** npm install fabric-client *****"
npm install fabric-client

echo "***** npm install fabric-ca-client *****"
npm install fabric-ca-client

cd $CWD
echo "[$0] current dir: $PWD"
