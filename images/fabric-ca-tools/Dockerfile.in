#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
FROM _NS_/fabric-tools:_FABRIC_TAG_
COPY payload/fabric-ca-client /usr/local/bin
RUN chmod +x /usr/local/bin/fabric-ca-client
RUN apk update
RUN apk add jq
