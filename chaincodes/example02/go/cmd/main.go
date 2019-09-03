/*
Copyright IBM Corp. All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"fmt"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	example02 "github.com/hyperledger/fabric-test/chaincodes/example02/go"
)

func main() {
	err := shim.Start(new(example02.SimpleChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
