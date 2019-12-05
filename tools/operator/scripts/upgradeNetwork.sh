#!/bin/bash -e
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# MSPID=$2
# NAME=$3
# ORG_NAME=$4
# ARTIFACTS_LOCATION=$5
# NUM_CHANNELS=$6
# CAPABILITY=$7
# GROUP=$8
# PEERORG_MSPID=$9
# PEERORG_NAME=${10}
# "Usage: ./upgradeNetwork.sh upgradeDB $MSPID $NAME $ORG_NAME $ARTIFACTS_LOCATION"
# "Usage: ./upgradeNetwork.sh configUpdate $MSPID $NAME $ORG_NAME $ARTIFACTS_LOCATION $NUM_CHANNELS $CAPABILITY $GROUP $PEERORG_MSPID $PEERORG_NAME"

setGlobals(){
  export FABRIC_CFG_PATH=$GOPATH/config/
  export ORDERER_ADDRESS=localhost:30000

  export CORE_PEER_LOCALMSPID=$1
  export CORE_PEER_TLS_ENABLED=true
  if [ $4 == "orderer" ]; then
    export CORE_PEER_MSPCONFIGPATH="$3/crypto-config/ordererOrganizations/$2/users/Admin@$2/msp"
    export CORE_PEER_TLS_ROOTCERT_FILE="$3/crypto-config/ordererOrganizations/$2/orderers/orderer0-$2.$2/tls/ca.crt"
  elif [ $4 == "peer" ]; then
    export CORE_PEER_MSPCONFIGPATH="$3/crypto-config/peerOrganizations/$2/users/Admin@$2/msp"
  fi
}

modifyConfig(){
  GROUP=$1
  POLICY=$2

  if [ $GROUP == "orderer" ]; then
    jq -s '.[0] * {"channel_group":{"groups":{"Orderer": {"values": {"Capabilities": '$POLICY'}}}}}' config.json > modified_config.json
  elif [ $GROUP == "channel" ]; then
    jq -s '.[0] * {"channel_group":{"values": {"Capabilities": '$POLICY'}}}' config.json > modified_config.json
  elif [ $GROUP == "application" ]; then
    jq -s '.[0] * {"channel_group":{"groups":{"Application": {"values": {"Capabilities": '$POLICY'}}}}}' config.json > modified_config.json
  elif [ $GROUP == "consortium" ]; then
    jq -s '.[0] * {"channel_group":{"groups":{"Consortiums":{"groups": {"FabricConsortium": {"groups": '$POLICY'}}}}}}' config.json > modified_config.json
  elif [ $GROUP == "organization" ]; then
    jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups": '$POLICY'}}}}' config.json > modified_config.json
  elif [ $GROUP == "apppolicy" ]; then
    jq -s '.[0] * {"channel_group":{"groups":{"Application":{"policies": '$POLICY'}}}}' config.json > modified_config.json
  elif [ $GROUP == "acls" ]; then
    jq -s '.[0] * {"channel_group":{"groups":{"Application":{"values": {"ACLs": {"mod_policy": "Admins", "value": {"acls": '$POLICY'}}}}}}}' config.json > modified_config.json
  fi
}

configtxlatorUpdate(){
  configtxlator proto_decode --input config_block.pb --type common.Block --output /tmp/data.json
  cat /tmp/data.json | jq .data.data[0].payload.data.config > config.json
  #configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json

  modifyConfig $2 $3

  configtxlator proto_encode --input config.json --type common.Config --output config.pb
  configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $1 --original config.pb --updated modified_config.pb --output modified_update.pb
  configtxlator proto_decode --input modified_update.pb --type common.ConfigUpdate --output /tmp/data.json 
  cat /tmp/data.json | jq . > modified_update.json
  #configtxlator proto_decode --input modified_update.pb --type common.ConfigUpdate | jq . > modified_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'$1'", "type":2}},"data":{"config_update":'$(cat modified_update.json)'}}}' | jq . > modified_update_in_envelope.json
  configtxlator proto_encode --input modified_update_in_envelope.json --type common.Envelope --output modified_update_in_envelope.pb
}

modifyAndSubmit(){
  MSPID=$1
  NAME=$2
  ORG_NAME=$3
  ARTIFACTS_LOCATION=$4
  CHANNEL_NAME=$5
  CAPABILITY=$6
  GROUP=$7
  PEERORG_MSPID=$8
  PEERORG_NAME=$9
  
  if [ $GROUP == "orderer" ] || [ $GROUP == "channel" ] || [ $GROUP == "application" ]; then
    POLICY=('{"mod_policy":"Admins","value":{"capabilities":{"'$CAPABILITY'":{}}},"version":"0"}')
  elif [ $GROUP == "consortium" ] || [ $GROUP == "organization" ]; then
    POLICY=('{"'$PEERORG_NAME'":{"policies":{"Endorsement":{"mod_policy":"Admins","policy":{"type":1,"value":{"identities":[{"principal":{"msp_identifier":"'$PEERORG_MSPID'","role":"MEMBER"},"principal_classification":"ROLE"}],"rule":{"n_out_of":{"n":1,"rules":[{"signed_by":0}]}},"version":0}},"version":"0"}}}}')
  elif [ $GROUP == "apppolicy" ]; then
    POLICY=('{"Endorsement":{"mod_policy":"Admins","policy":{"type":3,"value":{"rule":"ANY","sub_policy":"Endorsement"}},"version":"0"},"LifecycleEndorsement":{"mod_policy":"Admins","policy":{"type":3,"value":{"rule":"ANY","sub_policy":"Endorsement"}},"version":"0"}}')
  elif [ $GROUP == "acls" ]; then
    POLICY=('{"_lifecycle/CommitChaincodeDefinition":{"policy_ref":"/Channel/Application/Writers"},"_lifecycle/QueryChaincodeDefinition":{"policy_ref":"/Channel/Application/Readers"},"_lifecycle/QueryNamespaceDefinitions":{"policy_ref":"/Channel/Application/Readers"}}')
  fi

  rm -rf config
  mkdir config
  cd config/

  echo "Fetching config block for channel $CHANNEL_NAME"
  setGlobals $MSPID $ORG_NAME $ARTIFACTS_LOCATION orderer
  peer channel fetch config config_block.pb -o $ORDERER_ADDRESS -c $CHANNEL_NAME --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE --ordererTLSHostnameOverride $NAME

  configtxlatorUpdate $CHANNEL_NAME $GROUP $POLICY

  if [ $GROUP == "application" ] || [ $GROUP == "organization" ] || [ $GROUP == "apppolicy" ] || [ $GROUP == "acls" ] || [ $GROUP == "consortium" ]; then
    setGlobals $PEERORG_MSPID $PEERORG_NAME $ARTIFACTS_LOCATION peer
    peer channel signconfigtx -f modified_update_in_envelope.pb
    setGlobals $MSPID $ORG_NAME $ARTIFACTS_LOCATION orderer
  fi
  echo "Submitting channel config update for $CHANNEL_NAME"
  peer channel update -f modified_update_in_envelope.pb -c $CHANNEL_NAME -o $ORDERER_ADDRESS --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE --ordererTLSHostnameOverride $NAME
  rm *.json *.pb
}

upgradeDB(){
  setGlobals $1 $3 $4 peer
  cd configFiles/backup/$2
  export CORE_PEER_FILESYSTEMPATH=$PWD
  peer node upgrade-dbs
  cd -
}

configUpdate(){
  sleep 15
  if [ $7 == "orderer" ] || [ $7 == "channel" ] || [ $7 == "consortium" ]; then
    CHANNELS=("orderersystemchannel")
  elif [ $7 == "application" ] || [ $7 == "organization" ] || [ $7 == "apppolicy" ] || [ $7 == "acls" ]; then
    CHANNELS=()
  fi

  for (( i=0; i < $5; ++i ))
  do
    CHANNELS+=("testorgschannel$i")
  done

  for i in ${CHANNELS[*]}
  do
    echo "Calling modifyAndSubmit to update "$7" capability/policy for channel $i"
    modifyAndSubmit $1 $2 $3 $4 $i $6 $7 $8 $9
  done
}

if [ $1 == "upgradeDB" ]; then
  if [ $# != 5 ]; then
    echo "Invalid number of arguments. Usage:"
    echo "./upgradeNetwork.sh upgradeDB <peerorg-mspid> <peer-name> <peerorg-name> <artifacts-location>"
    exit 1
  else
    echo "Executing: upgradeDB $2 $3 $4 $5"
    upgradeDB $2 $3 $4 $5
  fi
elif [ $1 == "configUpdate" ]; then
  if [ $# != 10 ]; then
    echo "Invalid number of arguments. Usage:"
    echo "./upgradeNetwork.sh configUpdate <ordererorg-mspid> <orderer-name> <ordererorg-name> <artifacts-location> <numchannels> <capability> <group> <peerorg-mspid> <peerorg-name>"
    exit 1
  else
    echo "Executing: configUpdate $2 $3 $4 $5 $6 $7 $8 $9 ${10}"
    configUpdate $2 $3 $4 $5 $6 $7 $8 $9 ${10}
  fi
fi