# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


Feature: Peer Service
    As a user I want to be able have channels and chaincodes to execute

#@doNotDecompose
@daily
Scenario Outline: FAB-3505: Test chaincode example02 deploy, invoke, and query
  Given I have a bootstrapped fabric network of type <type>
  And I wait "<waitTime>" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "mycc"
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
  When a user sets up a channel
  And a user deploys chaincode
  Then the chaincode is deployed
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 100
  Examples:
    | type  | waitTime |
    | solo  |    5     |
    | kafka |    60    |


@daily
@smoke
Scenario Outline: FAB-3861: Basic Chaincode Execution - <type> orderer type, using <database>, <security>
    Given I have a bootstrapped fabric network of type <type> using state-database <database> <security>
    And I wait "<waitTime>" seconds
    When a user sets up a channel
    And a user deploys chaincode
    Then the chaincode is deployed
Examples:
    | type  | database | waitTime |  security   |
    | solo  | leveldb  |    5     |  with tls   |
    | solo  | leveldb  |    5     | without tls |
    | solo  | couchdb  |    5     |  with tls   |
    | solo  | couchdb  |    5     | without tls |
    | kafka | leveldb  |    60    |  with tls   |
    | kafka | leveldb  |    60    | without tls |
    | kafka | couchdb  |    60    |  with tls   |
    | kafka | couchdb  |    60    | without tls |


@daily
Scenario Outline: FAB-3865: Multiple Channels Per Peer
    Given I have a bootstrapped fabric network of type <type>
    And I wait "<waitTime>" seconds
    When a user sets up a channel named "chn1"
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init", "a", "1000" , "b", "2000"] with name "cc1" on channel "chn1"
    And I wait "5" seconds
    Then the chaincode is deployed
    When a user sets up a channel named "chn2"
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/map" with args ["init"] with name "cc2" on channel "chn2"
    And I wait "5" seconds
    And a user invokes on the channel "chn2" using chaincode named "cc2" with args ["put", "a", "1000"]
    And I wait "1" seconds
    And a user queries on the channel "chn2" using chaincode named "cc2" with args ["get", "a"]
    Then a user receives a success response of 1000
    When a user invokes on the channel "chn2" using chaincode named "cc2" with args ["put", "b", "2000"]
    And I wait "1" seconds
    And a user queries on the channel "chn2" using chaincode named "cc2" with args ["get", "b"]
    Then a user receives a success response of 2000
    When a user invokes on the channel "chn1" using chaincode named "cc1" with args ["invoke", "a", "b", "10"]
    And I wait "1" seconds
    And a user queries on the channel "chn1" using chaincode named "cc1" with args ["query", "a"]
    Then a user receives a success response of 990
    When a user queries on the channel "chn2" using chaincode named "cc2" with args ["get", "a"]
    Then a user receives a success response of 1000
Examples:
    | type  | waitTime |
    | solo  |    5     |
    | kafka |    60    |


@daily
Scenario Outline: FAB-3866: Multiple Chaincodes Per Peer
    Given I have a bootstrapped fabric network of type <type>
    And I wait "<waitTime>" seconds
    When a user sets up a channel
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/eventsender" with args [] with name "eventsender"
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
