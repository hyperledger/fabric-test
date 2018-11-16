#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./cleanNetwork.sh [docker image key word]
# example: ./cleanNetwork.sh sample
#

function printHelp {
    echo ""
    echo "usage: ./cleanNetwork.sh [docker image key word]"
    echo "example: ./cleanNetwork.sh sample"
    echo ""
    exit
}

if [ $# -ne 1 ]; then
    echo "invalid number of arguments: $#"
    printHelp
fi

keyWord=$1

# Bring down network
# Maybe this is the first testcase to run, and therefore there might be no network to clean up. Redirect stderr.
echo "..... clean network ..... docker images key word: $keyWord"
docker-compose down 2>/dev/null

#remove dead docker containers
echo "..... remove containers ....."
#docker rm -f $(docker ps -aq)
containerIDs=$(docker ps -aq)
if [ -z "$containerIDs" -o "$containerIDs" = " " ]; then
    echo "..... No containers to be deleted ....."
else
    docker rm -f $containerIDs
fi

#remove dead docker images
echo "..... remove docker images ....."
dockerImageIDs=$(docker images | grep "$keyWord" | awk '{print $3}')
if [ -z "$dockerImageIDs" -o "$dockerImageIDs" = " " ]; then
    echo "..... No images to be deleted ....."
else
    docker rmi -f $dockerImageIDs
fi

echo "..... clean Network completed."
