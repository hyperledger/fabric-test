# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

ARG GO_VER=1.18
ARG ALPINE_VER=3.14

FROM golang:${GO_VER}-alpine${ALPINE_VER}

WORKDIR $GOPATH/src/github.com/hyperledger/fabric-test/tools/chaincode-integration/resources/chaincode/simple-go
COPY . .

RUN go get -d -v ./...
RUN go install -v ./...

EXPOSE 9999
CMD ["/go/bin/simple-go"]
