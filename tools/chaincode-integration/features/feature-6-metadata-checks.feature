# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

@single-org @metadata-checks
Feature: MetadataChecks

    Background: I can install and instantiate a simple chaincode
      Given Infrastructure provider is "TestNetwork"
        And Infrastructure created for network "oneorg-v2x" with channel "simplechannel"
        And All peers on channel "simplechannel" have deployed the chaincode "advancedtypes"
        And All peers on channel "simplechannel" have deployed the chaincode "simple"
        And Organisation "Org1" has registered the identity "User1"
        And Acting as Organization "Org1" user "User1"
        And Connecting via SDK "defaultgateway"

    Scenario: The metadata I retrieve meets the schema
        Given I have retrieved the metadata for chaincode "advancedtypes" on channel "simplechannel"
        Then The metadata for the chaincode must meet the schema
         And The metadata should contain the contracts:
            | AdvancedTypesContract |
         And The metadata for contract "AdvancedTypesContract" should contain the transactions:
             | getInt | getFloat | getBool | getArray | getBasicAsset | getComplexAsset | callAndResponseInt | callAndResponseFloat | callAndResponseBool | callAndResponseArray | callAndResponseBasicAsset | callAndResponseComplexAsset |
        And The metadata for the transaction "callAndResponseInt" in contract "AdvancedTypesContract" should contain the parameters:
            | name  | schema                                 |
            | sent  | {"type": "integer", "format": "int64"} |
        And The metadata for the transaction "callAndResponseInt" in contract "AdvancedTypesContract" should contain the return schema '{"type": "integer", "format": "int64"}'
        And The metadata for the transaction "callAndResponseFloat" in contract "AdvancedTypesContract" should contain the parameters:
            | name  | schema                                 |
            | sent  |  {"type":"number","format":"double"}   |
        And The metadata for the transaction "callAndResponseFloat" in contract "AdvancedTypesContract" should contain the return schema ' {"type":"number","format":"double"}'
        And The metadata for the transaction "callAndResponseBool" in contract "AdvancedTypesContract" should contain the parameters:
            | name  | schema              |
            | sent  | {"type": "boolean"} |
        And The metadata for the transaction "callAndResponseBool" in contract "AdvancedTypesContract" should contain the return schema '{"type": "boolean"}'
        And The metadata for the transaction "callAndResponseArray" in contract "AdvancedTypesContract" should contain the parameters:
            | name  | schema                                          |
            | sent  | {"type": "array", "items": {"type": "string"}} |
        And The metadata for the transaction "callAndResponseArray" in contract "AdvancedTypesContract" should contain the return schema '{"type": "array", "items": {"type":  "string"}}'
        And The metadata for the transaction "callAndResponseBasicAsset" in contract "AdvancedTypesContract" should contain the parameters:
            | name  | schema                                      |
            | sent  | {"$ref": "#/components/schemas/BasicAsset"} |
        And The metadata for the transaction "callAndResponseBasicAsset" in contract "AdvancedTypesContract" should contain the return schema '{"$ref": "#/components/schemas/BasicAsset"}'
        And The metadata for the component "BasicAsset" should have the properties:
            | property | schema                                 | required |
            | id       | {"type": "string"}                     | true     |
            | value    | {"type": "integer", "format": "int64"} | true     |      
        And The metadata for the transaction "callAndResponseComplexAsset" in contract "AdvancedTypesContract" should contain the parameters:
            | name  | schema                                      |
            | sent  | {"$ref": "#/components/schemas/ComplexAsset"} |
        And The metadata for the component "ComplexAsset" should have the properties:
            | property    | schema                                 | required |
            | id          | {"type": "string"}                     | true     |
            | value       |  {"type":"integer","format":"int64"}   | true     |
            | description | {"$ref": "Description"}                | true     |
        And  The metadata for the component "Description" should have the properties:
            | property    | schema                                         | required |
            | colour      | {"type": "string"}                             | true     |
            | owners      | {"type": "array", "items": {"type": "string"}} | true     |

 
