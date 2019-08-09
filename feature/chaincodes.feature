#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


Feature: Chaincodes Testing


@daily
Scenario Outline: FAB-5797: Test chaincode basic ops with cc name in mixedcases chars, for <type> orderer
    Given I have a bootstrapped fabric network of type <type>
    When an admin sets up a channel
    And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "<ccName>"
    When a user queries on the chaincode named "<ccName>" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "<ccName>" with args ["invoke","a","b","10"]
    And I wait "3" seconds
    When a user queries on the chaincode named "<ccName>" with args ["query","a"]
    Then a user receives a success response of 990
Examples:
    | type  |   ccName   |
    | solo  |    mycc    |
    | solo  |    MYCC    |
    | solo  |  MYcc_Test |
    | kafka |    mycc    |
    | kafka |    MYCC    |
    | kafka |  MYcc_Test |

@shimAPI
@daily
Scenario: FAB-4717: FAB-5663, chaincode ex05 to ex02 on different channels
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example05/go/cmd" with args ["init","sum","0"] with name "myex05"
  When an admin sets up a channel named "channel2"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "channel2"]
  Then a user receives a success response of 3000


@daily
Scenario: FAB-4720: FAB-5663, chaincode ex05 to ex02, on same channel, pass bad channnel name
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example05/go/cmd" with args ["init","sum","0"] with name "myex05"
  When an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_b"
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "non-existing-channel"]
  Then a user receives an error response of status:500
  And a user receives an error response of Failed to get policy manager for channel [non-existing-channel]


@daily
Scenario: FAB-4721: FAB-5663, chaincode ex05 to ex02, on diff channels, pass bad channnel name
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example05/go/cmd" with args ["init","sum","0"] with name "myex05"
  When an admin sets up a channel named "channel2"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "non-existing-channel"]
  Then a user receives an error response of status:500
  And a user receives an error response of Failed to get policy manager for channel [non-existing-channel]


@smoke
Scenario: FAB-6211: Test example02 chaincode written using NODE without tls
    Given I have a bootstrapped fabric network of type solo without tls
    When an admin sets up a channel
    And an admin deploys chaincode at path "../../fabric-test/chaincodes/example02/node" with args ["init","a","1000","b","2000"] with name "mycc" with language "NODE"
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "3" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990
    When a user queries on the chaincode named "mycc" with args ["query","b"]
    Then a user receives a success response of 2010


@daily
Scenario Outline: FAB-6211: Test example02 chaincode written using <language> <security>
    Given I have a bootstrapped fabric network of type solo <security>
    When an admin sets up a channel
    And an admin deploys chaincode at path "<path>" with args ["init","a","1000","b","2000"] with name "mycc" with language "<language>"
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "3" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990
    When a user queries on the chaincode named "mycc" with args ["query","b"]
    Then a user receives a success response of 2010
Examples:
    |                              path                              | language | security    |
    #  | github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd | GOLANG   | with tls    |
    | github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd | GOLANG   | without tls |
    |          ../../fabric-test/chaincodes/example02/node           | NODE     | without tls |

