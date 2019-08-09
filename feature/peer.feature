# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


Feature: Peer Service
    As a user I want to be able have channels and chaincodes to execute

#@doNotDecompose
@daily
Scenario Outline: FAB-3505: chaincode example02 deploy invoke query with <type> orderer <database> db <security>
    Given I have a bootstrapped fabric network of type <type> using state-database <database> <security>
    And I use the <interface> interface
    When an admin sets up a channel
    And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "mycc"
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "5" seconds
    And a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990
    When "peer0.org2.example.com" is taken down
    And a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "5" seconds
    And "peer0.org2.example.com" comes back up
    And I wait "10" seconds
    And a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org2.example.com"
    Then a user receives a success response of 980 from "peer0.org2.example.com"
Examples:
    | type  | database |   security  |  interface |
#   | solo  | leveldb  | without tls | NodeJS SDK |
#   | kafka | couchdb  |   with tls  | NodeJS SDK |
#   | solo  | couchdb  | without tls |     CLI    |
#   | kafka | leveldb  | without tls |     CLI    |
    | solo  | leveldb  | without tls |     CLI    |
    | kafka | couchdb  |   with tls  | NodeJS SDK |

Scenario: FAB-6333: A peer with chaincode container disconnects, comes back up OK
  Given I have a bootstrapped fabric network of type solo
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "mycc"
  And I wait "10" seconds

  # do 1 set of invoke-query on peer1.org1
  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"] on "peer1.org1.example.com"
  And I wait "5" seconds
  And a user queries on the chaincode named "mycc" with args ["query","a"] on "peer1.org1.example.com"
  Then a user receives a success response of 990 from "peer1.org1.example.com"

  ## Now disconnect a peer
  When "peer1.org1.example.com" is taken down by doing a disconnect
  And I wait "15" seconds

  # do 2 set of invoke-query on peer0.org1
  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","20"] on "peer0.org1.example.com"
  And I wait "5" seconds
  And a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org1.example.com"
  Then a user receives a success response of 970 from "peer0.org1.example.com"

  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","30"] on "peer0.org1.example.com"
  And I wait "5" seconds
  And a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org1.example.com"
  Then a user receives a success response of 940 from "peer0.org1.example.com"

  #bring back up the disconnected peer
  When "peer1.org1.example.com" comes back up by doing a connect
  And I wait "30" seconds

  And a user queries on the chaincode named "mycc" with args ["query","a"] on "peer1.org1.example.com"
  Then a user receives a success response of 940 from "peer1.org1.example.com"

  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","40"] on "peer1.org1.example.com"
  And I wait "5" seconds
  And a user queries on the chaincode named "mycc" with args ["query","a"] on "peer1.org1.example.com"
  Then a user receives a success response of 900 from "peer1.org1.example.com"


##@daily
Scenario: FAB-8380: Test MSP Identity - Malicious Peer
  Given the CORE_PEER_TLS_CLIENTAUTHREQUIRED environment variable is "true"
  And the ORDERER_TLS_CLIENTAUTHREQUIRED environment variable is "true"
  Given the peer "peer1.org2.example.com" is setup to use a client identity
  And I have a bootstrapped fabric network of type kafka with tls with organizational units enabled on all nodes
  When an admin sets up a channel

  And an admin deploys chaincode with args ["init","a","1000","b","2000"] with policy "OR ('org1.example.com.peer','org2.example.com.peer')"
  When a user queries on the chaincode named "mycc" with args ["query","a"]
  Then a user receives a success response of 1000

  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"] on "peer1.org2.example.com"
  Then the logs on peer1.org2.example.com contains "VSCCValidateTx for transaction txId " within 10 seconds
  And the logs on peer1.org2.example.com contains "returned error: validation of endorsement policy for chaincode mycc in tx 2:0 failed: signature set did not satisfy policy" within 10 seconds
  And I wait "2" seconds
  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org1.example.com"
  Then a user receives a success response of 1000


##@daily
Scenario: FAB-8381: Test MSP Identity - Malicious Peer (Clients set as writers in policy)
  Given the CORE_PEER_TLS_CLIENTAUTHREQUIRED environment variable is "true"
  And the ORDERER_TLS_CLIENTAUTHREQUIRED environment variable is "true"
  And I have a bootstrapped fabric network of type kafka with tls with organizational units enabled on all nodes
  When an admin sets up a channel
  And an admin deploys chaincode with args ["init","a","1000","b","2000"] with policy "OR ('org1.example.com.client','org2.example.com.client')"

  When the admin changes the policy to "OR ('org1.example.com.client','org2.example.com.client')"
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org2.example.com"
  Then a user receives a success response of 1000 from "peer0.org2.example.com"
  When a user queries on the chaincode named "mycc" with args ["query","a"]
  Then a user receives a success response of 1000

  When a user using a peer identity invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
  Then the logs on peer0.org2.example.com contains "VSCCValidateTx for transaction txId " within 10 seconds
  And the logs on peer0.org2.example.com contains "returned error: validation of endorsement policy for chaincode mycc in tx 2:0 failed: signature set did not satisfy policy" within 10 seconds
  And I wait "2" seconds

  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org1.example.com"
  Then a user receives a success response of 1000


##@daily
Scenario: FAB-8382: Test MSP Identity with inconsistencies
  Given the CORE_PEER_TLS_CLIENTAUTHREQUIRED environment variable is "true"
  And the ORDERER_TLS_CLIENTAUTHREQUIRED environment variable is "true"
  And I have a bootstrapped fabric network of type kafka with tls with organizational units enabled on all Org1ExampleCom nodes
  When an admin sets up a channel
  And an admin deploys chaincode with args ["init","a","1000","b","2000"] with policy "OR ('org1.example.com.peer','org2.example.com.peer')"
  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org1.example.com"
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org2.example.com"
  Then a user receives a success response of 1000 from "peer0.org2.example.com"

  When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"] on "peer0.org2.example.com"
  Then the logs on peer0.org2.example.com contains "VSCCValidateTx for transaction txId " within 10 seconds
  And the logs on peer0.org2.example.com contains "returned error: validation of endorsement policy for chaincode mycc in tx 2:0 failed: signature set did not satisfy policy" within 10 seconds
  And I wait "2" seconds
  When a user queries on the chaincode named "mycc" with args ["query","a"] on "peer0.org1.example.com"
  Then a user receives a success response of 1000

