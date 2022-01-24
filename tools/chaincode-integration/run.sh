#!/bin/bash

set -e -o pipefail

# export TEST_NETWORK_EXISTING=true
CONFIG_LOCATION=$(pwd)
echo "Using configuration from $(realpath ${CONFIG_LOCATION}/cucumber.js)"

if [ ! -f cucumber.js ]; then
    cp $(npm bin)/../fabric-chaincode-integration/cucumber.js ${CONFIG_LOCATION}
    echo "Configuration not present, so copying default, please edit as needed, and rerun"
    exit 0
fi

if [ ! -d features ]; then
    cp -r $(npm bin)/../fabric-chaincode-integration/features ${CONFIG_LOCATION}
    echo "Feature files not present in 'features' directory, copying default"
fi


# $(npm bin)/cucumber-js -p prod --tags '@basic-checks or @advanced-types or @metadata-checks' --fail-fast
$(npm bin)/cucumber-js -p dev --tags '@basic-checks or @advanced-types or @metadata-checks' --fail-fast
