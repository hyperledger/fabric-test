#!/bin/bash -e
set -o pipefail

########################################################
# Updating go modules for all the fabric-test chaincodes
########################################################
cd $PWD/scripts
./update_go_modules.sh
