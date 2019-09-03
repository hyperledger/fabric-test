# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


Feature: Fabric-CA Service
    As a user I want to be able to use the Fabric-CA for generation of certificates

#@doNotDecompose
@interop
@daily
Scenario Outline: FAB-6489: Interop using <type> orderer, <database>, <interface>, <language> chaincode
    # We should be able to turn TLS on for these tests once CLI certificates and JavaSDK TLS is working correctly - FAB-15018
    #Given I have a bootstrapped fabric network of type <type> using state-database <database> with tls
    Given I have a bootstrapped fabric network of type <type> using state-database <database>
    And I use the <interface> interface
    And I enroll the following users using fabric-ca
         | username  |   organization   | password |  role  | certType |
         |  latitia  | org1.example.com |  h3ll0   | admin  |   x509   |
         |   scott   | org2.example.com |  th3r3   |  user  |   x509   |
         |   adnan   | org1.example.com |  wh@tsup |  user  |   x509   |
    When an admin sets up a channel
    And an admin deploys chaincode at path "<path>" with args ["init","a","1000","b","2000"] with name "mycc" with language "<language>"
    And I wait "5" seconds
    When a user "adnan" queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 1000
    When a user "scott" queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
    Then a user receives a success response of 1000 from "peer0.org2.example.com"
    When a user "adnan" invokes on the chaincode with args ["invoke","a","b","10"]
    And I wait "5" seconds
    When a user "scott" queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
    Then a user receives a success response of 990 from "peer0.org2.example.com"
    When a user "scott" invokes on the chaincode named "mycc" with args ["invoke","a","b","10"] on "peer0.org2.example.com"
    And I wait "5" seconds
    When a user "latitia" queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 980
Examples:
    | type  | database | interface  |                          path                     | language |
    | solo  | leveldb  |  Java SDK  |   ../../fabric-test/chaincodes/example02/go/cmd   |  GOLANG  |
    | kafka | couchdb  |    CLI     |   ../../fabric-test/chaincodes/example02/node     |   NODE   |
    | kafka | leveldb  | NodeJS SDK |   ../../fabric-samples/chaincode/abstore/java     |   JAVA   |


@daily
Scenario Outline: FAB-11621: JavaSDK interoperability Test using <language> chaincode shim
    Given I have a bootstrapped fabric network
    And I use the Java SDK interface
    And I enroll the following users using fabric-ca
         | username  |   organization   | password |  role  |
         |  latitia  | org1.example.com |  h3ll0   | admin  |
         |   scott   | org2.example.com |  th3r3   |  user  |
         |   adnan   | org1.example.com |  wh@tsup |  user  |
    When an admin sets up a channel
    And an admin deploys chaincode at path "<path>" with args ["init","a","1000","b","2000"] with name "mycc" with language "<language>"
    And I wait "5" seconds
    When a user "adnan" queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 1000
    And I wait "5" seconds
    When a user "adnan" invokes on the chaincode with args ["invoke","a","b","10"]
    And I wait "5" seconds
    When a user "scott" queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
    Then a user receives a success response of 990 from "peer0.org2.example.com"
    When a user "scott" invokes on the chaincode named "mycc" with args ["invoke","a","b","10"] on "peer0.org2.example.com"
    And I wait "5" seconds
    When a user "latitia" queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 980
Examples:
    |                          path                      | language |
    |   ../../fabric-test/chaincodes/example02/go/cmd    |  GOLANG  |
    |   ../../fabric-test/chaincodes/example02/node      |   NODE   |
    |   ../../fabric-samples/chaincode/abstore/java      |   JAVA   |

#@daily
Scenario Outline: FAB-11728: Identity Mixer Test Happy Path
    Given an admin creates an idemix MSP for organization "org1.example.com"
    Given I have a bootstrapped fabric network with tls
    And I use the <interface> interface
    And I enroll the following users using fabric-ca
         | username  |   organization   | password |  role  | certType |
         |  latitia  | org1.example.com |  h3ll0   | admin  |  idemix  |
         |   scott   | org2.example.com |  th3r3   |  user  |  idemix  |
         |   adnan   | org1.example.com |  wh@tsup |  user  |  idemix  |
    When an admin sets up a channel
    And an admin deploys chaincode at path "<path>" with args ["init","a","1000","b","2000"] with name "mycc" with language "<language>"
    And I wait "5" seconds
    When a user "adnan" queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 1000
    And I wait "5" seconds
    When a user "adnan" invokes on the chaincode with args ["invoke","a","b","10"]
    And I wait "5" seconds
    When a user "scott" queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
    Then a user receives a success response of 990 from "peer0.org2.example.com"
    When a user "scott" invokes on the chaincode named "mycc" with args ["invoke","a","b","10"] on peer0.org2.example.com
    And I wait "5" seconds
    When a user "latitia" queries on the chaincode with args ["query","a"]
    Then a user receives a success response of 980
Examples:
    | interface  |                                     path                                                | language |
    |  Java SDK  | github.com/hyperledger/fabric-sdk-java/chaincode/gocc/sample1/src/github.com/example_cc |  GOLANG  |
