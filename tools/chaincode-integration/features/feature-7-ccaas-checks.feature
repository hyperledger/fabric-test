# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@single-org @ccaas-checks
Feature: CcaasChecks

    Background: I can install and instantiate a simple chaincode
      Given Infrastructure provider is "TestNetwork"
        And Infrastructure created for network "oneorg-v2x" with channel "ccaaschannel"
        And All peers on channel "ccaaschannel" have deployed the chaincode "ccaas"
        And Organisation "Org1" has registered the identity "User1"

    Scenario: Gets a string response
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "ccaas" on channel "ccaaschannel"
        And  Submits a transaction "helloWorld"
        Then The result should be "Hello World"
        
    Scenario: Send and get back same data
        And  Acting as Organization "Org1" user "User1"
        And  Connecting via SDK "defaultgateway"
        And  Using chaincode "ccaas" on channel "ccaaschannel"
        And  Submits a transaction "callAndResponse" with args:
            | Ping |
        Then The result should be "Ping"    

    Scenario: Put and Read a key value pair to the world state
        And Acting as Organization "Org1" user "User1"
        And Connecting via SDK "defaultgateway"
        And Using chaincode "ccaas" on channel "ccaaschannel"
        And Submits a transaction "putState" with args:
            | KEY_1 | VALUE_1 |
        Then Transaction "getState" should return "VALUE_1" for key "KEY_1"

    Scenario: Delete a key from the world state
        And Acting as Organization "Org1" user "User1"
        And Connecting via SDK "defaultgateway"
        And Using chaincode "ccaas" on channel "ccaaschannel"
        And Submits a transaction "deleteState" with args:
            | KEY_1 |
        Then Transaction "existsState" should return "false" for key "KEY_1"
