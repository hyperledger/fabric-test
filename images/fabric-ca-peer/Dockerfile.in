#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
FROM _NS_/fabric-peer:_FABRIC_TAG_
COPY payload/fabric-ca-client /usr/local/bin
ARG FABRIC_CA_DYNAMIC_LINK=false
RUN chmod +x /usr/local/bin/fabric-ca-client
RUN apk update && apk add --update netcat-openbsd && rm -rf /var/cache/apk/*

# libraries needed when image is built dynamically
RUN if [ "$FABRIC_CA_DYNAMIC_LINK" = "true" ]; then apk add libltdl-dev; fi
