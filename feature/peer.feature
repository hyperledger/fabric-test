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

Feature: Peer Service
    As a user I want to be able have channels and chaincodes to execute

#@doNotDecompose
@daily
Scenario Outline: FAB-3505: Test chaincode example02 deploy, invoke, and query
  Given I have a bootstrapped fabric network of type <type>
  And I wait "<waitTime>" seconds
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "mycc"
  And I wait "10" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "mycc" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
  And a user queries on the chaincode named "mycc" with args ["query","a"]
  Then a user receives a success response of 990

  Given "peer0.org2.example.com" is taken down
  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
  And I wait "5" seconds
  Given "peer0.org2.example.com" comes back up
  And I wait "10" seconds
  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org2.example.com"
  Then a user receives a success response of 980 from "peer0.org2.example.com"
  Examples:
    | type  | waitTime |
    | solo  |    5     |
    | kafka |    60    |


@daily
Scenario Outline: FAB-1440: Test basic chaincode deploy, invoke, query
  Given I have a bootstrapped fabric network of type <type>
  And I wait "<waitTime>" seconds
  When a user deploys chaincode
  Then the chaincode is deployed
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 100
  Examples:
    | type  | waitTime |
    | solo  |    5     |
    | kafka |    60    |


@daily
Scenario: FAB-3861: Basic Chaincode Execution (example02)
    Given I have a bootstrapped fabric network
    When a user deploys chaincode
    Then the chaincode is deployed


@skip
Scenario: FAB-3865: Multiple Channels Per Peer
    Given this test needs to be implemented
    When a user gets a chance
    Then the test will run


@daily
Scenario Outline: FAB-3866: Multiple Chaincodes Per Peer
    Given I have a bootstrapped fabric network of type <type>
    And I wait "<waitTime>" seconds
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/eventsender" with args [] with name "eventsender"
    And I wait "5" seconds
    And a user invokes on the chaincode named "eventsender" with args ["invoke", "test_event"]
    And I wait "2" seconds
    And a user queries on the chaincode named "eventsender" with args ["query"]
    Then a user receives a success response of {"NoEvents":"1"}
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init", "a", "1000" , "b", "2000"] with name "example02"
    And I wait "5" seconds
    Then the chaincode is deployed
    When a user invokes on the chaincode named "example02" with args ["invoke", "a", "b", "10"]
    And I wait "2" seconds
    And a user queries on the chaincode named "example02" with args ["query", "a"]
    Then a user receives a success response of 990
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/map" with args ["init"] with name "map"
    And I wait "5" seconds
    And a user invokes on the chaincode named "map" with args ["put", "a", "1000"]
    And I wait "2" seconds
    And a user queries on the chaincode named "map" with args ["get", "a"]
    Then a user receives a success response of 1000
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/marbles02" with args [] with name "marbles"
    And I wait "5" seconds
    And a user invokes on the chaincode named "marbles" with args ["initMarble", "marble1", "blue", "35", "tom"]
    And I wait "2" seconds
    And a user invokes on the chaincode named "marbles" with args ["transferMarble", "marble1", "jerry"]
    And I wait "2" seconds
    And a user queries on the chaincode named "marbles" with args ["readMarble", "marble1"]
    Then a user receives a success response of {"docType":"marble","name":"marble1","color":"blue","size":35,"owner":"jerry"}
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/sleeper" with args ["1"] with name "sleeper"
    And I wait "5" seconds
    And a user invokes on the chaincode named "sleeper" with args ["put", "a", "1000", "1"]
    And I wait "2" seconds
    And a user queries on the chaincode named "sleeper" with args ["get", "a", "1"]
    Then a user receives a success response of 1000
Examples:
    | type  | waitTime |
    | solo  |    5     |
    | kafka |    60    |
