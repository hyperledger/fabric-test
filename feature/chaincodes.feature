#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

Feature: FAB-5384 Chaincode Testing: As a user I want to be able verify that I can execute different chaincodes

@daily
Scenario Outline: FAB-5797: Test chaincode fabric/examples/chaincode_example02 deploy, invoke, and query with chaincode install name in all lowercase/uppercase/mixedcase chars, for <type> orderer
    Given I have a bootstrapped fabric network of type <type>
    When a user sets up a channel
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "<ccName>"
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

@daily
Scenario: FAB-4703: FAB-5663, Test chaincode calling chaincode - fabric/examples/chaincode_example04
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example04" with args ["init","Event","1"] with name "myex04"
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_a" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_a" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex04" with args ["query","Event", "myex02_a", "a", "channel2"]
  Then a user receives a success response of 1000

@daily
Scenario: FAB-4717: FAB-5663, chaincode-to-chaincode testing passing in channel name as a third argument to chaincode_ex05 when cc_05 and cc_02 are on different channels
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "channel2"]
  Then a user receives a success response of 3000

@daily
Scenario: FAB-4718: FAB-5663, chaincode-to-chaincode testing passing an empty string for channel_name when cc_05 and cc_02 are on the same channel
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b"
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", ""]
  Then a user receives a success response of 3000

@daily
Scenario: FAB-4720: FAB-5663, Test chaincode calling chaincode -ve test case passing an incorrect or non-existing channnel name when cc_ex02 and cc_ex05 installed on same channels
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b"
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "channel3"]
  Then a user receives an error response of status: 400

@daily
Scenario: FAB-4721: FAB-5663, Test chaincode calling chaincode -ve testcase passing an incorrect ot non-existing string for channelname when cc_ex02 and cc_ex05 installed on different channels
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "channel3"]
  Then a user receives a success response of status: 400


@daily
Scenario: FAB-4722: FAB-5663, Test chaincode calling chaincode -ve testcase passing an empty string for channelname when cc_ex02 and cc_ex05 installed on different channels
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", ""]
  Then a user receives a success response of status: 400

@daily
Scenario: FAB-5384: FAB-5663, Test chaincode calling chaincode with two args cc_ex02 and cc_ex05 installed on same channels
  Given I have a bootstrapped fabric network of type kafka
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b"
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum"]
  Then a user receives a success response of 3000

@daily
Scenario Outline: FAB-5789: Test chaincode marbles02 initMarble/readMarble/transferMarble/transferMarblesBasedOnColor in <language> language and <database> database for <type> orderer

    Given I have a bootstrapped fabric network of type <type> using state-database <database>
    When a user sets up a channel
    And a user deploys chaincode at path "<path>" with args [""] with language "<language>"

    When a user invokes on the chaincode with args ["initMarble","marble1","red","35","tom"]
    And I wait "5" seconds
    When a user queries on the chaincode with args ["readMarble","marble1"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble1"
    And a user receives a response containing "color":"red"
    And a user receives a response containing "size":35
    And a user receives a response containing "owner":"tom"

    When a user invokes on the chaincode with args ["initMarble","marble2","blue","55","jerry"]
    And I wait "5" seconds
    When a user queries on the chaincode with args ["readMarble","marble2"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble2"
    And a user receives a response containing "color":"blue"
    And a user receives a response containing "size":55
    And a user receives a response containing "owner":"jerry"

    #Test transferMarble
    When a user invokes on the chaincode with args ["transferMarble","marble1","jerry"]
    And I wait "5" seconds
    When a user queries on the chaincode with args ["readMarble","marble1"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble1"
    And a user receives a response containing "color":"red"
    And a user receives a response containing "size":35
    And a user receives a response containing "owner":"jerry"

    # Begin creating marbles to test transferMarblesBasedOnColor
    When a user invokes on the chaincode with args ["initMarble","marble100","red","5","cassey"]
    And I wait "5" seconds

    When a user invokes on the chaincode with args ["initMarble","marble101","blue","6","cassey"]
    And I wait "5" seconds

    When a user invokes on the chaincode with args ["initMarble","marble200","purple","5","ram"]
    And I wait "5" seconds

    When a user invokes on the chaincode with args ["initMarble","marble201","blue","6","ram"]
    And I wait "5" seconds

    When a user invokes on the chaincode with args ["transferMarblesBasedOnColor","blue","jerry"]
    And I wait "5" seconds
    When a user queries on the chaincode with args ["readMarble","marble100"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble100"
    And a user receives a response containing "color":"red"
    And a user receives a response containing "size":5
    And a user receives a response containing "owner":"cassey"

    When a user queries on the chaincode with args ["readMarble","marble101"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble101"
    And a user receives a response containing "color":"blue"
    And a user receives a response containing "size":6
    And a user receives a response containing "owner":"jerry"

    When a user queries on the chaincode with args ["readMarble","marble200"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble200"
    And a user receives a response containing "color":"purple"
    And a user receives a response containing "size":5
    And a user receives a response containing "owner":"ram"

    When a user queries on the chaincode with args ["readMarble","marble201"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble201"
    And a user receives a response containing "color":"blue"
    And a user receives a response containing "size":6
    And a user receives a response containing "owner":"jerry"
Examples:
    | type  |                       path                                      | language | database |
    | solo  |   github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |  leveldb |
    | kafka |   github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |  leveldb |
    | solo  |        ../../fabric-test/chaincodes/marbles/node                | NODE     |  leveldb |
    | kafka |        ../../fabric-test/chaincodes/marbles/node                | NODE     |  leveldb |
    | solo  |   github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |  couchdb |
    | kafka |   github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |  couchdb |
    | solo  |        ../../fabric-test/chaincodes/marbles/node                | NODE     |  couchdb |
    | kafka |        ../../fabric-test/chaincodes/marbles/node                | NODE     |  couchdb |


@daily
Scenario Outline: FAB-5790: Test chaincode marbles02 initMarble/readMarble/deleteMarble/getHistoryForMarble/getMarblesByRange in <language> language for <type> orderer
  Given I have a bootstrapped fabric network of type <type>
  When a user sets up a channel
  And a user deploys chaincode at path "<path>" with args [""] with name "mycc" with language "<language>"

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble1","red","35","tom"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a success response of {"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble201","blue","6","ram"]
  And I wait "3" seconds
  # Test getHistoryForMarble
  When a user queries on the chaincode named "mycc" with args ["getHistoryForMarble","marble1"]
  Then a user receives a response containing "TxId"
  And a user receives a response containing "Value":{"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}
  And a user receives a response containing "Timestamp"
  And a user receives a response containing "IsDelete":"false"

  #delete a marble
  When a user invokes on the chaincode named "mycc" with args ["delete","marble201"]
  And I wait "10" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble201"]
  Then a user receives an error response of status: 500
  And a user receives an error response of {"Error":"Marble does not exist: marble201"}
  And I wait "3" seconds

  #Test getHistoryForDeletedMarble
  When a user queries on the chaincode named "mycc" with args ["getHistoryForMarble","marble201"]
  Then a user receives a response containing "TxId"
  And a user receives a response containing "Value":{"docType":"marble","name":"marble201","color":"blue","size":6,"owner":"ram"}
  And a user receives a response containing "Timestamp"
  And a user receives a response containing "IsDelete":"false"
  And I wait "3" seconds
  Then a user receives a response containing "TxId"
  And a user receives a response containing "Value":{"docType":"marble","name":"marble201","color":"blue","size":6,"owner":"ram"}
  And a user receives a response containing "Timestamp"
  And a user receives a response containing "IsDelete":"true"

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble101","red","35","tom"]
  And I wait "3" seconds

  # Test getMarblesByRange
  When a user queries on the chaincode named "mycc" with args ["getMarblesByRange","marble1", "marble201"]
  Then a user receives a response containing "Key":"marble1"
  And  a user receives a response containing "Record":{"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}
  And a user receives a response containing "Key":"marble101"
  And a user receives a response containing "Record":{"docType":"marble","name":"marble101","color":"red","size":35,"owner":"tom"}

  Examples:
    | type  |                       path                                     | language |
    | solo  |  github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |
    | kafka |  github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |
    | solo  |       ../../fabric-test/chaincodes/marbles/node                | NODE     |
    | kafka |       ../../fabric-test/chaincodes/marbles/node                | NODE     |

@daily
Scenario Outline: FAB-3888: State Transfer Test, bouncing a non-leader peer, using marbles02, for <type> orderer

  Given the CORE_LOGGING_GOSSIP environment variable is "DEBUG"
  And I have a bootstrapped fabric network of type <type>
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/marbles02" with args [""] with name "mycc"

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble1","red","35","tom"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a success response of {"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble111","pink","55","jane"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"]
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"jane"}

 When the initial non-leader peer of "org1" is taken down

  And a user invokes on the chaincode named "mycc" with args ["transferMarble","marble111","jerry"] on the initial leader peer of "org1"
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"] on the initial leader peer of "org1"
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"jerry"} from the initial leader peer of "org1"
  And I wait "3" seconds
  When a user invokes on the chaincode named "mycc" with args ["transferMarble","marble111","tom"] on the initial leader peer of "org1"
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"] on the initial leader peer of "org1"
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"tom"} from the initial leader peer of "org1"

  When the initial non-leader peer of "org1" comes back up

  And I wait "30" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"] on the initial non-leader peer of "org1"
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"tom"} from the initial non-leader peer of "org1"

  Examples:
    | type  |
    | solo  |
    | kafka |

#TBD: To verify values returned from queries wherever possible
@daily
Scenario Outline: FAB-5791: Chaincode to test shim interface API, for <type> orderer
  Given I have a bootstrapped fabric network of type <type>
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/chaincodeAPIDriver" with args ["init","a","1000","b","2000"] with name "mycc"
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc" with args ["getTxTimeStamp"]
  When a user queries on the chaincode named "mycc" with args ["getCreator"]
  When a user queries on the chaincode named "mycc" with args ["getBinding"]
  When a user queries on the chaincode named "mycc" with args ["getSignedProposal"]
  When a user queries on the chaincode named "mycc" with args ["getTransient"]

  Examples:
    | type  |
    | solo  |
    | kafka |

@smoke
Scenario Outline: FAB-6211: Test example02 chaincode written using <language> <security>
    Given I have a bootstrapped fabric network of type solo <security>
    When a user sets up a channel
    And a user deploys chaincode at path "<path>" with args ["init","a","1000","b","2000"] with name "mycc" with language "<language>"
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "3" seconds
    When a user queries on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990
    When a user queries on the chaincode named "mycc" with args ["query","b"]
    Then a user receives a success response of 2010
Examples:
    |                            path                                         | language | security    |
    | github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02 | GOLANG   | with tls    |
    | github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02 | GOLANG   | without tls |
    |        ../../fabric-test/chaincodes/example02/node                      | NODE     | with tls    |
    |        ../../fabric-test/chaincodes/example02/node                      | NODE     | without tls |

@daily
Scenario Outline: FAB-6256: Test rich queries using marbles chaincode using <language>
    Given I have a bootstrapped fabric network of type solo using state-database couchdb with tls
    When a user sets up a channel
    And a user deploys chaincode at path "<path>" with args [""] with language "<language>"

    When a user invokes on the chaincode with args ["initMarble","marble1","blue","35","tom"]
    And I wait "3" seconds
    When a user queries on the chaincode with args ["readMarble","marble1"]
    Then a user receives a response containing "name":"marble1"
    And a user receives a response containing "owner":"tom"

    When a user invokes on the chaincode with args ["initMarble","marble2","red","50","tom"]
    And I wait "3" seconds
    When a user queries on the chaincode with args ["readMarble","marble2"]
    Then a user receives a response containing "name":"marble2"
    And a user receives a response containing "owner":"tom"

    # queryMarblesByOwner
    When a user queries on the chaincode with args ["queryMarblesByOwner","tom"]
    Then a user receives a response containing "Key":"marble1"
    And a user receives a response containing "name":"marble1"
    And a user receives a response containing "owner":"tom"
    And a user receives a response containing "Key":"marble2"
    And a user receives a response containing "name":"marble2"

    # queryMarbles
    When a user queries on the chaincode with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\"}}"]
    Then a user receives a response containing "Key":"marble1"
    And a user receives a response containing "name":"marble1"
    And a user receives a response containing "owner":"tom"
    And a user receives a response containing "Key":"marble2"
    And a user receives a response containing "name":"marble2"

    When a user invokes on the chaincode with args ["transferMarble","marble1","jerry"]
    And I wait "3" seconds
    And a user queries on the chaincode with args ["readMarble","marble1"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble1"
    And a user receives a response containing "color":"blue"
    And a user receives a response containing "size":35
    And a user receives a response containing "owner":"jerry"
    When a user invokes on the chaincode with args ["transferMarble","marble2","jerry"]
    And I wait "3" seconds
    And a user queries on the chaincode with args ["readMarble","marble2"]
    Then a user receives a response containing "docType":"marble"
    And a user receives a response containing "name":"marble2"
    And a user receives a response containing "color":"red"
    And a user receives a response containing "size":50
    And a user receives a response containing "owner":"jerry"

    When a user queries on the chaincode with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\"}}"]
    Then a user receives a success response of []
Examples:
    |                             path                              | language |
    | github.com/hyperledger/fabric/examples/chaincode/go/marbles02 | GOLANG   |
    |        ../../fabric-test/chaincodes/marbles/node              | NODE     |
