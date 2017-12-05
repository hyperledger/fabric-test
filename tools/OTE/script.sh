#!/bin/bash
echo "#########################################"
echo "#                                       #"
echo "#            WELCOME TO OTE             #"
echo "#                                       #"
echo "#########################################"

echo "Creating Channels"
echo $numChannels
for (( i=1; i<=${numChannels}; i++ ))
do
       peer channel create -o orderer0.example.com:7050 -c testorgschannel$i -f /etc/hyperledger/fabric/artifacts/ordererOrganizations/testorgschannel$i.tx --tls --cafile /etc/hyperledger/fabric/artifacts/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -t 60
done
go build
sleep 30
go test -run $TESTCASE -timeout=90m
if [ ! -d logs ];then
       mkdir logs
fi
mv ote-*.log ./logs/${TESTCASE}.log
