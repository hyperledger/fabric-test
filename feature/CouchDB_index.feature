#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

Feature: Testing Fabric CouchDB indexing


#This fails as of Aug 23. Refer to FAB-16468. It is being replaced, so we are just removing from daily suite.
#@daily
Scenario Outline: <jira_num>: CouchDB Indexing, <language> with 3 channels and 3 index with 1 selector
    Given I have a bootstrapped fabric network of type kafka using state-database couchdb without tls
    When a user defines a couchDB index named index_behave_test_1 with design document name "indexdoc_behave_test_1" containing the fields "owner" to the chaincode at path "<index_path>"
    And a user defines a couchDB index named index_behave_test_2 with design document name "indexdoc_behave_test_2" containing the fields "docType" to the chaincode at path "<index_path>"
    And a user defines a couchDB index named index_behave_test_3 with design document name "indexdoc_behave_test_3" containing the fields "color" to the chaincode at path "<index_path>"

    # set up 3 channel, 1  cc
    When an admin sets up a channel named "mychannel1"
    And an admin sets up a channel named "mychannel2"
    And an admin sets up a channel named "mychannel3"
    And an admin deploys chaincode at path "<cc_path>" with args [""] with name "mycc1" with language "<language>" on channel "mychannel1"
    And an admin deploys chaincode at path "<cc_path>" with args [""] with name "mycc2" with language "<language>" on channel "mychannel2"
    And an admin deploys chaincode at path "<cc_path>" with args [""] with name "mycc3" with language "<language>" on channel "mychannel3"

    # Invoke in the channel
    When a user invokes on the channel "mychannel1" using chaincode named "mycc1" with args ["initMarble","marble1","green","10","matt"] on "peer0.org1.example.com"
    And a user invokes on the channel "mychannel2" using chaincode named "mycc2" with args ["initMarble","marble2","yellow","20","alex"] on "peer0.org1.example.com"
    And a user invokes on the channel "mychannel3" using chaincode named "mycc3" with args ["initMarble","marble3","red","5","jose"] on "peer0.org1.example.com"

    # Do sanity-check rich query
    When a user queries on the channel "mychannel1" using chaincode named "mycc1" with args ["queryMarbles", "{\\"selector\\":{\\"owner\\":\\"matt\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_1\\", \\"index_behave_test_1\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"matt"
    When a user queries on the channel "mychannel2" using chaincode named "mycc2" with args ["queryMarbles", "{\\"selector\\":{\\"owner\\":\\"alex\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_1\\", \\"index_behave_test_1\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"alex"
    When a user queries on the channel "mychannel3" using chaincode named "mycc3" with args ["queryMarbles", "{\\"selector\\":{\\"owner\\":\\"jose\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_1\\", \\"index_behave_test_1\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"jose"
    When a user queries on the channel "mychannel1" using chaincode named "mycc1" with args ["queryMarbles", "{\\"selector\\":{\\"docType\\":\\"marble\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_2\\", \\"index_behave_test_2\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"matt"
    When a user queries on the channel "mychannel2" using chaincode named "mycc2" with args ["queryMarbles", "{\\"selector\\":{\\"docType\\":\\"marble\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_2\\", \\"index_behave_test_2\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"alex"
    When a user queries on the channel "mychannel3" using chaincode named "mycc3" with args ["queryMarbles", "{\\"selector\\":{\\"docType\\":\\"marble\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_2\\", \\"index_behave_test_2\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"jose"
    When a user queries on the channel "mychannel1" using chaincode named "mycc1" with args ["queryMarbles", "{\\"selector\\":{\\"color\\":\\"green\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_3\\", \\"index_behave_test_3\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"matt"
    When a user queries on the channel "mychannel2" using chaincode named "mycc2" with args ["queryMarbles", "{\\"selector\\":{\\"color\\":\\"yellow\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_3\\", \\"index_behave_test_3\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"alex"
    When a user queries on the channel "mychannel3" using chaincode named "mycc3" with args ["queryMarbles", "{\\"selector\\":{\\"color\\":\\"red\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_3\\", \\"index_behave_test_3\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"jose"

    # Explicitly check with CouchDB to confirm the index is set up correctly for the rich query to pass using index
    When a user requests to get the design doc "indexdoc_behave_test_1" for the chaincode named "mycc1" in the channel "mychannel1" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_1":{"map":{"fields":{"owner":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_1" for the chaincode named "mycc2" in the channel "mychannel2" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_1":{"map":{"fields":{"owner":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_1" for the chaincode named "mycc3" in the channel "mychannel3" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_1":{"map":{"fields":{"owner":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_2" for the chaincode named "mycc1" in the channel "mychannel1" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_2":{"map":{"fields":{"docType":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_2" for the chaincode named "mycc2" in the channel "mychannel2" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_2":{"map":{"fields":{"docType":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_2" for the chaincode named "mycc3" in the channel "mychannel3" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_2":{"map":{"fields":{"docType":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_3" for the chaincode named "mycc1" in the channel "mychannel1" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_3":{"map":{"fields":{"color":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_3" for the chaincode named "mycc2" in the channel "mychannel2" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_3":{"map":{"fields":{"color":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test_3" for the chaincode named "mycc3" in the channel "mychannel3" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_3":{"map":{"fields":{"color":"asc"}] from the couchDB container


Examples:
    |                             cc_path                            |                      index_path                              | language  |  jira_num   |
    | github.com/hyperledger/fabric-samples/chaincode/marbles02/go   | github.com/hyperledger/fabric-samples/chaincode/marbles02/go | GOLANG    |  FAB-7253   |
#   | ../../fabric-samples/chaincode/marbles02/node                  | ../fabric-samples/chaincode/marbles02/node                   | NODE      |  FAB-7256   |


Scenario Outline: <jira_num>: CouchDB Indexing, CC upgrade, <language> with 1 channel
    Given I have a bootstrapped fabric network of type kafka using state-database couchdb without tls
    When a user defines a couchDB index named index_behave_test with design document name "indexdoc_behave_test" containing the fields "owner,docType,color" to the chaincode at path "<index_path>"

    # set up 1 channel, 1 cc
    When an admin sets up a channel named "mychannel1"
    And an admin deploys chaincode at path "<cc_path>" with version "0" with args [""] with name "mycc1" with language "<language>" on channel "mychannel1"

    # Invoke in the channel
    When a user invokes on the channel "mychannel1" using chaincode named "mycc1" with args ["initMarble","marble1","green","10","matt"] on "peer0.org1.example.com"

    #add another index and deploy version 1
    When a user defines a couchDB index named index_behave_test_v1 with design document name "indexdoc_behave_test_v1" containing the fields "owner" to the chaincode at path "<index_path>"
    And an admin installs chaincode at path "<cc_path>" of language "<language>" as version "1" with args [""] with name "mycc1"
    And an admin upgrades the chaincode with name "mycc1" on channel "mychannel1" to version "1" with args [""]

    # Do sanity-check rich query
    When a user queries on the channel "mychannel1" using chaincode named "mycc1" with args ["queryMarbles", "{\\"selector\\":{\\"docType\\":\\"marble\\",\\"owner\\":\\"matt\\", \\"color\\":\\"green\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test\\", \\"index_behave_test\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"matt"
    When a user queries on the channel "mychannel1" using chaincode named "mycc1" with args ["queryMarbles", "{\\"selector\\":{\\"owner\\":\\"matt\\"}, \\"use_index\\":[\\"_design/indexdoc_behave_test_v1\\", \\"index_behave_test_v1\\"]}"] on "peer0.org1.example.com"
    Then a user receives a response containing "owner":"matt"

    # Explicitly check with CouchDB to confirm the index is set up correctly for the rich query to pass using index
    When a user requests to get the design doc "indexdoc_behave_test_v1" for the chaincode named "mycc1" in the channel "mychannel1" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test_v1":{"map":{"fields":{"owner":"asc"}] from the couchDB container
    When a user requests to get the design doc "indexdoc_behave_test" for the chaincode named "mycc1" in the channel "mychannel1" and from the CouchDB instance "http://localhost:5984"
    Then a user receives success response of ["views":{"index_behave_test":{"map":{"fields":{"owner":"asc","docType":"asc","color":"asc"}] from the couchDB container

Examples:
    |                      cc_path                             |                    index_path                   | language  |  jira_num   |
    | ../../fabric-samples/chaincode/marbles02/go              | ../../fabric-samples/chaincode/marbles02/go     | GOLANG    |  FAB-7263   |
#   | ../../fabric-samples/chaincode/marbles02/node            | ../fabric-samples/chaincode/marbles02/node      | NODE      |  FAB-7268   |

