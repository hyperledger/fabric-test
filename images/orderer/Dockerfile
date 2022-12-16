# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

ARG ALPINE_VER=3.16
ARG BRANCH=main
ARG GO_TAGS=pkcs11
ARG GO_VER=1.18.7
ARG PROXY_VERSION=2032875

FROM golang:${GO_VER}-alpine${ALPINE_VER} as orderer-builder

ARG BRANCH
ARG GO_TAGS

RUN apk add --no-cache \
	bash \
	gcc \
	git \
	make \
	musl-dev \
	opensc

RUN git clone -b ${BRANCH} https://github.com/hyperledger/fabric

RUN cd fabric && make orderer GO_TAGS=${GO_TAGS}

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

ENV FABRIC_CFG_PATH /etc/hyperledger/fabric
RUN apk add --no-cache tzdata bash

VOLUME /etc/hyperledger/fabric
VOLUME /var/hyperledger

COPY --from=pkcs11-builder /usr/local/bin/pkcs11-daemon /usr/local/bin/pkcs11-daemon
COPY --from=pkcs11-builder /usr/local/lib/libpkcs11-proxy.so.0.1 /usr/local/lib/libpkcs11-proxy.so.0.1
COPY --from=pkcs11-builder /usr/local/lib/libpkcs11-proxy.so.0 /usr/local/lib/libpkcs11-proxy.so.0
COPY --from=pkcs11-builder /usr/local/lib/libpkcs11-proxy.so /usr/local/lib/libpkcs11-proxy.so
COPY --from=orderer-builder /go/fabric/build/bin /usr/local/bin
#COPY --from=peer-builder /go/fabric/sampleconfig/msp ${FABRIC_CFG_PATH}/msp
COPY orderer.yaml $FABRIC_CFG_PATH/orderer.yaml

EXPOSE 7051
CMD ["peer","node","start"]
