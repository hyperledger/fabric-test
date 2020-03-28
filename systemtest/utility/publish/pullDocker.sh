#!/bin/bash

docker pull hyperledger/fabric-ca:1.4
docker tag  hyperledger/fabric-ca:1.4  hyperledger/fabric-ca:latest

for image in peer orderer ccenv javaenv nodeenv baseos; do
	docker pull hyperledger/fabric-${image}:2.0
	docker tag  hyperledger/fabric-${image}:2.0  hyperledger/fabric-${image}:latest
done
