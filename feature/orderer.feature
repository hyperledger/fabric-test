#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

Feature: Orderer Service
    As a user I want to be able to have my transactions ordered correctly

#@doNotDecompose
@skip
Scenario: FAB-1335: Resilient Kafka Orderer and Brokers
    Given the KAFKA_DEFAULT_REPLICATION_FACTOR environment variable is 1
    And the CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT environment variable is 10
    And the CONFIGTX_ORDERER_BATCHTIMEOUT environment variable is 10 minutes
    And I have a bootstrapped fabric network of type kafka
    When 10 unique messages are broadcasted
    Then I get 10 successful broadcast responses
    When the topic partition leader is stopped
    And 10 unique messages are broadcasted
    Then I get 10 successful broadcast responses
    And all 20 messages are delivered in 1 block

@skip
Scenario: FAB-1306: Adding a new Kafka Broker
    Given a kafka cluster
    And an orderer connected to the kafka cluster
    When a new organization NewOrg certificate is added
    Then the NewOrg is able to connect to the kafka cluster

@skip
Scenario: FAB-1306: Multiple organizations in a kafka cluster, remove 1
    Given a certificate from Org1 is added to the kafka orderer network
    And a certificate from Org2 is added to the kafka orderer network
    And an orderer connected to the kafka cluster
    When authorization for Org2 is removed from the kafka cluster
    Then the Org2 cannot connect to the kafka cluster

@skip
Scenario: FAB-1306: Multiple organizations in a cluster - remove all, reinstate 1.
    Given a certificate from Org1 is added to the kafka orderer network
    And a certificate from Org2 is added to the kafka orderer network
    And a certificate from Org3 is added to the kafka orderer network
    And an orderer connected to the kafka cluster
    When authorization for Org2 is removed from the kafka cluster
    Then the Org2 cannot connect to the kafka cluster
    And the orderer functions successfully
    When authorization for Org1 is removed from the kafka cluster
    Then the Org1 cannot connect to the kafka cluster
    And the orderer functions successfully
    When authorization for Org3 is removed from the kafka cluster
    Then the Org3 cannot connect to the kafka cluster
    And the zookeeper notifies the orderer of the disconnect
    And the orderer stops sending messages to the cluster
    When authorization for Org1 is added to the kafka cluster
    And I wait "15" seconds
    Then the Org1 is able to connect to the kafka cluster
    And the orderer functions successfully

@daily
Scenario: Message Payloads Less than 1MB
    # This test has limitations when using the CLI interface to execute the commands due to cli
    # argument size limits. You can only have command line arguments of a certain size.
    # Larger payload sizes can be tested and should pass when using SDK interfaces that should
    # not have these limitations.
    Given I have a bootstrapped fabric network
    When a user sets up a channel
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/map" with args [""]
    And I wait "30" seconds
    # 1K
    And a user invokes on the chaincode named "mycc" with random args ["put","a","{random_value}"] of length 1024
    And I wait "10" seconds
    And a user queries on the chaincode named "mycc" with args ["get","a"]
    Then a user receives a response containing a value of length 1024
    And a user receives a response with the random value
    # 64K
    When a user invokes on the chaincode named "mycc" with random args ["put","b","{random_value}"] of length 65536
    And I wait "5" seconds
    And a user queries on the chaincode named "mycc" with args ["get","b"]
    Then a user receives a response containing a value of length 65536
    #
    When a user invokes on the chaincode named "mycc" with random args ["put","d","{random_value}"] of length 100000
    And I wait "5" seconds
    And a user queries on the chaincode named "mycc" with args ["get","d"]
    Then a user receives a response containing a value of length 100000
    #
    When a user invokes on the chaincode named "mycc" with random args ["put","g","{random_value}"] of length 130610
    And I wait "5" seconds
    And a user queries on the chaincode named "mycc" with args ["get","g"]
    Then a user receives a response containing a value of length 130610
    And a user receives a response with the random value


@skip
Scenario: FAB-3851: Message Payloads More than 1MB
    Given I have a bootstrapped fabric network
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/map" with args [""]
    And I wait "30" seconds
#    When a user invokes on the chaincode named "mycc" with random args ["put","g","{random_value}"] of length 130734
#    And I wait "5" seconds
#    And a user queries on the chaincode named "mycc" with args ["get","g"]
#    Then a user receives a response containing a value of length 130734
#    And a user receives a response with the random value
#    #
#    When a user invokes on the chaincode named "mycc" with random args ["put","h","{random_value}"] of length 1048576
#    And I wait "30" seconds
#    And a user queries on the chaincode named "mycc" with args ["get","h"]
#    Then a user receives response with length value
#    #
#    When a user invokes on the chaincode named "mycc" with random args ["put","i","{random_value}"] of length 2097152
#    And I wait "30" seconds
#    And a user queries on the chaincode named "mycc" with args ["get","i"]
#    Then a user receives response with length value
#    #
#    When a user invokes on the chaincode named "mycc" with random args ["put","j","{random_value}"] of length 4194304
#    And I wait "30" seconds
#    And a user queries on the chaincode named "mycc" with args ["get","j"]
#    Then a user receives response with length value

@daily
#@doNotDecompose
Scenario: FAB-4686: Test taking down all kafka brokers and bringing back last 3
    Given I have a bootstrapped fabric network of type kafka
    And I wait "60" seconds
    When a user sets up a channel
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "mycc"
    And I wait "30" seconds
    Then the chaincode is deployed
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
    And "kafka2" comes back up
    And "kafka1" comes back up
    And I wait "240" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 970

@skip
Scenario Outline: FAB-3937: Message Broadcast
    Given a bootstrapped orderer network of type <type>
    When a message is broadcasted
    Then I get a successful broadcast response
Examples:
    | type  |
    | solo  |
    | kafka |

@skip
Scenario Outline: FAB-3938: Broadcasted message delivered.
    Given a bootstrapped orderer network of type <type>
    When 1 unique messages are broadcasted
    Then all 1 messages are delivered within 10 seconds
Examples:
    | type  |
    | solo  |
    | kafka |


@daily
# This test will be skipped until it is determined why this test fails intermittently
Scenario: FAB-4770: Test taking down all (3) kafka brokers in the RF set, and bringing them back in LIFO order
    # By default, the number of kafka brokers in the RF set is 3(KAFKA_DEFAULT_REPLICATION_FACTOR),
    # and the min ISR is 2(KAFKA_MIN_INSYNC_REPLICAS)
    Given I have a bootstrapped fabric network of type kafka
    And I wait "60" seconds
    When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "mycc"
    And I wait "10" seconds
    Then the chaincode is deployed
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "5" seconds
    And a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990

    When the topic partition leader is stopped
    And I wait "60" seconds
    #new leader is elected
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "5" seconds
    When a user queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 980

    When the topic partition leader is stopped
    And I wait "60" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    Then a user receives an error response of SERVICE_UNAVAILABLE
    And I wait "5" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 980

    When the topic partition leader is stopped
    And I wait "60" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    Then a user receives an error response of SERVICE_UNAVAILABLE
    And I wait "5" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 980

    And I wait "5" seconds
    # Stopping Queue: Last In First Out
    When a former topic partition leader is restarted
    And I wait "60" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 980

    When a former topic partition leader is restarted
    And I wait "60" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 970

    When a former topic partition leader is restarted
    And I wait "60" seconds
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "10" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 960

@daily
Scenario Outline: FAB-4808: Orderer_BatchTimeOut is honored
    Given the CONFIGTX_ORDERER_BATCHTIMEOUT environment variable is <envValue>
    And I have a bootstrapped fabric network of type <type>
    And I wait "<waitTime>" seconds
    When a user sets up a channel
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "mycc"
    And I wait "20" seconds
    Then the chaincode is deployed
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "5" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of <firstQuery>
    And I wait "8" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of <lastQuery>
Examples:
    | type  | waitTime |  envValue  | firstQuery | lastQuery |
    | solo  |    20    | 2 seconds  |    990     |   990     |
    | kafka |    30    | 2 seconds  |    990     |   990     |
    | solo  |    20    | 10 seconds |    1000    |   990     |
    | kafka |    30    | 10 seconds |    1000    |   990     |
