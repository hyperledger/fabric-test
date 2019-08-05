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

@daily
Scenario Outline: FAB-11808: Test the use of the network model API to successfully commit to the ledger
    Given I have a bootstrapped fabric network of type <type> <security>
    And I use the NodeJS SDK interface
    When an admin sets up a channel
    And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "mycc"
    # evaluating a transaction == query, but using the network model API
    When a user evaluates a transaction on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 1000
    # submitting a transaction == invoke, but using the network model API
    When a user submits a transaction on the chaincode named "mycc" with args ["invoke","a","b","10"]
    And I wait "5" seconds
    When a user evaluates a transaction on the chaincode named "mycc" with args ["query","a"]
    Then a user receives a success response of 990
Examples:
    | type  |   security  |
    | solo  | without tls |
    | kafka | without tls |

@daily
Scenario: FAB-4703: FAB-5663, Test chaincode calling chaincode - fabric-test/chaincodes/example04/go/cmd
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example04/go/cmd" with args ["init","Event","1"] with name "myex04"
  When an admin sets up a channel named "channel2"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_a" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_a" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex04" with args ["query","Event", "myex02_a", "a", "channel2"]
  Then a user receives a success response of 1000

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
Scenario: FAB-4718: FAB-5663, chaincode ex05 to ex02, on same channel, pass empty string for channel_name
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example05/go/cmd" with args ["init","sum","0"] with name "myex05"
  When an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_b"
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", ""]
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


#This scenario failed due to kafka containers are not ready in the allotted time 
@daily
Scenario: FAB-4722: FAB-5663, chaincode ex05 to ex02, on diff channels, pass empty string for channnel name
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example05/go/cmd" with args ["init","sum","0"] with name "myex05"
  When an admin sets up a channel named "channel2"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_b" on channel "channel2"
  When a user queries on the channel "channel2" using chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum", ""]
  Then a user receives an error response of status:500
  And a user receives an error response of chaincode myex02_b not found

@daily
Scenario: FAB-5384: FAB-5663, chaincode ex05 to ex02, on same channel, with two args
  Given I have a bootstrapped fabric network of type kafka
  When an admin sets up a channel
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example05/go/cmd" with args ["init","sum","0"] with name "myex05"
  When an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with args ["init","a","1000","b","2000"] with name "myex02_b"
  When a user queries on the chaincode named "myex02_b" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode named "myex05" with args ["query","myex02_b", "sum"]
  Then a user receives a success response of 3000


##@daily
Scenario Outline: FAB-3888: State Transfer Test, bouncing a non-leader peer, using marbles02, for <type> orderer
  Given the FABRIC_LOGGING_SPEC environment variable is gossip.election=DEBUG
  And I have a bootstrapped fabric network of type <type>
  When an admin sets up a channel
  #And an admin deploys chaincode at path "github.com/hyperledger/fabric-samples/chaincode/marbles02/go" with args [""] with name "mycc"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/marbles02_private" with args [""] with name "mycc"

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



@shimAPI
##@daily
Scenario Outline: FAB-6256: Test support of rich queries in SHIM API: queryMarbles and queryMarblesByOwner
    Given I have a bootstrapped fabric network of type solo using state-database couchdb with tls
    When an admin sets up a channel
    And an admin deploys chaincode at path "<path>" with args [""] with language "<language>"

    When a user invokes on the chaincode with args ["initMarble","marble1","blue","35","tom"]
    When a user invokes on the chaincode with args ["initMarble","marble2","red","50","tom"]
    And I wait "3" seconds
    When a user queries on the chaincode with args ["readMarble","marble1"]
    Then a user receives a response containing "name":"marble1"
    And a user receives a response containing "owner":"tom"

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

    # queryMarbles on more than one selector
    When a user queries on the chaincode with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\",\\"color\\":\\"red\\"}}"]

    Then a user receives a response containing "Key":"marble2"
    And a user receives a response containing "name":"marble2"
    And a user receives a response containing "color":"red"
    And a user receives a response containing "owner":"tom"
    Then a user receives a response not containing "Key":"marble1"
    And a user receives a response not containing "color":"blue"

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
    |                             path                                | language |
    | github.com/hyperledger/fabric-test/chaincodes/marbles02_private | GOLANG   |
    |   github.com/hyperledger/fabric-test/chaincodes/marbles/node    |  NODE    |


@shimAPI
##@daily
Scenario Outline: FAB-5791: SHIM API, marbles02 and shimApiDriver chaincodes, <type> orderer <database> db <language> lang
# |  shim API in fabric/core/shim/chaincode.go	|   Covered in marbles02  chaincode                     |
# |        for chaincode invocation
# |        Init	                                |                init                                   |
# |        Invoke	                        |               invoke                                  |
# |        GetState 	                        | readMarble, initMarble, transferMarble                |
# |        PutState 	                        |    initMarble, transferMarble                         |
# |        DelState 	                        |             deleteMarble                              |
# |        CreateCompositeKey 	                |       initMarble, deleteMarble                        |
# |        SplitCompositeKey 	                |         transferMarblesBasedOnColor                   |
# |        GetStateByRange 	                |         transferMarblesBasedOnColor                   |
# |        GetQueryResult 	                | FAB-6256 readMarbles,queryMarbles,queryMarblesByOwner |
# |        GetHistoryForKey 	                |       getHistoryForMarble                             |
# | GetStatePartialCompositeKeyQuery	        |       transferMarblesBasedOnColor                     |

# |                                             |      Covered in shimApiDriver chaincode
# |        GetArgs                              |              getArgs                                  |
# |        GetArgsSlice                         |              getArgsSlice                             |
# |        GetStringArgs                        |              getStringArgs                            |
# |        GetFunctionAndParameters             |              getFunctionAndParameters                 |

# |        GetBinding                           |              getBinding                               |
# |        GetCreator                           |              getCreator                               |
# |        GetTxTimeStamp                       |              getTxTimeStamp                           |
# |        GetSignedProposal                    |              getSignedProposal                        |
# |        GetTransient                         |              getTransient                             |
# |        GetTxID                              |                                                       |
# |        GetDecorations                       |                                                       |
# |        SetEvent                             |                                                       |

# |        InvokeChaincode                      |           FAB-4717  ch_ex05 calling ch_ex02           |

  Given I have a bootstrapped fabric network of type <type>
  When an admin sets up a channel
  And I vendor "<language>" packages for fabric-based chaincode at "<VendorPath>"
  When an admin deploys chaincode at path "<marbles02Path>" with args [""] with name "mycc" with language "<language>"
  When an admin deploys chaincode at path "<shimAPIDriverPath>" with args [""] with name "myShimAPI" with language "<language>"


  #first two marbles are used for getMarblesByRange
  When a user invokes on the chaincode named "mycc" with args ["initMarble","001m1","indigo","35","saleem"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","004m4","green","35","dire straits"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble1","red","35","tom"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble2","blue","55","jerry"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble111","pink","55","jane"]
  And I wait "5" seconds

  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "size":35
  And a user receives a response containing "owner":"tom"


  When a user queries on the chaincode named "mycc" with args ["readMarble","marble2"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble2"
  And a user receives a response containing "color":"blue"
  And a user receives a response containing "size":55
  And a user receives a response containing "owner":"jerry"

  When a user queries on the chaincode named "mycc" with args ["readMarble","marble111"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble111"
  And a user receives a response containing "color":"pink"
  And a user receives a response containing "size":55
  And a user receives a response containing "owner":"jane"

#Test transferMarble
  When a user invokes on the chaincode named "mycc" with args ["transferMarble","marble1","jerry"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble1"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "size":35
  And a user receives a response containing "owner":"jerry"

# Begin creating marbles to to test transferMarblesBasedOnColor
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble100","red","5","cassey"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble101","blue","6","cassey"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble200","purple","5","ram"]
  When a user invokes on the chaincode named "mycc" with args ["initMarble","marble201","blue","6","ram"]
  And I wait "3" seconds

  When a user invokes on the chaincode named "mycc" with args ["transferMarblesBasedOnColor","blue","jerry"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble100"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble100"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "size":5
  And a user receives a response containing "owner":"cassey"


  When a user queries on the chaincode named "mycc" with args ["readMarble","marble101"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble101"
  And a user receives a response containing "color":"blue"
  And a user receives a response containing "size":6
  And a user receives a response containing "owner":"jerry"


  When a user queries on the chaincode named "mycc" with args ["readMarble","marble200"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble200"
  And a user receives a response containing "color":"purple"
  And a user receives a response containing "size":5
  And a user receives a response containing "owner":"ram"

  When a user queries on the chaincode named "mycc" with args ["readMarble","marble201"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble201"
  And a user receives a response containing "color":"blue"
  And a user receives a response containing "size":6
  And a user receives a response containing "owner":"jerry"


# Test getMarblesByRange
  When a user queries on the chaincode named "mycc" with args ["getMarblesByRange","001m1", "005m4"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"001m1"
  And a user receives a response containing "color":"indigo"
  And a user receives a response containing "size":35
  And a user receives a response containing "owner":"saleem"

  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"004m4"
  And a user receives a response containing "color":"green"
  And a user receives a response containing "size":35
  And a user receives a response containing "owner":"dire straits"


  # Test getHistoryForMarble
  When a user queries on the chaincode named "mycc" with args ["getHistoryForMarble","marble1"]
  Then a user receives a response containing "TxId"
  And a user receives a response containing "Value":{"docType":"marble","name":"marble1","color":"red","size":35,"owner":"tom"}
  And a user receives a response containing "Timestamp"
  And a user receives a response containing "IsDelete":"false"

  #delete a marble
  When a user invokes on the chaincode named "mycc" with args ["delete","marble201"]
  And I wait "3" seconds
  When a user queries on the chaincode named "mycc" with args ["readMarble","marble201"]
  Then a user receives an error response of status:500
  And a user receives an error response of {\"Error\":\"Marble does not exist: marble201\"}


  #Test getHistoryForDeletedMarble
  When a user queries on the chaincode named "mycc" with args ["getHistoryForMarble","marble201"]
  Then a user receives a response containing "TxId"
  And a user receives a response containing "Value":{"docType":"marble","name":"marble201","color":"blue","size":6,"owner":"ram"}
  And a user receives a response containing "Timestamp"
  And a user receives a response containing "IsDelete":"false"
  Then a user receives a response containing "TxId"
  And a user receives a response containing "Value":{"docType":"marble","name":"marble201","color":"blue","size":6,"owner":"ram"}
  And a user receives a response containing "Timestamp"
  And a user receives a response containing "IsDelete":"true"

  When a user queries on the chaincode named "myShimAPI" with args ["getTxTimestamp"]
  When a user queries on the chaincode named "myShimAPI" with args ["getCreator"]
  When a user invokes on the chaincode named "myShimAPI" with args ["getBinding"]
  When a user queries on the chaincode named "myShimAPI" with args ["getSignedProposal"]
  When a user queries on the chaincode named "myShimAPI" with args ["getTransient"]


  Examples:
   | type  | database |                      marbles02Path                              | VendorPath                       | shimAPIDriverPath                                                | language |
   | solo  |  leveldb | github.com/hyperledger/fabric-test/chaincodes/marbles02_private | ../chaincodes/shimApiDriver/go   | github.com/hyperledger/fabric-test/chaincodes/shimApiDriver/go   | GOLANG   |
   | kafka |  couchdb | github.com/hyperledger/fabric-test/chaincodes/marbles02_private | ../chaincodes/shimApiDriver/go   | github.com/hyperledger/fabric-test/chaincodes/shimApiDriver/go   | GOLANG   |
   | solo  |  leveldb | github.com/hyperledger/fabric-test/chaincodes/marbles/node      | ../chaincodes/shimApiDriver/node | github.com/hyperledger/fabric-test/chaincodes/shimApiDriver/node | NODE     |
   | kafka |  couchdb | github.com/hyperledger/fabric-test/chaincodes/marbles/node      | ../chaincodes/shimApiDriver/node | github.com/hyperledger/fabric-test/chaincodes/shimApiDriver/node | NODE     |
