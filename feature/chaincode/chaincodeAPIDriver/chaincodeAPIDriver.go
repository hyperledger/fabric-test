/*
Copyright IBM Corp. 2016 All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

/* In this chaincode we explicitly define some of the methods that can be 
 * called from chaincode.go interface as invoke functions from this custom chaincode
 * We test calls and print output statements from these API
 */
import (
	"fmt"
	"strconv"
        "time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// SimpleChaincode example simple Chaincode implementation
type SimpleChaincode struct {
}

func (t *SimpleChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("ex02 Init")

	_, args := stub.GetFunctionAndParameters()
	var A, B string    // Entities
	var Aval, Bval int // Asset holdings
	var err error

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}

	// Initialize the chaincode
	A = args[0]
	Aval, err = strconv.Atoi(args[1])
	if err != nil {
		return shim.Error("Expecting integer value for asset holding")
	}
	B = args[2]
	Bval, err = strconv.Atoi(args[3])
	if err != nil {
		return shim.Error("Expecting integer value for asset holding")
	}
	fmt.Printf("Aval = %d, Bval = %d\n", Aval, Bval)

	// Write the state to the ledger
	err = stub.PutState(A, []byte(strconv.Itoa(Aval)))
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(B, []byte(strconv.Itoa(Bval)))
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

func (t *SimpleChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("\n\nex02 Invoke")

        fmt.Printf("Begin*** GetArgs \n")
        //check for getArgs and getSttringArgs
        args_take1 := stub.GetArgs()

        for key, currArg := range args_take1 {
                fmt.Printf("args_take1[%d] := %s\n", key, string(currArg))
        }
        fmt.Printf("End*** GetArgs \n\n")


        fmt.Printf("Begin*** GetStringArgs \n")
        params := stub.GetStringArgs()
        fmt.Printf("args_take2 := %s \n", params)
        fmt.Printf("End*** GetStringArgs \n\n")


        fmt.Printf("Begin*** GetArgsSlice \n")
        argsSlice, err := stub.GetArgsSlice()
	if err != nil {
                fmt.Printf("Error in argsSlice := %v \n", err)
        }
 
        if err == nil {
                fmt.Printf("argsSlice := %v \n", string(argsSlice))
        }
        fmt.Printf("End*** GetArgsSlice\n\n")


        fmt.Printf("Begin*** GetFunctionAndParameters \n")
	function, args := stub.GetFunctionAndParameters()
        fmt.Printf("function := %s, args := %s \n", function, args)
        fmt.Printf("End*** GetFunctionAndParameters\n\n")

	if function == "invoke" {
		// Make payment of X units from A to B
		return t.invoke(stub, args)
	}else if function == "getTxTimeStamp" {
		return t.getTxTimeStamp(stub)
	}else if function == "getCreator" {
		return t.getCreator(stub)
	}else if function == "getBinding" {
		return t.getBinding(stub)
	}else if function == "getSignedProposal" {
		return t.getSignedProposal(stub)
	}else if function == "getTransient" {
		return t.getTransient(stub)
	}

	return shim.Error("Invalid invoke function name. Expecting \"invoke\" ")
}

// Transaction makes payment of X units from A to B
func (t *SimpleChaincode) invoke(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var A, B string    // Entities
	var Aval, Bval int // Asset holdings
	var X int          // Transaction value
	var err error

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	A = args[0]
	B = args[1]

	// Get the state from the ledger
	// TODO: will be nice to have a GetAllState call to ledger
	Avalbytes, err := stub.GetState(A)
	if err != nil {
		return shim.Error("Failed to get state")
	}
	if Avalbytes == nil {
		return shim.Error("Entity not found")
	}
	Aval, _ = strconv.Atoi(string(Avalbytes))

	Bvalbytes, err := stub.GetState(B)
	if err != nil {
		return shim.Error("Failed to get state")
	}
	if Bvalbytes == nil {
		return shim.Error("Entity not found")
	}
	Bval, _ = strconv.Atoi(string(Bvalbytes))

	// Perform the execution
	X, err = strconv.Atoi(args[2])
	if err != nil {
		return shim.Error("Invalid transaction amount, expecting a integer value")
	}
	Aval = Aval - X
	Bval = Bval + X
	fmt.Printf("Aval = %d, Bval = %d\n", Aval, Bval)

	// Write the state back to the ledger
	err = stub.PutState(A, []byte(strconv.Itoa(Aval)))
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(B, []byte(strconv.Itoa(Bval)))
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}


//===================================================================================================
// functon getCreator
//===================================================================================================

func (t *SimpleChaincode) getCreator(stub shim.ChaincodeStubInterface) pb.Response {

        fmt.Printf("\nBegin*** getCreator \n")
        creator, err := stub.GetCreator()
        if err != nil {
                fmt.Printf("Returning error ****************** ")
                return shim.Error(err.Error())
        }
        fmt.Printf("\t returned value from stub : %v\n", string(creator))
        fmt.Printf("End*** getCreator \n")
        return shim.Success([]byte(creator))
}

//===================================================================================================
// functon to getBinding
//===================================================================================================
func (t *SimpleChaincode) getBinding(stub shim.ChaincodeStubInterface) pb.Response {
        fmt.Printf("\nBegin*** getBinding \n")
        binding, err := stub.GetBinding()
        if err != nil {
                fmt.Printf("Returning error ****************** ")
                return shim.Error(err.Error())
        }
        fmt.Printf("\t returned value from stub : %v\n", string(binding))
        fmt.Printf("End*** getBinding \n")
        return shim.Success([]byte(binding))
}

//===================================================================================================
// functon to getTxTimestamp
//===================================================================================================
func (t *SimpleChaincode) getTxTimeStamp(stub shim.ChaincodeStubInterface) pb.Response {
        fmt.Printf("\nBegin*** getTxTimeStamp \n")
        txTimeAsPtr, err := stub.GetTxTimestamp()
        if err != nil {
                fmt.Printf("Returning error ****************** ")
                return shim.Error(err.Error())
        }
        fmt.Printf("\t returned value from stub: %v\n", txTimeAsPtr)
        fmt.Printf("\t After converting time to Unix format %s \n", time.Unix(txTimeAsPtr.Seconds, int64(txTimeAsPtr.Nanos)).String())
        fmt.Printf("\nEnd*** getTxTimeStamp \n")
        //return shim.Success([]byte(txTimeAsPtr))
        return shim.Success(nil)
}

//===================================================================================================
// functon to getTransient
//===================================================================================================
func (t *SimpleChaincode) getTransient(stub shim.ChaincodeStubInterface) pb.Response {
        fmt.Printf("\nBegin*** getTransient \n")
        payload, err := stub.GetTransient()
        fmt.Printf(" payload from chaincode : %v", payload)
        if err != nil {
                return shim.Error(err.Error())
        }
        for key, currArg := range payload {
               fmt.Printf("Inside ... Loop")
                fmt.Printf("payload[%d] := %s\n", key, currArg)
        }
       fmt.Printf("\nEnd*** getTransient \n")
       return shim.Success(nil)
}


//===================================================================================================
// functon to getSignedProposal
//===================================================================================================
func (t *SimpleChaincode) getSignedProposal(stub shim.ChaincodeStubInterface) pb.Response {
        fmt.Printf("\nBegin*** getSignedProposal \n")
        signedProposal, err := stub.GetSignedProposal()
        if err != nil {
                fmt.Printf("Returning error ****************** ")
                return shim.Error(err.Error())
        }
        fmt.Printf("\t returned value from stub: %v", signedProposal)
        fmt.Printf("\nEnd*** getSignedProposal \n")
        //return shim.Success([]byte(signedProposal))
        return shim.Success(nil)
}

func main() {
	err := shim.Start(new(SimpleChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
