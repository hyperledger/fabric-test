#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

Feature: FAB-5384 Chaincode Testing: As a user I want to be able verify that I can execute different chaincodes


@daily
Scenario Outline: FAB-5797: Test chaincode - fabric/examples/chaincode_example02 deploy, invoke, and query with chaincode in all uppercase chars
    Given I have a bootstrapped fabric network of type <type>
    And I wait "<waitTime>" seconds
    When a user sets up a channel
    And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "<ccName>"
    And I wait "5" seconds
    Then the chaincode is deployed
    When a user queries on the chaincode named "<ccName>" with args ["query","a"]
    Then a user receives a success response of 1000
    When a user invokes on the chaincode named "<ccName>" with args ["invoke","a","b","10"]
    And I wait "3" seconds
    When a user queries on the chaincode named "<ccName>" with args ["query","a"]
    Then a user receives a success response of 990
Examples:
    | type  | waitTime |  ccName   |
    | solo  |    5     |   mycc    |
    | solo  |    5     |   MYCC    |
    | solo  |    5     | MYcc_Test |
    | kafka |    30    |   mycc    |
    | kafka |    30    |   MYCC    |
    | kafka |    30    | MYcc_Test |

@skip
Scenario: FAB-4703: Test chaincode calling chaincode - fabric/examples/chaincode_example04
  Given I have a bootstrapped fabric network of type kafka
  And I wait "30" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example04" with args ["init","Event","1"] with name "myex04"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_a" on channel "channel2"
  And I wait "20" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "myex02_a" on channel "channel2" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex04" with args ["query","Event", "myex02_a", "a", "channel2"]
  Then a user receives a success response of 1000


@skip
Scenario: FAB-4717: chaincode-to-chaincode testing passing in channel name as a third argument to chaincode_ex05
#chaincode-to-chaicode testing passing when cc_05 and cc_02 are on different channels
#chaincode_example02 and chaincode_example05 installed on different channels
  Given I have a bootstrapped fabric network of type kafka
  And I wait "30" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "myex02_b" on channel "channel2" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "channel2"]
  Then a user receives a success response of 3000

@skip
Scenario: FAB-4718: Test chaincode calling chaincode -ve testcase passing an empty string for channelname- fabric/examples/chaincode_example05
#chaincode_example02 and chaincode_example05 installed on different channels
  Given I have a bootstrapped fabric network of type kafka
  And I wait "30" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user sets up a channel named "channel2"
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "myex02_b" on channel "channel2" with args ["query","a"]
  Then a user receives a success response of 1000
  Then a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", ""]
  Then a user receives a success response of status: 500
  #Then a user receives a success response of 3000

@skip
Scenario: FAB-5384: Test chaincode calling chaincode - fabric/examples/chaincode_example05
#chaincode_example02 and chaincode_example05 installed on same channels
  Given I have a bootstrapped fabric network of type kafka
  And I wait "30" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum"]
  Then a user receives a success response of 3000

@skip
Scenario: FAB-4720: Test chaincode calling chaincode -ve test case passing an incorrect or non-existing channnel name in query fabric/examples/chaincode_example05
#chaincode_example02 and chaincode_example05 installed on same channels
  Given I have a bootstrapped fabric network of type kafka
  And I wait "30" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", "channel3"]
  Then a user receives an error response of status: 500
  #Then a user receives an error response of 3000

@skip
Scenario: FAB-4722: chaincode-to-chaincode testing passing an empty string for channel_name when cc_05 and cc_02 are on the same channel
#chaincode_example02 and chaincode_example05 installed on same channels
  Given I have a bootstrapped fabric network of type kafka
  And I wait "30" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example05" with args ["init","sum","0"] with name "myex05"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args ["init","a","1000","b","2000"] with name "myex02_b"
  And I wait "30" seconds
  Then the chaincode is deployed
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", ""]
  Then a user receives a success response of 3000

@daily
Scenario Outline: FAB-5789: Test chaincode fabric/examples/marbles02
#includes tests for : initMarble, readMarble, transferMarble, transferMarblesBasedOnColor

  Given I have a bootstrapped fabric network of type <type>
  And I wait "<waitTime>" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/marbles02" with args [""] with name "mycc"
  And I wait "5" seconds
  Then the chaincode is deployed

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble1","red","35","tom"]
  And I wait "10" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a success response of {"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble2","blue","55","jerry"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble2"]
  Then a user receives a success response of {"docType":"marble","name":"marble2","color":"blue","size":55,"owner":"jerry"}

  #Test transferMarble
  When a user invokes on the chaincode named "mycc" with args ["transferMarble","marble1","jerry"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a success response of {"docType":"marble","name":"marble1","color":"red","size":35,"owner":"jerry"}

  # Begin creating marbles to test transferMarblesBasedOnColor
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble100","red","5","cassey"]
  And I wait "3" seconds

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble101","blue","6","cassey"]
  And I wait "3" seconds

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble200","purple","5","ram"]
  And I wait "3" seconds

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble201","blue","6","ram"]
  And I wait "3" seconds

  When a user invokes on the chaincode named "mycc" with args ["transferMarblesBasedOnColor","blue","jerry"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble100"]
  Then a user receives a success response of {"docType":"marble","name":"marble100","color":"red","size":5,"owner":"cassey"}

  When a user queries on the chaincode named "mycc" with args ["readMarble","marble101"]
  Then a user receives a success response of {"docType":"marble","name":"marble101","color":"blue","size":6,"owner":"jerry"}

  When a user queries on the chaincode named "mycc" with args ["readMarble","marble200"]
  Then a user receives a success response of {"docType":"marble","name":"marble200","color":"purple","size":5,"owner":"ram"}

  When a user queries on the chaincode named "mycc" with args ["readMarble","marble201"]
  Then a user receives a success response of {"docType":"marble","name":"marble201","color":"blue","size":6,"owner":"jerry"}
  Examples:
    | type  | waitTime |
    | solo  |    20    |
    | kafka |    30    |


@daily
Scenario Outline: FAB-5790: Test chaincode fabric/examples/marbles02
  #includes tests for : initMarble, readMarble, deleteMarble, getHistoryForMarble, getMarblesByRange
  Given I have a bootstrapped fabric network of type <type>
  And I wait "<waitTime>" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/marbles02" with args [""] with name "mycc"
  And I wait "5" seconds
  Then the chaincode is deployed

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble1","red","35","tom"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a success response of {"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble201","blue","6","ram"]
  And I wait "3" seconds
  # Test getHistoryForMarble
  When a user queries on the chaincode named "mycc" with args ["getHistoryForMarble","marble1"]
  And I wait "3" seconds
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
  And I wait "3" seconds
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
  And I wait "3" seconds
  Then a user receives a response containing {"Key":"marble1", "Record":{"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}}
  And a user receives a response containing {"Key":"marble101", "Record":{"docType":"marble","name":"marble101","color":"red","size":35,"owner":"tom"}}

  Examples:
    | type  | waitTime |
    | solo  |    20    |
    | kafka |    30    |

Scenario Outline: FAB-3888: State Transfer Test using marbles02 chaincode fabric/examples/marbles02
#includes statetransfer test where a non-leader is brought down , and then after few invokes it is brought back up, to check if the non-leader successfully receives the blocks and update itself

  Given the CORE_LOGGING_GOSSIP environment variable is "DEBUG"
  And I have a bootstrapped fabric network of type <type>
  And I wait "<waitTime>" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric/examples/chaincode/go/marbles02" with args [""] with name "mycc"
  And I wait "5" seconds
  Then the chaincode is deployed

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble1","red","35","tom"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a success response of {"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}

  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble111","pink","55","jane"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"]
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"jane"}

 Given the initial non-leader peer of "org1" is taken down

  When a user invokes on the chaincode named "mycc" with args ["transferMarble","marble111","jerry"] on the initial leader peer of "org1"
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"] on the initial leader peer of "org1"
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"jerry"} from the initial leader peer of "org1"
  And I wait "3" seconds
  When a user invokes on the chaincode named "mycc" with args ["transferMarble","marble111","tom"] on the initial leader peer of "org1"
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"] on the initial leader peer of "org1"
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"tom"} from the initial leader peer of "org1"

  Given the initial non-leader peer of "org1" comes back up

  And I wait "30" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"] on the initial non-leader peer of "org1"
  Then a user receives a success response of {"docType":"marble","name":"marble111","color":"pink","size":55,"owner":"tom"} from the initial non-leader peer of "org1"

  Examples:
    | type  | waitTime |
    | solo  |    20    |
    | kafka |    30    |


@skip
Scenario Outline: FAB-5791: Chaincode to test shim interface API
  Given I have a bootstrapped fabric network of type <type>
  And I wait "60" seconds
  When a user sets up a channel
  And a user deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/chaincodeAPIDriver" with args ["init","a","1000","b","2000"] with name "mycc"
  And I wait "5" seconds
  Then the chaincode is deployed
  And I wait "5" seconds
  When a user invokes on the chaincode named "mycc" with args ["invoke","getTxTimeStamp"]
  And I wait "5" seconds
  When a user invokes on the chaincode named "mycc" with args ["invoke","getCreator"]
  And I wait "5" seconds
  When a user invokes on the chaincode named "mycc" with args ["invoke","getBinding"]
  And I wait "5" seconds
  When a user invokes on the chaincode named "mycc" with args ["invoke","getSignedProposal"]
  And I wait "5" seconds
  When a user invokes on the chaincode named "mycc" with args ["invoke","getTransient"]
  And I wait "5" seconds

  Examples:
    | type  | waitTime |
    | solo  |    20    |
    | kafka |    30    |
