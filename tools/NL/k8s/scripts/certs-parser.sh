# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#!/bin/bash
if [ $(which apt | wc -l) == '1' ]
then
  apt-get update
  apt-get install -y jq
elif [ $(which apk | wc -l) == '1' ]
then
  apk add jq
fi

MSPDIR=/etc/hyperledger/fabric/artifacts/
MSPSECRET=/etc/hyperledger/fabric/secret/$1
set -e

echo "#####Creating MSP directory structure#####"
mkdir -p $MSPDIR/msp/admincerts $MSPDIR/msp/cacerts $MSPDIR/msp/signcerts $MSPDIR/msp/tlscacerts $MSPDIR/msp/keystore $MSPDIR/tls $MSPDIR/ca $MSPDIR/tlsca

ADMINCERT=$(eval echo $(cat $MSPSECRET | jq '.msp.admin_certs.admin_pem'))
echo -e $ADMINCERT > $MSPDIR/msp/admincerts/cert.pem
truncate -s -1 $MSPDIR/msp/admincerts/cert.pem

CACERT=$(eval echo $(cat $MSPSECRET | jq '.msp.ca_certs.ca_pem'))
echo -e $CACERT > $MSPDIR/msp/cacerts/ca-cert.pem
truncate -s -1 $MSPDIR/msp/cacerts/ca-cert.pem

SIGNCERT=$(eval echo $(cat $MSPSECRET | jq '.msp.sign_certs.pem'))
echo -e $SIGNCERT > $MSPDIR/msp/signcerts/cert.pem
truncate -s -1 $MSPDIR/msp/signcerts/cert.pem

TLSCACERT=$(eval echo $(cat $MSPSECRET | jq '.msp.tls_ca.tls_pem'))
echo -e $TLSCACERT > $MSPDIR/msp/tlscacerts/tlsca-cert.pem
truncate -s -1 $MSPDIR/msp/tlscacerts/tlsca-cert.pem

PRIVKEY=$(eval echo $(cat $MSPSECRET | jq '.msp.key_store.private_key'))
echo -e $PRIVKEY > $MSPDIR/msp/keystore/cert.key
truncate -s -1 $MSPDIR/msp/keystore/cert.key

TLS_CA_CRT=$(eval echo $(cat $MSPSECRET | jq '.tls.ca_cert'))
echo -e $TLS_CA_CRT > $MSPDIR/tls/ca.crt
truncate -s -1 $MSPDIR/tls/ca.crt

TLS_SERVER_CRT=$(eval echo $(cat $MSPSECRET | jq '.tls.server_cert'))
echo -e $TLS_SERVER_CRT > $MSPDIR/tls/server.crt
truncate -s -1 $MSPDIR/tls/server.crt

TLS_SERVER_KEY=$(eval echo $(cat $MSPSECRET | jq '.tls.server_key'))
echo -e $TLS_SERVER_KEY > $MSPDIR/tls/server.key
truncate -s -1 $MSPDIR/tls/server.key

CA_CRT=$(eval echo $(cat $MSPSECRET | jq '.ca.pem'))
echo -e $CA_CRT > $MSPDIR/ca/ca-cert.pem
truncate -s -1 $MSPDIR/ca/ca-cert.pem

CA_PRIVATE_KEY=$(eval echo $(cat $MSPSECRET | jq '.ca.private_key'))
echo -e $CA_PRIVATE_KEY > $MSPDIR/ca/ca_private.key
truncate -s -1 $MSPDIR/ca/ca_private.key

TLSCA_CRT=$(eval echo $(cat $MSPSECRET | jq '.tlsca.pem'))
echo -e $TLSCA_CRT > $MSPDIR/tlsca/tlsca-cert.pem
truncate -s -1 $MSPDIR/tlsca/tlsca-cert.pem

TLSCA_PRIVATE_KEY=$(eval echo $(cat $MSPSECRET | jq '.tlsca.private_key'))
echo -e $TLSCA_PRIVATE_KEY > $MSPDIR/tlsca/tlsca_private.key
truncate -s -1 $MSPDIR/tlsca/tlsca_private.key

echo "#####Completed creating MSP directory structure#####"

set +e