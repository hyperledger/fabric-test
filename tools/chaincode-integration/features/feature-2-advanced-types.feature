# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@single-org @not-javascript @advanced-types
Feature: AdvanceTypes

    Scenario: I can install and instantiate an advanced type chaincode
        Given Channel "advancedchannel" has been created using the profile "channel"
        And All peers on channel "advancedchannel" have installed the chaincode "advancedtypes"
        And Organisation "Org1" has registered the identity "user1"
        And Organisation "Org1" has instantiated the chaincode "advancedtypes" on channel "advancedchannel"

    Scenario: Get numeric responses
        Then Expecting result "1" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "getInt" on channel "advancedchannel" as "user1"
        Then Expecting result "1.1" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "getFloat" on channel "advancedchannel" as "user1"

    Scenario: Get bool responses
        Then Expecting result "true" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "getBool" on channel "advancedchannel" as "user1"

    Scenario: Get basic type array
        Then Expecting result "[1, 2, 3]" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "getArray" on channel "advancedchannel" as "user1"

    Scenario: Get simple object
        Then Expecting result '{"id": "OBJECT_1", "value": 100}' organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "getBasicAsset" on channel "advancedchannel" as "user1"

    Scenario: Get complex object
        Then Expecting result '{"id": "OBJECT_2", "value": 100, "description": {"colour": "red", "owners": ["andy", "matthew"]}}' organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "getComplexAsset" on channel "advancedchannel" as "user1"

    Scenario: Call with numeric values
        Then Expecting result "2" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "callAndResponseInt" on channel "advancedchannel" as "user1" with args:
            | 2 |
        Then Expecting result "2.1" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "callAndResponseFloat" on channel "advancedchannel" as "user1" with args:
            | 2.1 |
    
    Scenario: Call with bool value
        Then Expecting result "false" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "callAndResponseBool" on channel "advancedchannel" as "user1" with args:
            | false |

    Scenario: Call with basic type array value
        Then Expecting result "[false, true]" organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "callAndResponseArray" on channel "advancedchannel" as "user1" with args:
            | [false, true] |

    Scenario: Call with simple object
        Then Expecting result '{"id": "OBJECT_3", "value": 200}' organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "callAndResponseBasicAsset" on channel "advancedchannel" as "user1" with args:
            | {"id": "OBJECT_3", "value": 200} |

    Scenario: Call with complex object
        Then Expecting result '{"id": "OBJECT_4", "value": 200, "description": {"colour": "red", "owners": ["andy", "matthew"]}}' organisation "Org1" evaluates against the chaincode "advancedtypes" the transaction "callAndResponseComplexAsset" on channel "advancedchannel" as "user1" with args:
            | {"id": "OBJECT_4", "value": 200, "description": {"colour": "red", "owners": ["andy", "matthew"]}} |
