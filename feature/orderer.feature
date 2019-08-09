#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

Feature: Orderer Service
    As a user I want to be able to have my transactions ordered correctly

@smoke
Scenario: FAB-3852: Message Payloads Less than 1MB, for kafka-based orderer using the NodeJS SDK interface
    Given I have a bootstrapped fabric network of type kafka using state-database couchdb with tls
    And I use the NodeJS SDK interface
    # Following lines are equivalent to "When an admin sets up a channel"
    When an admin creates a channel
    When an admin fetches genesis information using peer "peer0.org1.example.com"
    When an admin makes all peers join the channel
    # Following lines are equivalent to "When an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args [""]"
    When an admin installs chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args ["init"] on all peers
    When an admin instantiates the chaincode on "peer0.org1.example.com"

    # 1K
    And a user invokes on the chaincode named "mycc" with random args ["put","a","{random_value}"] of length 1024
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","a"]
    Then a user receives a response containing a value of length 1024
    And a user receives a response with the random value
    # 64K
    When a user invokes on the chaincode named "mycc" with random args ["put","b","{random_value}"] of length 65536
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","b"]
    Then a user receives a response containing a value of length 65536
    #
    When a user invokes on the chaincode named "mycc" with random args ["put","d","{random_value}"] of length 100000
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","d"]
    Then a user receives a response containing a value of length 100000
    #
    When a user invokes on the chaincode named "mycc" with random args ["put","g","{random_value}"] of length 130610
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","g"]
    Then a user receives a response containing a value of length 130610
    And a user receives a response with the random value


@daily
Scenario Outline: FAB-3852: Message Payloads Less than 1MB, for <type> orderer using the <interface> interface
    Given I have a bootstrapped fabric network of type <type>
    And I use the <interface> interface
    # Following lines are equivaent to "When an admin sets up a channel"
    When an admin creates a channel
    When an admin fetches genesis information using peer "peer0.org1.example.com"
    When an admin makes all peers join the channel
    # Following lines are equivalent to "When an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args [""]"
    When an admin installs chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args [""] on all peers
    When an admin instantiates the chaincode on "peer0.org1.example.com"

    # 1K
    And a user invokes on the chaincode named "mycc" with random args ["put","a","{random_value}"] of length 1024
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","a"]
    Then a user receives a response containing a value of length 1024
    And a user receives a response with the random value
    # 64K
    When a user invokes on the chaincode named "mycc" with random args ["put","b","{random_value}"] of length 65536
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","b"]
    Then a user receives a response containing a value of length 65536
    #
    When a user invokes on the chaincode named "mycc" with random args ["put","d","{random_value}"] of length 100000
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","d"]
    Then a user receives a response containing a value of length 100000
    #
    When a user invokes on the chaincode named "mycc" with random args ["put","g","{random_value}"] of length 130610
    And I wait "3" seconds
    And a user queries on the chaincode named "mycc" with args ["get","g"]
    Then a user receives a response containing a value of length 130610
    And a user receives a response with the random value
Examples:
    | type  |  interface |
    | solo  |     CLI    |
#   | kafka |     CLI    |
#   | solo  | NodeJS SDK |
    | kafka | NodeJS SDK |


@daily
Scenario Outline: FAB-3851: Message Payloads of size <comment>, for <type> orderer
    Given I have a bootstrapped fabric network of type <type> using state-database couchdb
    And I use the NodeJS SDK interface
    When an admin sets up a channel
    And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args [""]

    When a user invokes on the chaincode named "mycc" with random args ["put","g","{random_value}"] of length <size>
    And I wait "7" seconds
    And a user queries on the chaincode named "mycc" with args ["get","g"]
    Then a user receives a response containing a value of length <size>
    And a user receives a response with the random value

    When a user invokes on the chaincode named "mycc" with random args ["put","g","{random_value}"] of length <size>
    And I wait "7" seconds
    And a user queries on the chaincode named "mycc" with args ["get","g"]
    Then a user receives a response containing a value of length <size>
    And a user receives a response with the random value
Examples:
    | type  |  size   |         comment              |
    | solo  | 1048576 |           1MB                |
    | solo  | 2097152 |           2MB                |
    | solo  | 4194304 |           4MB                |
    | kafka |  125000 | 125KB (with default msg size) |
    | kafka |  320000 | 320KB (with default msg size) |
    | kafka |  490000 | 490KB (with default msg size) |
    #| kafka | 1000012 |   1MB   |


@daily
Scenario Outline: FAB-3859: Kafka Network with Large Message Size <comment> with Configuration Tweaks
  Given the ORDERER_ABSOLUTEMAXBYTES environment variable is <absoluteMaxBytes>
  And the ORDERER_PREFERREDMAXBYTES environment variable is <preferredMaxBytes>
  And the KAFKA_MESSAGE_MAX_BYTES environment variable is <messageMaxBytes>
  And the KAFKA_REPLICA_FETCH_MAX_BYTES environment variable is <replicaFetchMaxBytes>
  And the KAFKA_REPLICA_FETCH_RESPONSE_MAX_BYTES environment variable is <replicaFetchResponseMaxBytes>
  Given I have a bootstrapped fabric network of type kafka
  And I use the NodeJS SDK interface
  When an admin sets up a channel named "configsz"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args ["init"] with name "mapIt" on channel "configsz"

  When a user invokes on the channel "configsz" using chaincode named "mapIt" with random args ["put","g","{random_value}"] of length <size>
  And I wait "10" seconds
  And a user queries on the channel "configsz" using chaincode named "mapIt" for the random key with args ["get","g"] on "peer0.org1.example.com"
  Then a user receives a response containing a value of length <size>
  And a user receives a response with the random value
Examples:
    | absoluteMaxBytes | preferredMaxBytes | messageMaxBytes | replicaFetchMaxBytes | replicaFetchResponseMaxBytes |   size   | comment |
    |     20 MB        |      2 MB         |     4 MB        |        2 MB          |           20 MB              |  1048576 |   1MB   |
    |      1 MB        |      1 MB         |     4 MB        |        2 MB          |           10 MB              |  1048576 |   1MB   |
    |      1 MB        |      1 MB         |     4 MB        |       1.5 MB         |           10 MB              |  1048576 |   1MB   |
    |      4 MB        |      4 MB         |     4 MB        |        4 MB          |           10 MB              |  1048576 |   1MB   |
    |      8 MB        |      8 MB         |     8 MB        |        8 MB          |           10 MB              |  2097152 |   2MB   |
    |     16 MB        |     16 MB         |    16 MB        |       16 MB          |           20 MB              |  4194304 |   4MB   |
    |     11 MB        |      2 MB         |    22 MB        |       11 MB          |           20 MB              | 10485760 |   10MB  |

@daily
Scenario Outline: FAB-3857: <count> key/value pairs in Payloads of size <size>
    Given I have a bootstrapped fabric network of type kafka using state-database couchdb
    And I use the NodeJS SDK interface
    When an admin sets up a channel
    When an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/mapkeys/go" with args [""]

    When a user invokes on the chaincode named "mycc" with args ["put","c","3F","d","76D"]
    When I wait "5" seconds
    And a user queries on the chaincode named "mycc" with args ["get","c"]
    Then a user receives a success response of 3F
    When a user queries on the chaincode named "mycc" with args ["get","d"]
    Then a user receives a success response of 76D

    When a user invokes args with <count> random key/values of length <size> on the chaincode named "mycc"
    And I wait "5" seconds
    And a user queries on the chaincode named "mycc" with dynamic args ["get","{last_key}"] on "peer0.org1.example.com"
    Then a user receives a response containing a value of length <size>
    And a user receives a response with the random value
Examples:
    |  size  |  count  |                  comment                         |
    #|  2048  |   20    | caused IOError: resource temporarily unavailable |
    |   512  |   10    |                                                  |
    #|  256   |  1024   | caused IOError: resource temporarily unavailable |
    |   64   |   256   |                                                  |


@daily
Scenario: FAB-4686: Test taking down all kafka brokers and bringing back last 3
    Given I have a bootstrapped fabric network of type kafka
    When an admin sets up a channel
    And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "mycc"
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    And a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990

    When "kafka0" is taken down
    And I wait "5" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    When a user queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 980

    When "kafka1" is taken down
    And "kafka2" is taken down
    And "kafka3" is taken down
    And I wait "5" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    And a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 980
    And I wait "5" seconds

    When "kafka3" comes back up
    And I wait "60" seconds
    And "kafka2" comes back up
    And I wait "60" seconds
    And "kafka1" comes back up
    And I wait "90" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 970
