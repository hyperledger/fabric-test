# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


Feature: Lifecycle Service
    As a user I want to be able to the new chaincode lifecycle

@daily
Scenario Outline: FAB-13701: Test new chaincode lifecycle - Basic workflow using <interface> with <language> chaincode
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo using state-database <database>
  And I use the <interface> interface
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages chaincode at path "<path>" written in "<language>"
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990
Examples:
    | database | interface  |                          path                                     | language |
    |  leveldb |   CLI      |   github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd  |  GOLANG  |
    |  leveldb |   CLI      |        ../../fabric-test/chaincodes/example02/node                |   NODE   |
    |  leveldb |   CLI      |    ../../fabric-samples/chaincode/abstore/java                    |   JAVA   |
    # Once the FAB-13979 and FAB-13980 are complete for new lifecycle these should pass.
    #  |  leveldb |   Java SDK    |   github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd  |  GOLANG  |
    #  |  leveldb | NodeJS SDK    |   github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd  |  GOLANG  |


@daily
Scenario Outline: FAB-13701a: Test new chaincode lifecycle - No policy set using <interface> with <language> chaincode
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type <type> using state-database <database>
  And I use the <interface> interface
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages chaincode at path "<path>" written in "<language>"
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode with args ["invoke","a","b","10"] on both orgs
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990
Examples:
    | type  | database | interface  |                          path                                     | language |
    | solo  |  leveldb |   CLI      |   github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd  |  GOLANG  |


@daily
Scenario Outline: FAB-13701b: Test new chaincode lifecycle - Upgrade using <interface> with <language> chaincode
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type <type> using state-database <database>
  And I use the <interface> interface
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel

  And an admin packages chaincode at path "<path>" written in "<language>"
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers

  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"

  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000

  Given the chaincode at location "<path>" is upgraded
  When an admin packages chaincode at path "<path>" as version "2" with name "mycc_02"
  And the organization admins install the chaincode package on all peers
  Then a packageId is received for chaincode "mycc_02" on all peers
  When an admin removes the previous chaincode docker containers

  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel

  And a user invokes on the chaincode named "mycc_02" with args ["init","a","100","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 100

  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 90
Examples:
    | type  | database | interface  |                          path                                     | language |
    | solo  |  leveldb |   CLI      |   github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd  |  GOLANG  |


@daily
Scenario: FAB-13701c: Test new chaincode lifecycle - Recover after chaincode goes down
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990

  When an admin removes the previous chaincode docker containers

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990

  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 980


@daily
Scenario: FAB-13983: Test new chaincode lifecycle - Chaincode calling chaincode
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle

  When an admin sets up a channel named "channel2"
  And an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" with name "ex02"
  And the organization admins install the built "ex02" chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the "ex02" chaincode package on "channel2" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel "channel2"
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the channel "channel2" using chaincode named "ex02" with args ["init","a","1000","b","2000"]
  And I wait up to "30" seconds for deploy to complete

  When an admin sets up a channel named "channel1"
  And an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example04/go/cmd" with name "ex04"
  And the organization admins install the built "ex04" chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the "ex04" chaincode package on "channel1" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel "channel1"
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the channel "channel1" using chaincode named "ex04" with args ["init","Event","1"]
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the channel "channel2" using chaincode named "ex02" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the channel "channel1" using chaincode named "ex04" with args ["query","Event","ex02","a","channel2"]
  Then a user receives a success response of 1000

  # Now upgrade chaincode on both channels
  Given the chaincode at location "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" is upgraded
  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" as version "2" with name "ex02_02"
  And the organization admins install the built "ex02_02" chaincode package on all peers
  Then a packageId is received for chaincode "ex02_02" on all peers
  When an admin removes the previous chaincode docker containers

  When each organization admin approves the "ex02_02" chaincode package on "channel2" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel "channel2"
  And a user invokes on the channel "channel2" using chaincode named "ex02_02" with args ["init","a","1000","b","2000"]
  And I wait up to "30" seconds for deploy to complete

  Given the chaincode at location "github.com/hyperledger/fabric-test/chaincodes/example04/go/cmd" is upgraded
  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example04/go/cmd" as version "2" with name "ex04_02"
  And the organization admins install the built "ex04_02" chaincode package on all peers
  Then a packageId is received for chaincode "ex04_02" on all peers

  When each organization admin approves the "ex04_02" chaincode package on "channel1" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel "channel1"
  And a user invokes on the channel "channel1" using chaincode named "ex04_02" with args ["init","Event","1"]
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the channel "channel2" using chaincode named "ex02_02" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the channel "channel1" using chaincode named "ex04_02" with args ["query","Event","ex02","a","channel2"]
  Then a user receives a success response of 1000


@daily
Scenario: FAB-13971: Test adding new org using new chaincode lifecycle
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990

  # Start update process
  When an admin adds an organization to the channel config
  # Assume channel config file is distributed out of band
  And all organization admins sign the updated channel config
  When the admin updates the channel using peer "peer0.org1.example.com"

  When an admin fetches genesis information using peer "peer0.org1.example.com"
  Then the config block file is fetched from peer "peer0.org1.example.com"
  Then the updated config block contains Org3ExampleCom

  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 980

  When the peers from the added organization are added to the network

  When an admin fetches genesis information at block 0 using peer "peer0.org3.example.com"
  When an admin makes peer "peer0.org3.example.com" join the channel
  And an admin makes peer "peer1.org3.example.com" join the channel

  When the organization admins install the chaincode package on peer "peer0.org3.example.com"
  Then a packageId is received on peer "peer0.org3.example.com"
  When the organization admins install the chaincode package on peer "peer1.org3.example.com"
  Then a packageId is received on peer "peer1.org3.example.com"

  When each organization admin approves the upgraded chaincode package with policy "OutOf(1,'org1.example.com.member','org2.example.com.member','org3.example.com.member')"

  And an admin commits the chaincode package to the channel on peer "peer0.org3.example.com"
  And I wait up to "10" seconds for the chaincode to be committed on peer "peer0.org3.example.com"
  # There is no need to invoke on an init function unless the chaincode has changed (not the definition only the chaincode).

  When a user queries on the chaincode with args ["query","a"] from "peer0.org3.example.com"
  Then a user receives a success response of 980 from "peer0.org3.example.com"

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 980
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 970

  When a user queries on the chaincode with args ["query","a"] from "peer0.org3.example.com"
  Then a user receives a success response of 970 from "peer0.org3.example.com"

  When a user invokes on the chaincode with args ["invoke","a","b","10"] on "peer0.org3.example.com"
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 960

  # now remove an org
  When an admin fetches genesis information using peer "peer0.org1.example.com"
  Then the config block file is fetched from peer "peer0.org1.example.com"
  When an admin removes an organization named Org2ExampleCom from the channel config
  And all organization admins sign the updated channel config
  When the admin updates the channel using peer "peer0.org1.example.com"

  When an admin fetches genesis information using peer "peer0.org1.example.com"
  Then the config block file is fetched from peer "peer0.org1.example.com"
  Then the updated config block does not contain Org2ExampleCom

  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 950
  When a user queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
  Then a user receives a success response of 960 from "peer0.org2.example.com"


@daily
Scenario: FAB-13959: An admin from an org does not install chaincode package
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" as version "17.0.1" with name "helloNurse"
  And the organization admins install the built "helloNurse" chaincode package on peer "peer0.org1.example.com"
  Then a packageId is received on peer "peer0.org1.example.com"
  When the organization admins install the built "helloNurse" chaincode package on peer "peer1.org1.example.com"
  Then a packageId is received on peer "peer1.org1.example.com"
  # Note install does not take place on org2 peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel on peer "peer0.org2.example.com"
  And a user invokes on the chaincode with args ["init","a","1000","b","2000"]
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
  Then a user receives a response containing "Error: endorsement failure during query. response: status:500" from "peer0.org2.example.com"
  Then a user receives a response containing 'make sure the chaincode helloNurse has been successfully instantiated and try again' from "peer0.org2.example.com"
  Then a user receives a response containing "chaincode definition for 'helloNurse' exists, but chaincode is not installed" from "peer0.org2.example.com"


@daily
Scenario: FAB-13968: Upgrade chaincode for different orgs, but committing the chaincode definition with older version of chaincode
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  And a user invokes on the chaincode with args ["init","a","1000","b","2000"]
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000


  Given the chaincode at location "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" is upgraded
  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" as version "2" with name "mycc_02"
  And the organization admins install the built "mycc_02" chaincode package on all peers
  Then a packageId is received for chaincode "mycc_02" on all peers
  When an admin removes the previous chaincode docker containers

  # Note the approval below is for the originally installed chaincode
  # Simulates the installation of an upgrade, but no one wants to use it
  #    at this time.
  When each organization admin approves the "mycc_02" chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"

  And an admin commits the "mycc" labeled chaincode package to the channel
  And a user invokes on the chaincode with args ["init","a","1000","b","2000"]
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000


@daily
Scenario: FAB-13960: Using the wrong packageID in approveformyorg
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When an admin approves the chaincode package on peer "peer0.org1.example.com" using packageId "mycc:1234567890" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  Then a user receives a response containing "Error: failed to create signed transaction: ProposalResponsePayloads do not match" from "peer0.org1.example.com"


@daily
Scenario: FAB-13961: install command with mismatched packages
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode

  And the organization admins install the built "mycc2" chaincode package on all peers
  Then a user receives a response containing 'no such file or directory' from "peer0.org1.example.com"


@daily
Scenario: FAB-13963: An admin from an org approves a different the chaincode definition
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers

  When each organization admin approves the chaincode package with policy "AND ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org2.example.com"
  And an admin commits the chaincode package to the channel with policy "AND ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  Then a user receives a response containing 'chaincode definition not agreed to by this org' from "peer0.org1.example.com"


@daily
Scenario: FAB-13965: All admins from different orgs approve different the chaincode definitions
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel named "channel1"
  When an admin sets up a channel named "channel2"

  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers

  When each organization admin approves the chaincode package on "channel1" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel "channel1"
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the channel "channel1" with args ["init","a","100","b","200"]
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the channel "channel1" with args ["query","a"]
  Then a user receives a success response of 100

  When each organization admin approves the chaincode package on "channel2" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel "channel2"
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the channel "channel2" with args ["init","a","1000","b","2000"]
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the channel "channel2" with args ["query","b"]
  Then a user receives a success response of 2000
  When a user queries on the channel "channel1" with args ["query","b"]
  Then a user receives a success response of 200

  When a user invokes on the channel "channel1" with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the channel "channel1" with args ["query","a"]
  Then a user receives a success response of 90


@daily
Scenario: FAB-13958: Test new chaincode lifecycle - upgrade from old to new
  Given I have a bootstrapped fabric network of type solo
  When an admin sets up a channel
  And an admin deploys chaincode with args ["init","a","1000","b","2000"]
  And I wait up to "10" seconds for instantiation to complete
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990

  # Upgrade the channel!!!
  Given I want to use the new chaincode lifecycle
  When an admin updates the "Application" capabilities in the channel config to version "V2_0"
  When all organization admins sign the updated channel config
  When the admin updates the channel using peer "peer0.org1.example.com"
  When an admin fetches genesis information using peer "peer0.org1.example.com"
  Then the config block file is fetched from peer "peer0.org1.example.com"
  Then the updated config block contains V2_0

  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" as version "2" with name "mycc2"
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the chaincode named "mycc2" with args ["init","a","1000","b","2000"] on both orgs
  When a user queries on the chaincode named "mycc2" with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode named "mycc2" with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode named "mycc2" with args ["query","a"]
  Then a user receives a success response of 990


@daily
Scenario: FAB-13964: Install same chaincode on different channels with different chaincode definitions
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel

  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers

  When each organization admin approves the chaincode package with policy "AND ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org2.example.com"

  When an admin commits the chaincode package to the channel with policy "AND ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  Then a user receives a response containing 'chaincode definition not agreed to by this org' from "peer0.org1.example.com"

  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on "peer0.org1.example.com"
  Then a user receives a response containing 'chaincode mycc not found' from "peer0.org1.example.com"
  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on "peer0.org2.example.com"
  Then a user receives a response containing 'chaincode mycc not found' from "peer0.org2.example.com"


@daily
Scenario: FAB-13966: Different orgs use different version label during upgrade
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  And a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000

  Given the chaincode at location "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" is upgraded
  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/example02/go/cmd" as version "2" with name "mycc_02"
  And the organization admins install the built "mycc_02" chaincode package on all peers
  Then a packageId is received for chaincode "mycc_02" on all peers
  When an admin removes the previous chaincode docker containers

  When an admin approves the "mycc" chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  And an admin approves the "mycc_02" chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org2.example.com"
  And an admin commits the chaincode package to the channel
  Then a user receives a response containing 'chaincode definition not agreed to by this org' from "peer0.org1.example.com"


@daily
Scenario: FAB-13969: Reuse the same sequence number
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  And a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000

  When an admin approves the chaincode package using sequence "1" on peer "peer0.org1.example.com"
  When an admin approves the upgraded chaincode package on peer "peer0.org2.example.com"
  When an admin commits the chaincode package to the channel
  Then a user receives a response containing 'chaincode definition not agreed to by this org' from "peer0.org1.example.com"
  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on "peer0.org1.example.com"
  Then a user receives a response containing endorsement failure during invoke


@daily
Scenario: FAB-13970: 2 Different org admins perform the commit
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  And a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete

  When an admin commits the chaincode package to the channel with policy "OR ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  When an admin commits the chaincode package to the channel with policy "OR ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org2.example.com"
  # The error here should denote the possibility that someone else has already committed this definition.
  Then a user receives a response containing 'requested sequence is 1, but new definition must be sequence 2' from "peer0.org2.example.com"


@daily
Scenario: FAB-13974: An org admin should be able to recover after sending a wrong approval
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990

  # Start update process
  When an admin adds an organization to the channel config
  # Assume channel config file is distributed out of band
  And all organization admins sign the updated channel config
  When the admin updates the channel using peer "peer0.org1.example.com"

  When an admin fetches genesis information using peer "peer0.org1.example.com"
  Then the config block file is fetched from peer "peer0.org1.example.com"
  Then the updated config block contains Org3ExampleCom

  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 980

  When the peers from the added organization are added to the network

  When an admin fetches genesis information at block 0 using peer "peer0.org3.example.com"
  When an admin makes peer "peer0.org3.example.com" join the channel
  And an admin makes peer "peer1.org3.example.com" join the channel

  When the organization admins install the chaincode package on peer "peer0.org3.example.com"
  Then a packageId is received on peer "peer0.org3.example.com"
  When the organization admins install the chaincode package on peer "peer1.org3.example.com"
  Then a packageId is received on peer "peer1.org3.example.com"

  When each organization admin approves the upgraded chaincode package with policy "AND ('org1.example.com.member','org2.example.com.member')" on peer "peer0.org1.example.com"
  When each organization admin approves the upgraded chaincode package with policy "OutOf(1,'org1.example.com.member','org2.example.com.member','org3.example.com.member')" on peer "peer0.org2.example.com"
  When each organization admin approves the upgraded chaincode package with policy "OutOf(1,'org1.example.com.member','org2.example.com.member','org3.example.com.member')" on peer "peer0.org3.example.com"

  And an admin commits the chaincode package to the channel on peer "peer0.org3.example.com"
  And I wait up to "10" seconds for the chaincode to be committed on peer "peer0.org3.example.com"

  When a user queries on the chaincode with args ["query","a"] from "peer0.org3.example.com"
  Then a user receives a success response of 980 from "peer0.org3.example.com"

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a response containing 'Error: endorsement failure during query. response: status:500 message:"make sure the chaincode mycc has been successfully instantiated and try again' from "peer0.org1.example.com"

  # All 3 orgs need to re-approve of the chaincode definition
  When each organization admin approves the upgraded chaincode package with policy "OutOf(1,'org1.example.com.member','org2.example.com.member','org3.example.com.member')"
  And an admin commits the chaincode package to the channel on peer "peer0.org1.example.com"

  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 980
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 970

  When a user queries on the chaincode with args ["query","a"] from "peer0.org3.example.com"
  Then a user receives a success response of 970 from "peer0.org3.example.com"


@daily
Scenario: FAB-13975: Different chaincode label used in install and approve
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode

  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the "test42" chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed
  And a user invokes on the chaincode with args ["init","a","1000","b","2000"]
  Then a user receives a response containing chaincode definition for 'test42' exists, but chaincode is not installed


@daily
Scenario: FAB-13977: Test setting of collections data in new chaincode definition
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo using state-database couchdb
  And I want to use the new chaincode lifecycle
  When a user defines a couchDB index named index_behave_test with design document name "indexdoc_behave_test" containing the fields "owner,docType,color" to the chaincode at path "configs/test-config"

  When an admin sets up a channel
  When an admin packages chaincode at path "github.com/hyperledger/fabric-test/chaincodes/marbles02_private" as version "2.0.1" with name "marbles"
  And the organization admins install the built "marbles" chaincode package on all peers
  Then a packageId is received on all peers

  When an admin generates a collections file named "marblesCollection.json" for chaincode named "marbles" with policy "OR('org1.example.com.member','org2.example.com.member')"
  When each organization admin approves the "marbles" chaincode package with no init using collections file named "marblesCollection.json" with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package with no init using collections file named "marblesCollection.json" to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  When a user invokes on the chaincode named "marbles" with args ["initMarble","marble1","blue","35","tom"]
  When a user invokes on the chaincode named "marbles" with args ["initMarble","marble2","red","50","tom"]
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode named "marbles" with args ["readMarble","marble1"]
  Then a user receives a response containing "name":"marble1"
  And a user receives a response containing "owner":"tom"

  When a user queries on the chaincode named "marbles" with args ["readMarble","marble2"]
  Then a user receives a response containing "name":"marble2"
  And a user receives a response containing "owner":"tom"

  # queryMarblesByOwner
  When a user queries on the chaincode named "marbles" with args ["queryMarblesByOwner","tom"]
  Then a user receives a response containing "Key":"marble1"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "owner":"tom"
  And a user receives a response containing "Key":"marble2"
  And a user receives a response containing "name":"marble2"

  # queryMarbles
  When a user queries on the chaincode named "marbles" with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\"}}"]
  Then a user receives a response containing "Key":"marble1"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "owner":"tom"
  And a user receives a response containing "Key":"marble2"
  And a user receives a response containing "name":"marble2"

  # queryMarbles on more than one selector
  When a user queries on the chaincode named "marbles" with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\",\\"color\\":\\"red\\"}}"]

  Then a user receives a response containing "Key":"marble2"
  And a user receives a response containing "name":"marble2"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "owner":"tom"
  Then a user receives a response not containing "Key":"marble1"
  And a user receives a response not containing "color":"blue"

  When a user invokes on the chaincode named "marbles" with args ["transferMarble","marble1","jerry"]
  And I wait "3" seconds
  And a user queries on the chaincode named "marbles" with args ["readMarble","marble1"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "color":"blue"
  And a user receives a response containing "size":35
  And a user receives a response containing "owner":"jerry"
  When a user invokes on the chaincode named "marbles" with args ["transferMarble","marble2","jerry"]
  And I wait "3" seconds
  And a user queries on the chaincode named "marbles" with args ["readMarble","marble2"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble2"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "size":50
  And a user receives a response containing "owner":"jerry"

  When a user queries on the chaincode named "marbles" with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\"}}"]
  Then a user receives a success response of []


@daily
Scenario: FAB-13976: Test setting of collections data using old chaincode lifecycle
  Given the FABRIC_LOGGING_SPEC environment variable is gossip.election=DEBUG
  And I have a bootstrapped fabric network of type solo using state-database couchdb
  When an admin sets up a channel
  And an admin generates a collections file named "marblesCollection.json" for chaincode named "marbles" at path "github.com/hyperledger/fabric-test/chaincodes/marbles02_private" with policy "OR('org1.example.com.member','org2.example.com.member')"
  And an admin deploys chaincode at path "github.com/hyperledger/fabric-test/chaincodes/marbles02_private" using collections config "marblesCollection.json" with args [""] with name "marbles"
  And I wait up to "30" seconds for deploy to complete

  When a user invokes on the chaincode named "marbles" with args ["initMarble","marble1","blue","35","tom"]
  When a user invokes on the chaincode named "marbles" with args ["initMarble","marble2","red","50","tom"]
  And I wait "3" seconds
  When a user queries on the chaincode named "marbles" with args ["readMarble","marble1"]
  Then a user receives a response containing "name":"marble1"
  And a user receives a response containing "owner":"tom"

  When a user queries on the chaincode named "marbles" with args ["readMarble","marble2"]
  Then a user receives a response containing "name":"marble2"
  And a user receives a response containing "owner":"tom"

  # queryMarblesByOwner
  When a user queries on the chaincode named "marbles" with args ["queryMarblesByOwner","tom"]
  Then a user receives a response containing "Key":"marble1"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "owner":"tom"
  And a user receives a response containing "Key":"marble2"
  And a user receives a response containing "name":"marble2"

  # queryMarbles
  When a user queries on the chaincode named "marbles" with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\"}}"]
  Then a user receives a response containing "Key":"marble1"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "owner":"tom"
  And a user receives a response containing "Key":"marble2"
  And a user receives a response containing "name":"marble2"

  # queryMarbles on more than one selector
  When a user queries on the chaincode named "marbles" with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\",\\"color\\":\\"red\\"}}"]

  Then a user receives a response containing "Key":"marble2"
  And a user receives a response containing "name":"marble2"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "owner":"tom"
  Then a user receives a response not containing "Key":"marble1"
  And a user receives a response not containing "color":"blue"

  When a user invokes on the chaincode named "marbles" with args ["transferMarble","marble1","jerry"]
  And I wait "3" seconds
  And a user queries on the chaincode named "marbles" with args ["readMarble","marble1"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble1"
  And a user receives a response containing "color":"blue"
  And a user receives a response containing "size":35
  And a user receives a response containing "owner":"jerry"
  When a user invokes on the chaincode named "marbles" with args ["transferMarble","marble2","jerry"]
  And I wait "3" seconds
  And a user queries on the chaincode named "marbles" with args ["readMarble","marble2"]
  Then a user receives a response containing "docType":"marble"
  And a user receives a response containing "name":"marble2"
  And a user receives a response containing "color":"red"
  And a user receives a response containing "size":50
  And a user receives a response containing "owner":"jerry"

  When a user queries on the chaincode named "marbles" with args ["queryMarbles","{\\"selector\\":{\\"owner\\":\\"tom\\"}}"]
  Then a user receives a success response of []


@daily
Scenario: FAB-14820: Test restarting a peer using the new chaincode lifecycle
  Given I changed the "Application" capability to version "V2_0"
  And I have a bootstrapped fabric network of type solo
  And I want to use the new chaincode lifecycle
  When an admin sets up a channel
  And an admin packages a chaincode
  And the organization admins install the chaincode package on all peers
  Then a packageId is received on all peers
  When each organization admin approves the chaincode package with policy "OR ('org1.example.com.member','org2.example.com.member')"
  And an admin commits the chaincode package to the channel
  And I wait up to "10" seconds for the chaincode to be committed

  When a user invokes on the chaincode with args ["init","a","1000","b","2000"] on both orgs
  And I wait up to "30" seconds for deploy to complete
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 1000
  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 990

  When "peer0.org2.example.com" is taken down
  When an admin removes the previous chaincode docker containers

  When a user invokes on the chaincode with args ["invoke","a","b","10"]
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"]
  Then a user receives a success response of 980

  When "peer0.org2.example.com" comes back up

  And I wait "5" seconds
  When a user invokes on the chaincode with args ["invoke","a","b","10"] on "peer0.org2.example.com"
  And I wait "5" seconds
  When a user queries on the chaincode with args ["query","a"] from "peer0.org2.example.com"
  Then a user receives a success response of 970 from "peer0.org2.example.com"
