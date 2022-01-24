# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@single-org @basic-checks
Feature: BasicChecks

    Background: I can install and instantiate a simple chaincode
      Given Infrastructure provider is "TestNetwork"
        And Infrastructure created for network "oneorg-v2x" with channel "simplechannel"
        And All peers on channel "simplechannel" have deployed the chaincode "simple"
        And Organisation "Org1" has registered the identity "user1"

    Scenario: Gets a string response
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "simple" on channel "simplechannel"
        And  Submits a transaction "helloWorld"
        Then The result should be "Hello World"
        
    Scenario: Send and get back same data
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "simple" on channel "simplechannel"
        And  Submits a transaction "callAndResponse" with args:
            | Ping |
        Then The result should be "Ping"    

    Scenario: Put and Read a key value pair to the world state
        And Acting as Organization "Org1" user "User1"
        And Connecting via SDK "defaultgateway"
        And Using chaincode "simple" on channel "simplechannel"
        And Submits a transaction "putState" with args:
            | KEY_1 | VALUE_1 |
        Then Transaction "getState" should return "VALUE_1" for key "KEY_1"

    Scenario: Delete a key from the world state
        And Acting as Organization "Org1" user "User1"
        And Connecting via SDK "defaultgateway"
        And Using chaincode "simple" on channel "simplechannel"
        And Submits a transaction "deleteState" with args:
            | KEY_1 |
        Then Transaction "existsState" should return "false" for key "KEY_1"
