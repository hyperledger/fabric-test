# Copyright IBM Corp. 2017 All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
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
    When a user deploys chaincode
    Then the chaincode is deployed

@smoke
Scenario: Test access to the fabric protobuf files
    Given I test the access to the generated python protobuf files
    Then there are no errors
