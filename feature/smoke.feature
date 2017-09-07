#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

Feature: Smoke Test
    As a user I want to be able to have confidence that the tests are executing correctly

#@doNotDecompose
@smoke
Scenario: Setting of environment variables
    Given the KAFKA_DEFAULT_REPLICATION_FACTOR environment variable is 1
    And the CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT environment variable is 10
    And the CONFIGTX_ORDERER_BATCHTIMEOUT environment variable is 10 minutes
    And I have a bootstrapped fabric network of type kafka
    Then the CONFIGTX_ORDERER_BATCHTIMEOUT environment variable is 10 minutes on node "orderer0.example.com"
    And the CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT environment variable is 10 on node "orderer1.example.com"
    And the KAFKA_DEFAULT_REPLICATION_FACTOR environment variable is 1 on node "kafka1"


@smoke
Scenario: Basic operations
    Given I have a bootstrapped fabric network
    When a user sets up a channel
    And a user deploys chaincode
    Then the chaincode is deployed

@smoke
Scenario: Test access to the fabric protobuf files
    Given I test the access to the generated python protobuf files
    Then there are no errors
