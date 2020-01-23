# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@single-org @transaction-hooks
Feature: TransactionHooks
    
    Scenario: I can install and instantiate a transaction hooks chaincode
        Given Channel "hookschannel" has been created using the profile "channel"
        And All peers on channel "hookschannel" have installed the chaincode "transactionhooks"
        And Organisation "Org1" has registered the identity "user1"
        And Organisation "Org1" has instantiated the chaincode "transactionhooks" on channel "hookschannel"

    Scenario: Before transaction fails
        Given Organisation "Org1" has created transaction "writeBeforeValue" for chaincode "transactionhooks" on channel "hookschannel" as "user1"
        And Transaction "writeBeforeValue" has transient data:
            | fail         | BEFORE      |
        Then Expecting the error "Before transaction failed" transaction "writeBeforeValue" is evaluated

    Scenario: Named transaction fails
        Given Organisation "Org1" has created transaction "writeBeforeValue" for chaincode "transactionhooks" on channel "hookschannel" as "user1"
        And Transaction "writeBeforeValue" has transient data:
            | before_key   | KEY_1   |
            | before_value | VALUE_1 |
            | fail         | NAMED      |
        Then Expecting the error "Named transaction failed" transaction "writeBeforeValue" is evaluated

    Scenario: After transaction fails
        Given Organisation "Org1" has created transaction "writeBeforeValue" for chaincode "transactionhooks" on channel "hookschannel" as "user1"
        And Transaction "writeBeforeValue" has transient data:
            | before_key   | KEY_1   |
            | before_value | VALUE_1 |
            | fail         | AFTER      |
        Then Expecting the error "After transaction failed" transaction "writeBeforeValue" is evaluated

    Scenario: Value set on context in before used in named function
        Given Organisation "Org1" has created transaction "writeBeforeValue" for chaincode "transactionhooks" on channel "hookschannel" as "user1"
        And Transaction "writeBeforeValue" has transient data:
            | before_key   | KEY_1   |
            | before_value | VALUE_1 |
        When Transaction "writeBeforeValue" is submitted
        Then The world state for the chaincode "transactionhooks" on channel "hookschannel" should contain "VALUE_1" for key "KEY_1"

    Scenario: Value returned by named function written by after function
        Given Organisation "Org1" has created transaction "passAfterValue" for chaincode "transactionhooks" on channel "hookschannel" as "user1"
        And Transaction "passAfterValue" has transient data:
            | before_key   | KEY_1   |
            | before_value | VALUE_1 |
            | after_key    | KEY_2   |
        When Transaction "passAfterValue" is submitted with args:
            | VALUE_2 |
        Then The world state for the chaincode "transactionhooks" on channel "hookschannel" should contain "VALUE_2" for key "KEY_2"

