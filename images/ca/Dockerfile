#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
ARG GO_VER=1.13.8
ARG DEBIAN_VERSION=buster

FROM golang:${GO_VER}-buster as builder
ARG GO_LDFLAGS="-linkmode external -extldflags '-lpthread'"
ARG GO_TAGS=pkcs11

RUN apt-get update && apt-get install -y \
	gcc \
	git

RUN mkdir -p ${GOPATH}/src/github.com/hyperledger
WORKDIR ${GOPATH}/src/github.com/hyperledger
RUN git clone -b release-1.4 https://github.com/hyperledger/fabric-ca
WORKDIR ${GOPATH}/src/github.com/hyperledger/fabric-ca
RUN perl -i -p0e \
    's/bccsp.+keystore/bccsp:\n    default: PKCS11\n    pkcs11:\n        Library: \/usr\/lib\/x86_64-linux-gnu\/softhsm\/libsofthsm2.so\n        Label: ForFabric\n        Pin: "98765432"\n        hash: SHA2\n        security: 256/gms' \
    ./cmd/fabric-ca-server/config.go
RUN go install -tags pkcs11 -ldflags "${GO_LDFLAGS}" github.com/hyperledger/fabric-ca/cmd/fabric-ca-server
RUN go install -tags pkcs11 -ldflags "${GO_LDFLAGS}" github.com/hyperledger/fabric-ca/cmd/fabric-ca-client

FROM debian:${DEBIAN_VERSION}
RUN apt-get update && apt-get install -y tzdata softhsm2
RUN mkdir -p /var/lib/softhsm/tokens && \
    softhsm2-util --init-token --slot 0 --label "ForFabric" --so-pin 1234 --pin 98765432 && \
    chmod -R 777 /var/lib/softhsm && \
    mkdir -p ~/.config/softhsm2 && \
    cp /usr/share/softhsm/softhsm2.conf ~/.config/softhsm2
ENV FABRIC_CA_HOME /etc/hyperledger/fabric-ca-server
COPY --from=builder /go/bin /usr/local/bin
EXPOSE 7054
CMD fabric-ca-server start -b admin:adminpw
