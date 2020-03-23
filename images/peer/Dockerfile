# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

ARG GO_VER=1.13.8
ARG DEBIAN_VER=buster

FROM debian:${DEBIAN_VER} as base
RUN apt-get update && apt-get install -y tzdata softhsm2
RUN mkdir -p /var/lib/softhsm/tokens && \
    softhsm2-util --init-token --slot 0 --label "ForFabric" --so-pin 1234 --pin 98765432 && \
    chmod -R 777 /var/lib/softhsm && \
    mkdir -p ~/.config/softhsm2 && \
    cp /usr/share/softhsm/softhsm2.conf ~/.config/softhsm2

FROM golang:${GO_VER}-${DEBIAN_VER} as golang
RUN apt-get update && apt-get install -y \
	bash \
	gcc \
	git \
	make
RUN mkdir -p ${GOPATH}/src/github.com/hyperledger
WORKDIR ${GOPATH}/src/github.com/hyperledger
RUN git clone https://github.com/hyperledger/fabric
WORKDIR ${GOPATH}/src/github.com/hyperledger/fabric

FROM golang as peer
RUN make peer GO_TAGS=pkcs11

FROM base
ENV FABRIC_CFG_PATH /etc/hyperledger/fabric
VOLUME /etc/hyperledger/fabric
VOLUME /var/hyperledger
COPY --from=peer /go/src/github.com/hyperledger/fabric/build/bin /usr/local/bin
COPY --from=peer /go/src/github.com/hyperledger/fabric/sampleconfig/msp ${FABRIC_CFG_PATH}/msp
COPY --from=peer /go/src/github.com/hyperledger/fabric/sampleconfig/core.yaml ${FABRIC_CFG_PATH}
EXPOSE 7051
CMD ["peer","node","start"]
