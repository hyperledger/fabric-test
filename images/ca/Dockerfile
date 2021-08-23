# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
ARG ALPINE_VER=3.14
ARG BRANCH="main"
ARG GO_LDFLAGS=-"linkmode external -extldflags '-lpthread'"
ARG GO_TAGS=pkcs11
ARG GO_VER=1.16.7
ARG PROXY_VERSION=2032875

FROM golang:${GO_VER}-alpine${ALPINE_VER} as ca-builder

ARG GO_TAGS
ARG BRANCH
ARG GO_LDFLAGS

RUN apk add --no-cache \
	gcc \
	git \
	musl-dev \
	opensc

RUN mkdir -p ${GOPATH}/src/github.com/hyperledger/fabric-ca
RUN git clone -b ${BRANCH} \
    https://github.com/hyperledger/fabric-ca \
    ${GOPATH}/src/github.com/hyperledger/fabric-ca

RUN cd ${GOPATH}/src/github.com/hyperledger/fabric-ca && \
    go install -tags "${GO_TAGS}" -ldflags "${GO_LDFLAGS}" \
	github.com/hyperledger/fabric-ca/cmd/fabric-ca-server
RUN cd ${GOPATH}/src/github.com/hyperledger/fabric-ca && \
    go install -tags "${GO_TAGS}" -ldflags "${GO_LDFLAGS}" \
	github.com/hyperledger/fabric-ca/cmd/fabric-ca-client

FROM alpine:${ALPINE_VER} as pkcs11-builder

ARG PROXY_VERSION

RUN apk add \
    alpine-sdk \
    git \
    libtool \
    libseccomp-dev \
    cmake \
    openssl-dev

RUN git clone https://github.com/SUNET/pkcs11-proxy && \
	cd pkcs11-proxy && \
	git checkout ${PROXY_VERSION} && \
	cmake . && \
	make && \
	make install

FROM alpine:${ALPINE_VER}

ENV FABRIC_CA_HOME /etc/hyperledger/fabric-ca-server
RUN mkdir -p ${FABRIC_CA_HOME}

RUN apk add --no-cache tzdata bash

COPY --from=pkcs11-builder /usr/local/bin/pkcs11-daemon /usr/local/bin/pkcs11-daemon
COPY --from=pkcs11-builder /usr/local/lib/libpkcs11-proxy.so.0.1 /usr/local/lib/libpkcs11-proxy.so.0.1
COPY --from=pkcs11-builder /usr/local/lib/libpkcs11-proxy.so.0 /usr/local/lib/libpkcs11-proxy.so.0
COPY --from=pkcs11-builder /usr/local/lib/libpkcs11-proxy.so /usr/local/lib/libpkcs11-proxy.so
COPY --from=ca-builder /go/bin /usr/local/bin
COPY ./fabric-ca-server-config.yaml $FABRIC_CA_HOME

EXPOSE 7054
CMD fabric-ca-server start -b admin:adminpw
