/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type serverConfig struct {
	CCID    string
	Address string
}

// SimpleContract with biz logic
type SimpleContract struct {
	contractapi.Contract
}

// HelloWorld - returns a string
func (sc *SimpleContract) HelloWorld(ctx contractapi.TransactionContextInterface) string {
	return "Hello World"
}

// CallAndResponse - Returns the string you send
func (sc *SimpleContract) CallAndResponse(ctx contractapi.TransactionContextInterface, value string) string {
	return value
}

// PutState - Adds a key value pair to the world state
func (sc *SimpleContract) PutState(ctx contractapi.TransactionContextInterface, key string, value string) error {
	return ctx.GetStub().PutState(key, []byte(value))
}

// GetState - Gets the value for a key from the world state
func (sc *SimpleContract) GetState(ctx contractapi.TransactionContextInterface, key string) (string, error) {
	bytes, err := ctx.GetStub().GetState(key)

	if err != nil {
		return "", nil
	}

	return string(bytes), nil
}

// ExistsState returns true when asset with given ID exists in world state
func (sc *SimpleContract) ExistsState(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	bytes, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return bytes != nil, nil
}

// DeleteState - Deletes a key from the world state
func (sc *SimpleContract) DeleteState(ctx contractapi.TransactionContextInterface, key string) error {
	return ctx.GetStub().DelState(key)
}

func main() {
	simpleContract := new(SimpleContract)

	cc, err := contractapi.NewChaincode(simpleContract)

	if err != nil {
		panic(err.Error())
	}

	config := serverConfig{
		CCID:    os.Getenv("CORE_CHAINCODE_ID_NAME"),
		Address: os.Getenv("CHAINCODE_SERVER_ADDRESS"),
	}

	if len(config.CCID) > 0 && len(config.Address) > 0 {
		server := &shim.ChaincodeServer{
			CCID:    config.CCID,
			Address: config.Address,
			CC:      cc,
			TLSProps: shim.TLSProperties{
				Disabled: true,
			},
		}

		if err := server.Start(); err != nil {
			panic(err.Error())
		}
	}

	if err := cc.Start(); err != nil {
		panic(err.Error())
	}
}
