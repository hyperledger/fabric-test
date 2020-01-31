# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

@single-org @metadata-checks
Feature: MetadataChecks

    Scenario: I can install and instantiate an advanced type chaincode
        Given Channel "metadatachannel" has been created using the profile "channel"

        And Organisation "Org1" has registered the identity "user1"
        And All peers on channel "metadatachannel" have installed the chaincode "advancedtypes"
        And All peers on channel "metadatachannel" have installed the chaincode "simple"
        And Organisation "Org1" has instantiated the chaincode "advancedtypes" on channel "metadatachannel"
        And Organisation "Org1" has instantiated the chaincode "simple" on channel "metadatachannel"

    Scenario: The metadata I retrieve meets the schema
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for chaincode "advancedtypes" on channel "metadatachannel" should meet the schema

    Scenario: I can use metadata to work out contracts existing in a chaincode
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for chaincode "advancedtypes" on channel "metadatachannel" should contain the contracts:
            | AdvancedTypesContract |
    
    Scenario: I can use metadata to work out the transactions existing in a contract
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the transactions:
            | callAndResponseArray | callAndResponseBasicAsset | callAndResponseBool | callAndResponseComplexAsset | callAndResponseFloat | callAndResponseInt | getArray | getBasicAsset | getBool | getComplexAsset | getFloat | getInt |

    Scenario: I can use metadata to work out how to run a string based transaction
        Given I have retrieved the metadata for chaincode "simple" on channel "metadatachannel"
        Then The metadata for the transaction "callAndResponse" in contract "SimpleContract" in chaincode "simple" on channel "metadatachannel" should contain the parameters:
            | name  | schema             |
            | value | {"type": "string"} |
        Then The metadata for the transaction "callAndResponse" in contract "SimpleContract" in chaincode "simple" on channel "metadatachannel" should contain the return schema '{"type": "string"}'

    Scenario: I can use metadata to work out how to run a number based transaction
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for the transaction "callAndResponseInt" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the parameters:
            | name  | schema                                 |
            | sent  | {"type": "integer", "format": "int64"} |
        Then The metadata for the transaction "callAndResponseInt" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the return schema '{"type": "integer", "format": "int64"}'
        Then The metadata for the transaction "callAndResponseFloat" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the parameters:
            | name  | schema                                 |
            | sent  | {"type": "number", "format": "double"} |
        Then The metadata for the transaction "callAndResponseFloat" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the return schema '{"type": "number", "format": "double"}'

    Scenario: I can use metadata to work out how to run a boolean based transaction
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for the transaction "callAndResponseBool" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the parameters:
            | name  | schema              |
            | sent  | {"type": "boolean"} |
        Then The metadata for the transaction "callAndResponseBool" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the return schema '{"type": "boolean"}'

    Scenario: I can use metadata to work out how to run an array based transaction
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for the transaction "callAndResponseArray" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the parameters:
            | name  | schema                                          |
            | sent  | {"type": "array", "items": {"type": "boolean"}} |
        Then The metadata for the transaction "callAndResponseArray" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the return schema '{"type": "array", "items": {"type":  "boolean"}}'

    Scenario: I can use metadata to work out how to run a basic object based transaction
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for the transaction "callAndResponseBasicAsset" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the parameters:
            | name  | schema                                      |
            | sent  | {"$ref": "#/components/schemas/BasicAsset"} |
        Then The metadata for the transaction "callAndResponseBasicAsset" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the return schema '{"$ref": "#/components/schemas/BasicAsset"}'
        Then The metadata for the component "BasicAsset" in chaincode "advancedtypes" on channel "metadatachannel" should have the properties:
            | property | schema                                 | required |
            | id       | {"type": "string"}                     | true     |
            | value    | {"type": "integer", "format": "int64"} | true     |

    Scenario: I can use metadata to work out how to run a complex object based transaction
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "metadatachannel"
        Then The metadata for the transaction "callAndResponseComplexAsset" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the parameters:
            | name  | schema                                      |
            | sent  | {"$ref": "#/components/schemas/ComplexAsset"} |
        Then The metadata for the transaction "callAndResponseBasicAsset" in contract "AdvancedTypesContract" in chaincode "advancedtypes" on channel "metadatachannel" should contain the return schema '{"$ref": "#/components/schemas/BasicAsset"}'
        Then The metadata for the component "ComplexAsset" in chaincode "advancedtypes" on channel "metadatachannel" should have the properties:
            | property    | schema                                 | required |
            | id          | {"type": "string"}                     | true     |
            | value       | {"type": "integer", "format": "int64"} | true     |
            | description | {"$ref": "Description"}                | true     |
        Then The metadata for the component "Description" in chaincode "advancedtypes" on channel "metadatachannel" should have the properties:
            | property    | schema                                         | required |
            | colour      | {"type": "string"}                             | true     |
            | owners      | {"type": "array", "items": {"type": "string"}} | true     |