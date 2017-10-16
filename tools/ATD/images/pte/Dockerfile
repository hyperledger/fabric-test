# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

FROM ubuntu:16.04

WORKDIR /root/

ENV GOPATH /root/gopath
ENV GOROOT /root/go
ENV BASERUN /root
ENV PATH="${PATH}:/root/.nvm/versions/node/v6.*/bin"

RUN apt-get update -y && apt-get upgrade -y && apt-get install -y curl \
        vim \
        build-essential \
        python \
        git \
        jq \
        bc \
        && rm -rf /var/lib/apt/lists/*

COPY fabric-sdk-node $BASERUN/gopath/src/github.com/hyperledger/fabric-test/fabric-sdk-node
COPY tools/PTE $BASERUN/gopath/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE

# Installing Node and NPM
RUN set -x \
        && curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash \
        && export NVM_DIR="$HOME/.nvm" \
        && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" \
        && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
        && nvm install lts/boron \
        && cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node \
        && npm install \
        && npm install singly-linked-list \
        && cd node_modules/.bin && ./gulp ca

COPY testcases.sh $BASERUN/testcases.sh

Entrypoint ["sh", "-c", "./testcases.sh"]
