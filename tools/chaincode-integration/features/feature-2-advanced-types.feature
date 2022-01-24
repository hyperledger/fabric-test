# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@single-org @not-javascript @advanced-types
Feature: AdvanceTypes

    Background: I can install and instantiate a simple chaincode
      Given Infrastructure provider is "TestNetwork"
        And Infrastructure created for network "oneorg-v2x" with channel "simplechannel"
        And All peers on channel "simplechannel" have deployed the chaincode "advancedtypes"
        And Organisation "Org1" has registered the identity "user1"

    Scenario: Get numeric responses
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "advancedtypes" on channel "simplechannel"
        And  Submits a transaction "getInt"
        Then The result should be "1"
        And  Submits a transaction "getFloat"
        Then The result should be "1.1"

    Scenario: Get bool responses
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "advancedtypes" on channel "simplechannel"
        And  Submits a transaction "getBool"
        Then The result should be "true" 

    Scenario: Get basic type array
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "advancedtypes" on channel "simplechannel"
        And  Submits a transaction "getArray"
        Then The JSON result should be "[1, 2, 3]" 

    Scenario: Get simple object
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "advancedtypes" on channel "simplechannel"
        And  Submits a transaction "getBasicAsset"
        Then The JSON result should be '{"id": "OBJECT_1", "value": 100}'


    Scenario: Get complex object
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "advancedtypes" on channel "simplechannel"
        And  Submits a transaction "getComplexAsset"
        Then The JSON result should be '{"id":"OBJECT_2","value":100,"description":{"colour":"Vermillion","owners":["Alice","Bob"]}}'


    Scenario: Call with numeric values
        When  Acting as Organization "Org1" user "User1"
         And  Connecting via SDK "defaultgateway"
         And  Using chaincode "advancedtypes" on channel "simplechannel"
         And  Submits a transaction "callAndResponseInt" with args:
            | 2 |
        Then  The result should be "3"

    Scenario: Call with boolean values
        When  Acting as Organization "Org1" user "User1"
         And  Connecting via SDK "defaultgateway"
         And  Using chaincode "advancedtypes" on channel "simplechannel"
         And  Submits a transaction "callAndResponseBool" with args:
            | false |
        Then  The result should be "true"
         And  Submits a transaction "callAndResponseBool" with args:
            | true |
        Then  The result should be "false"

# TO FIX   
    # Scenario: Call with boolean values
    #     When  Acting as Organization "Org1" user "User1"
    #      And  Connecting via SDK "defaultgateway"
    #      And  Using chaincode "advancedtypes" on channel "simplechannel"
    #      And  Submits a transaction "callAndResponseArray" with args:
    #             | "[\"alice\",\"bob\",\"charlie\"]" |
    #     Then  The JSON result should be '["charlie","bob","alice"]'

    Scenario: Call with simple object
        When  Acting as Organization "Org1" user "User1"
         And  Connecting via SDK "defaultgateway"
         And  Using chaincode "advancedtypes" on channel "simplechannel"
         And  Submits a transaction "callAndResponseBasicAsset" with args:    
              | {"id": "OBJECT_3", "value": 200} |
        Then  The JSON result should be '{"id": "OBJECT_3", "value": 200}'

    Scenario: Call with complex object
        When  Acting as Organization "Org1" user "User1"
         And  Connecting via SDK "defaultgateway"
         And  Using chaincode "advancedtypes" on channel "simplechannel"
         And Submits a transaction "callAndResponseComplexAsset" with args:
               | {"id": "OBJECT_4", "value": 200, "description": {"colour": "red", "owners": ["andy", "matthew"]}} |
        Then The JSON result should be '{"id": "OBJECT_4", "value": 200, "description": {"colour": "red", "owners": ["andy", "matthew"]}}'
