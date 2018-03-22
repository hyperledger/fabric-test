# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

FROM hyperledger/fabric-tools:x86_64-1.1.0

WORKDIR /opt/

ENV GOPATH /opt/gopath
ENV GOROOT /opt/go
ENV BASERUN /opt

RUN apt-get update -y && apt-get upgrade -y && apt-get install -y curl \
        vim \
        git \
        build-essential \
        && rm -rf /var/lib/apt/lists/*

COPY fabric-sdk-node $BASERUN/gopath/src/github.com/hyperledger/fabric-test/fabric-sdk-node
COPY .git $BASERUN/gopath/src/github.com/hyperledger/fabric-test/.git
COPY tools/PTE $BASERUN/gopath/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE

COPY testcases.sh $BASERUN/testcases.sh

Entrypoint ["sh", "-c", "./testcases.sh"]
