#!/bin/bash -e
echo "#########################################"
echo "#                                       #"
echo "#            WELCOME TO OTE             #"
echo "#                                       #"
echo "#########################################"
echo "[fabric-test/tools/OTE/script.sh] Executing TESTCASE=$TESTCASE"
echo "Creating Channels: $numChannels"
for (( i=1; i<=${numChannels}; i++ ))
do
       sleep 15
       echo "creating channel testorgschannel$i"
       peer channel create -o orderer0.example.com:5005 -c testorgschannel$i -f /etc/hyperledger/fabric/artifacts/ordererOrganizations/testorgschannel$i.tx --tls --cafile /etc/hyperledger/fabric/artifacts/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -t 60s
done
echo "$ go build"
go build
echo "$ go test -run $TESTCASE"
go test -run $TESTCASE -timeout=90m
mv ote-*.log ote.log
