#!/bin/bash -e

echo $#
if [ $# != 6 ]; then
  echo "Invalid number of arguments. Usage:"
  echo "./migrateToRaft.sh <kubeconfig path> <MSPID> <artifacts_location> <orderer_organizations list> <num_orderer in each org> <num_channels>"
  exit 1
fi

export KUBECONFIG=$1
export CORE_PEER_LOCALMSPID=$2
ARTIFACTS_LOCATION=$3
IFS=,
ORDERER_ORGS=($4)
NUM_ORDERERS=($5)
unset IFS
NUM_CHANNELS=$6
ORDERERS=()
CONSENTERS=()
CHANNELS=("orderersystemchannel")

for j in ${!ORDERER_ORGS[@]}
do
  for (( i=0; i < ${NUM_ORDERERS[$j]}; ++i ))
  do
    ORDERER_NAME="orderer$i-${ORDERER_ORGS[$j]}"
    ORDERERS+=($ORDERER_NAME)
    ORDERER_CERT=$(base64 $ARTIFACTS_LOCATION/crypto-config/ordererOrganizations/${ORDERER_ORGS[$j]}/orderers/$ORDERER_NAME.${ORDERER_ORGS[$j]}/tls/server.crt | tr -d '\n')
    CONSENTERS+=({'"client_tls_cert":"'$ORDERER_CERT'","host":"'$ORDERER_NAME'","port":7050,"server_tls_cert":"'$ORDERER_CERT'"'})
  done
done

CONSENTERS=$(IFS=, ; echo "${CONSENTERS[*]}")

for (( i=0; i < $NUM_CHANNELS; ++i ))
do
  CHANNELS+=("testorgschannel$i")
done

ORDERER_ORG=${ORDERER_ORGS[0]}
export CORE_PEER_MSPCONFIGPATH="$ARTIFACTS_LOCATION/crypto-config/ordererOrganizations/$ORDERER_ORG/users/Admin@$ORDERER_ORG/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="$ARTIFACTS_LOCATION/crypto-config/ordererOrganizations/$ORDERER_ORG/orderers/orderer0-$ORDERER_ORG.$ORDERER_ORG/tls/ca.crt"

export ORDERER_NAME=orderer0-$ORDERER_ORG
NODEPORT=$(kubectl --kubeconfig=$KUBECONFIG get -o jsonpath="{.spec.ports[0].nodePort}" services $ORDERER_NAME)
NODEIP=$(kubectl --kubeconfig=$KUBECONFIG get nodes -o jsonpath='{ $.items[*].status.addresses[?(@.type=="ExternalIP")].address }' | cut -d' ' -f1)
export CORE_PEER_ADDRESS=$NODEIP:$NODEPORT

export FABRIC_CFG_PATH=$PWD/../../../../../../../../../ibmadmin/config/

rm -rf config
mkdir config
cd config/

migrate(){

  CHANNEL_NAME=$2
  peer channel fetch config config_block.pb -o $CORE_PEER_ADDRESS -c $CHANNEL_NAME --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE --ordererTLSHostnameOverride $ORDERER_NAME
  configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json
  jq -s '.[0] * {"channel_group":{"groups":{"Orderer": {"values": {"ConsensusType": {"value": {'$1'}}}}}}}' config.json >modified_config.json
  configtxlator proto_encode --input config.json --type common.Config --output config.pb
  configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $CHANNEL_NAME --original config.pb --updated modified_config.pb --output modified_update.pb
  configtxlator proto_decode --input modified_update.pb --type common.ConfigUpdate | jq . > modified_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat modified_update.json)'}}}' | jq . > modified_update_in_envelope.json
  configtxlator proto_encode --input modified_update_in_envelope.json --type common.Envelope --output modified_update_in_envelope.pb
  peer channel update -f modified_update_in_envelope.pb -c $CHANNEL_NAME -o $CORE_PEER_ADDRESS --tls --cafile $CORE_PEER_TLS_ROOTCERT_FILE --ordererTLSHostnameOverride $ORDERER_NAME
   rm *.json *.pb
}

for i in ${CHANNELS[*]}
do
  echo "Config update to change state to Maintenance for channel $i "
  migrate '"state":"STATE_MAINTENANCE"' $i
  sleep 5
  echo "Config update to change consensus to Etcdraft for channel $i "
  migrate '"type":"etcdraft","metadata":{"consenters":['$CONSENTERS'],"options":{"election_tick":10,"heartbeat_tick":1,"max_inflight_blocks":5,"snapshot_interval_size":104857600,"tick_interval":"500ms"}}' $i
done

for i in ${ORDERERS[*]}
do
  kubectl --kubeconfig=$KUBECONFIG delete statefulsets $i
done

kubectl --kubeconfig=$KUBECONFIG apply -f $PWD/../launcher/configFiles/fabric-k8s-pods.yaml

sleep 120

for i in ${CHANNELS[*]}
do
  echo "Config update to change state to Normal for channel $i "
  migrate '"state":"STATE_NORMAL"' $i
done