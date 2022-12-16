# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
ARG SOFTHSM_VERSION=2.6.1

# NOTE - 1.18.2-alpine3.14 is the last version we can build pkcs11 on without changes.
# Need to investigate what is needed to move up to later Alpine versions.
# Go 1.18.2 is latest Go version available on Alpine 3.14 images.

FROM alpine:3.14

ARG SOFTHSM_VERSION

# install build dependencies
RUN apk --update --no-cache add \
        alpine-sdk \
        autoconf \
        automake \
        git \
        libtool \
        libseccomp-dev \
        cmake \
        p11-kit-dev \
        openssl-dev \
        stunnel \
        bash

# build and install
RUN git clone https://github.com/opendnssec/SoftHSMv2.git /tmp/softhsm2
WORKDIR /tmp/softhsm2

RUN git checkout ${SOFTHSM_VERSION} -b ${SOFTHSM_VERSION} \
    && sh autogen.sh \
    && ./configure \
    && make \
    && make install

RUN git clone https://github.com/SUNET/pkcs11-proxy /tmp/pkcs11-proxy && \
    cd /tmp/pkcs11-proxy && \
    cmake . && make && make install

RUN rm -rf /tmp/softhsm2 /tmp/pkcs11-proxy
WORKDIR /root

# install pkcs11-tool
RUN apk --update --no-cache add opensc && \
    echo "0:/var/lib/softhsm/slot0.db" > /etc/softhsm2.conf && \
    softhsm2-util --init-token --slot 0 --label ForFabric --pin 98765432 --so-pin 1234

EXPOSE 2345
ENV PKCS11_DAEMON_SOCKET="tcp://0.0.0.0:2345"
CMD [ "/usr/local/bin/pkcs11-daemon", "/usr/local/lib/softhsm/libsofthsm2.so" ]
