# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

## Dockerfile for building the PTE image

# Base Nodejs image to use
FROM library/node:8.11

ENV GOPATH /root/go
RUN apt update && apt install -y git jq

#Clone latest fabric-test repo and install node modules
RUN mkdir -p $GOPATH/src/github.com/hyperledger/ \
    && cd $GOPATH/src/github.com/hyperledger \
    && git clone -b release-1.1 https://github.com/hyperledger/fabric-test/ \
    && cd $GOPATH/src/github.com/hyperledger/fabric-test \
    && git submodule update --init --recursive \
    && cd tools/PTE \
    && npm install

WORKDIR $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE
