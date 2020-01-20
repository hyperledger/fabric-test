# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@three-org @private-data-collections
Feature: BasicChecks

    Scenario: I can install and instantiate a private chaincode
        Given Channel "privatechannel" has been created using the profile "channel"
        And All peers on channel "privatechannel" have installed the chaincode "private"
        And Chaincode "private" when instantiated on channel "privatechannel" will use private data collection config "Org1AndOrg2.json"
        And Organisation "Org1" has registered the identity "user1"
        And Organisation "Org2" has registered the identity "user2"
        And Organisation "Org3" has registered the identity "user3"
        And Organisation "Org1" has instantiated the chaincode "private" on channel "privatechannel"

    Scenario: Put a key value pair to a private collection
        When Organisation "Org1" submits against the chaincode "private" the transaction "putPrivateState" on channel "privatechannel" as "user1" with args:
            | KEY_1 | VALUE_1 |
        Then The private data collection "Org1AndOrg2" for the chaincode "private" on channel "privatechannel" should contain "VALUE_1" for key "KEY_1"

    Scenario: Read a key value pair from a private data collection
        Then Expecting result "VALUE_1" organisation "Org1" evaluates against the chaincode "private" the transaction "getPrivateState" on channel "privatechannel" as "user1" with args:
            | KEY_1 |
        And Expecting result "VALUE_1" organisation "Org2" evaluates against the chaincode "private" the transaction "getPrivateState" on channel "privatechannel" as "user2" with args:
            | KEY_1 |
        Then Expecting the error "Could not read private collection Org1AndOrg2" organisation "Org3" evaluates against the chaincode "private" the transaction "getPrivateState" on channel "privatechannel" as "user3" with args:
            | KEY_1 |

    Scenario: Delete a key from the world state
        When Organisation "Org2" submits against the chaincode "private" the transaction "deletePrivateState" on channel "privatechannel" as "user2" with args:
            | KEY_1 |
        Then The private data collection "Org1AndOrg2" for the chaincode "private" on channel "privatechannel" should not have key "KEY_1"