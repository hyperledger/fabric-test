# Copyright IBM Corp. 2016 All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Test Bootstrap function
#
# Tags that can be used and will affect test internals:
#  @doNotDecompose will NOT decompose the named compose_yaml after scenario ends.  Useful for setting up environment and reviewing after scenario.
#
#  @generateDocs will generate documentation for the scenario that can be used for both verification and comprehension.
#


@safe_asset_transfer
Feature: Safe Asset Transfer
  As a blockchain user
  I want to bootstrap a new blockchain network and demonstrate safe asset transfer


  #######################
  #
  #  1. Bob (or Alice) creates channel-1
  #  2. Bob joins channel-1.
  #  3. Alice joins channel-1.
  #  4. Alice (or Bob) instantiates chaincode "asset-transfer" in channel-1 with endorsement policy "BobOrg AND AliceOrg".
  #  5. Bob creates foo.
  #  6. Bob transfers foo to Alice.
  #  7. Carol (or Alice) creates channel-2.
  #  8. Alice joins channel-2.
  #  9. Dan (escrow) joins channel-1.
  #  10. Dan joins channel-2.
  #  Everyone installs again with updated version 1.1
  #  then send new 'upgrade' (exactly the same as instantiate) with new policy
  #  11. In channel-1, Alice updates chaincode by modifying endorsement policy to "DanOrg AND (BobOrg OR AliceOrg)".
  #  12. In channel-2, Alice instantiates chaincode "asset-transfer" with endorsement policy "DanOrg AND (CarolOrg OR AliceOrg)".
  #  13. In channel-1, Alice locks foo to channel-2.
  #  14. In channel-2, Dan (or Alice) shows foo from channel-1.
  #  15. In channel-2, Alice transfers foo to Carol.

  @doNotDecompose
  @generateDocs
  Scenario Outline: Bootstrap a development network with 4 peers (2 orgs)  and 1 orderer (1 org), each having a single independent root of trust (No fabric-ca, just openssl)
    #creates 1 self-signed key/cert pair per orderer organization
    Given the orderer network has organizations:
      | Organization | Readers | Writers | Admins |
      | ordererOrg0  | member  | member  | admin  |
      | ordererOrg1  | member  | member  | admin  |

    And user requests role of orderer admin by creating a key and csr for orderer and acquires signed certificate from organization:
      | User                   | Orderer     | Organization | AliasSavedUnder   |
      | orderer0Signer         | orderer0    | ordererOrg0  |                   |
      | orderer1Signer         | orderer1    | ordererOrg0  |                   |
      | orderer2Signer         | orderer2    | ordererOrg1  |                   |
      | orderer0Admin          | orderer0    | ordererOrg0  |                   |
      | orderer1Admin          | orderer1    | ordererOrg0  |                   |
      | orderer2Admin          | orderer2    | ordererOrg1  |                   |
      | configAdminOrdererOrg0 | configAdmin | ordererOrg0  | config-admin-cert |
      | configAdminOrdererOrg1 | configAdmin | ordererOrg1  | config-admin-cert |


    # Rolenames : MspPrincipal.proto
    And the peer network has organizations:
      | Organization | Readers | Writers | Admins |
      | bobOrg       | member  | member  | admin  |
      | aliceOrg     | member  | member  | admin  |
      | carolOrg     | member  | member  | admin  |
      | danOrg       | member  | member  | admin  |



    And a ordererBootstrapAdmin is identified and given access to all public certificates and orderer node info

    And the ordererBootstrapAdmin creates a cert alias "bootstrapCertAlias" for orderer network bootstrap purposes for organizations
      | Organization |
      | ordererOrg0  |

    And the ordererBootstrapAdmin generates a GUUID to identify the orderer system chain and refer to it by name as "ordererSystemChannelId"

    # We now have an orderer network with NO peers.  Now need to configure and start the peer network
    # This can be currently automated through folder creation of the proper form and placing PEMs.
    And user requests role for peer by creating a key and csr for peer and acquires signed certificate from organization:
      | User                | Peer        | Organization | AliasSavedUnder   |
      | peer0Signer         | peer0       | bobOrg       |                   |
      | peer1Signer         | peer1       | bobOrg       |                   |
      | peer2Signer         | peer2       | aliceOrg     |                   |
      | peer3Signer         | peer3       | aliceOrg     |                   |
      | peer4Signer         | peer4       | danOrg       |                   |
      | peer5Signer         | peer5       | danOrg       |                   |
      | peer6Signer         | peer6       | carolOrg     |                   |
      | peer7Signer         | peer7       | carolOrg     |                   |
      | peer0Admin          | peer0       | bobOrg       | peer-admin-cert   |
      | peer1Admin          | peer1       | bobOrg       | peer-admin-cert   |
      | peer2Admin          | peer2       | aliceOrg     | peer-admin-cert   |
      | peer3Admin          | peer3       | aliceOrg     | peer-admin-cert   |
      | peer4Admin          | peer4       | danOrg       | peer-admin-cert   |
      | peer5Admin          | peer5       | danOrg       | peer-admin-cert   |
      | peer6Admin          | peer6       | carolOrg     | peer-admin-cert   |
      | peer7Admin          | peer7       | carolOrg     | peer-admin-cert   |
      | configAdminBobOrg   | configAdmin | bobOrg       | config-admin-cert |
      | configAdminAliceOrg | configAdmin | aliceOrg     | config-admin-cert |
      | configAdminDanOrg   | configAdmin | danOrg       | config-admin-cert |
      | configAdminCarolOrg | configAdmin | carolOrg     | config-admin-cert |
      | composer0Signer     | admin       | bobOrg       |                   |
      | composer1Signer     | admin       | aliceOrg     |                   |

    # Order info includes orderer admin/orderer information and address (host:port) from previous steps
    # Only the peer organizations can vary.
    And the ordererBootstrapAdmin using cert alias "bootstrapCertAlias" creates the genesis block "ordererGenesisBlock" for chain "ordererSystemChannelId" for composition "<ComposeFile>" and consensus "<ConsensusType>" with consortiums modification policy "/Channel/Orderer/Admins" using consortiums:
      | Consortium |
#      | consortium1 |


    And the orderer admins inspect and approve the genesis block for chain "ordererSystemChannelId"

    # to be used for setting the orderer genesis block path parameter in composition
    And the orderer admins use the genesis block for chain "ordererSystemChannelId" to configure orderers

    And we compose "<ComposeFile>"

#    And I stop

    # Sleep as to allow system up time
    And I wait "<SystemUpWaitTime>" seconds

    Given user "ordererBootstrapAdmin" gives "ordererSystemChannelId" to user "configAdminOrdererOrg0" who saves it as "ordererSystemChannelId"
    And user "ordererBootstrapAdmin" gives "ordererGenesisBlock" to user "configAdminOrdererOrg0" who saves it as "ordererGenesisBlock"

    And the orderer config admin "configAdminOrdererOrg0" creates a consortium "consortium1" with modification policy "/Channel/Orderer/Admins" for peer orgs who wish to form a network:
      | Organization |
      | bobOrg       |
      | aliceOrg     |
      | carolOrg     |


    And user "configAdminOrdererOrg0" using cert alias "config-admin-cert" connects to deliver function on orderer "<orderer0>"

    And user "configAdminOrdererOrg0" retrieves the latest config block "latestOrdererConfig" from orderer "<orderer0>" for channel "{ordererSystemChannelId}"

    And the orderer config admin "configAdminOrdererOrg0" creates a consortiums config update "consortiumsConfigUpdate1" using config "latestOrdererConfig" using orderer system channel ID "ordererSystemChannelId" to add consortiums:
      | Consortium  |
      | consortium1 |

    And the user "configAdminOrdererOrg0" creates a configUpdateEnvelope "consortiumsConfigUpdate1Envelope" using configUpdate "consortiumsConfigUpdate1"

    And the user "configAdminOrdererOrg0" collects signatures for ConfigUpdateEnvelope "consortiumsConfigUpdate1Envelope" from developers:
      | Developer              | Cert Alias        |
      | configAdminOrdererOrg0 | config-admin-cert |
      | configAdminOrdererOrg1 | config-admin-cert |

    And the user "configAdminOrdererOrg0" creates a ConfigUpdate Tx "consortiumsConfigUpdateTx1" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "consortiumsConfigUpdate1Envelope"

    And the user "configAdminOrdererOrg0" using cert alias "config-admin-cert" broadcasts ConfigUpdate Tx "consortiumsConfigUpdateTx1" to orderer "<orderer0>"


    Given the following application developers are defined for peer organizations and each saves their cert as alias
      | Developer | Consortium  | Organization | AliasSavedUnder  |
      | bob       | consortium1 | bobOrg       | consortium1-cert |
      | alice     | consortium1 | aliceOrg     | consortium1-cert |
      | carol     | consortium1 | carolOrg     | consortium1-cert |
      | dan       | consortium1 | danOrg       | consortium1-cert |


    And user "configAdminOrdererOrg0" gives "consortium1" to user "bob" who saves it as "consortium1"

    And user "configAdminOrdererOrg0" gives "consortium1" to user "alice" who saves it as "consortium1"

    And the user "bob" creates a peer organization set "peerOrgSet1" with peer organizations:
      | Organization |
      | bobOrg       |
      | aliceOrg     |
#      |  carolOrg     |

    And the user "bob" creates an peer anchor set "anchors1" for orgs:
      | User        | Peer  | Organization |
      | peer0Signer | peer0 | bobOrg       |
      | peer2Signer | peer2 | aliceOrg     |

    # Entry point for creating a channel
    And the user "bob" creates a new channel ConfigUpdate "createChannelConfigUpdate1" using consortium "consortium1"
      | ChannelID                         | PeerOrgSet  | [PeerAnchorSet] |
      | com.acme.blockchain.jdoe.channel1 | peerOrgSet1 |                 |

    And the user "bob" creates a configUpdateEnvelope "createChannelConfigUpdate1Envelope" using configUpdate "createChannelConfigUpdate1"


    And the user "bob" collects signatures for ConfigUpdateEnvelope "createChannelConfigUpdate1Envelope" from developers:
      | Developer | Cert Alias       |
      | bob       | consortium1-cert |
      | alice     | consortium1-cert |

    And the user "bob" creates a ConfigUpdate Tx "configUpdateTx1" using cert alias "consortium1-cert" using signed ConfigUpdateEnvelope "createChannelConfigUpdate1Envelope"

    And the user "bob" using cert alias "consortium1-cert" broadcasts ConfigUpdate Tx "configUpdateTx1" to orderer "<orderer0>"

    # Sleep as the local orderer needs to bring up the resources that correspond to the new channel
    # For the Kafka orderer, this includes setting up a producer and consumer for the channel's partition
    # Requesting a deliver earlier may result in a SERVICE_UNAVAILABLE response and a connection drop
    And I wait "<ChannelJoinDelay>" seconds

    When user "bob" using cert alias "consortium1-cert" connects to deliver function on orderer "<orderer0>"
    And user "bob" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 0     | 0   |

    Then user "bob" should get a delivery "genesisBlockForChannel1" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    Given user "bob" gives "genesisBlockForChannel1" to user "alice" who saves it as "genesisBlockForChannel1"

    Given user "bob" gives "genesisBlockForChannel1" to user "peer0Admin" who saves it as "genesisBlockForChannel1"
    Given user "bob" gives "genesisBlockForChannel1" to user "peer1Admin" who saves it as "genesisBlockForChannel1"


    # This is entry point for joining an existing channel
    When user "peer0Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel1" on peers with result "joinChannel1Result"
      | Peer  |
      | peer0 |

    Then user "peer0Admin" expects result code for "joinChannel1Result" of "200" from peers:
      | Peer  |
      | peer0 |

    When user "peer1Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel1" on peers with result "joinChannel1Result"
      | Peer  |
      | peer1 |

    Then user "peer1Admin" expects result code for "joinChannel1Result" of "200" from peers:
      | Peer  |
      | peer1 |


    Given the user "configAdminBobOrg" creates an peer anchor set "anchors1" for orgs:
      | User        | Peer  | Organization |
      | peer0Signer | peer0 | bobOrg       |

    And user "configAdminBobOrg" using cert alias "config-admin-cert" connects to deliver function on orderer "<orderer0>"

    And user "configAdminBobOrg" retrieves the latest config block "latestChannelConfigUpdate" from orderer "<orderer0>" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "configAdminBobOrg" creates an existing channel config update "existingChannelConfigUpdate1" using config update "latestChannelConfigUpdate"
      | ChannelID                         | [PeerAnchorSet] |
      | com.acme.blockchain.jdoe.channel1 | anchors1        |






    Given the user "configAdminBobOrg" creates a configUpdateEnvelope "existingChannelConfigUpdate1Envelope" using configUpdate "existingChannelConfigUpdate1"


    And the user "configAdminBobOrg" collects signatures for ConfigUpdateEnvelope "existingChannelConfigUpdate1Envelope" from developers:
      | Developer         | Cert Alias        |
      | configAdminBobOrg | config-admin-cert |

    And the user "configAdminBobOrg" creates a ConfigUpdate Tx "existingChannelConfigUpdateTx1" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "existingChannelConfigUpdate1Envelope"


    When the user "configAdminBobOrg" broadcasts transaction "existingChannelConfigUpdateTx1" to orderer "<orderer0>"

    And I wait "<BroadcastWaitTime>" seconds

    And user "configAdminBobOrg" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 1     | 1   |

    Then user "configAdminBobOrg" should get a delivery "deliveredExistingChannelConfigUpdateTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds


#    And I quit

    Given user "alice" gives "genesisBlockForChannel1" to user "peer2Admin" who saves it as "genesisBlockForChannel1"
    Given user "alice" gives "genesisBlockForChannel1" to user "peer3Admin" who saves it as "genesisBlockForChannel1"

    When user "peer2Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel1" on peers with result "joinChannel1Result"
      | Peer  |
      | peer2 |

    Then user "peer2Admin" expects result code for "joinChannel1Result" of "200" from peers:
      | Peer  |
      | peer2 |

    When user "peer3Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel1" on peers with result "joinChannel1Result"
      | Peer  |
      | peer3 |

    Then user "peer3Admin" expects result code for "joinChannel1Result" of "200" from peers:
      | Peer  |
      | peer3 |

      # Uncomment this if you wish to stop with just a channel created and joined on all peers
#      And we stop

    Given the user "configAdminAliceOrg" creates an peer anchor set "anchors1" for orgs:
      | User        | Peer  | Organization |
      | peer2Signer | peer2 | aliceOrg     |


    # Entry point for invoking on an existing channel
    When user "bob" creates a chaincode spec "ccSpecV1.0" with name "asset-transfer" and version "1.0" of type "GOLANG" for chaincode "github.com/hyperledger/fabric/examples/chaincode/go/safe_asset_transfer" with args
      | funcName |
      | init     |

    Given user "bob" gives "ccSpecV1.0" to user "peer0Admin" who saves it as "ccSpecV1.0"
    And user "bob" gives "ccSpecV1.0" to user "alice" who saves it as "ccSpecV1.0"

    # TODO: Will soon need to collect signatures (owners) and create a SignedChaincodeDeploymentSpec which will supplant the payload for installProposal.

    # Under the covers, create a deployment spec, etc.
    When user "peer0Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposal1" using chaincode spec "ccSpecV1.0"

    And user "peer0Admin" using cert alias "peer-admin-cert" sends proposal "installProposal1" to endorsers with timeout of "90" seconds with proposal responses "installProposalResponses":
      | Endorser |
      | peer0    |

    Then user "peer0Admin" expects proposal responses "installProposalResponses" with status "200" from endorsers:
      | Endorser |
      | peer0    |

    Given user "alice" gives "ccSpecV1.0" to user "peer2Admin" who saves it as "ccSpecV1.0"

    # Under the covers, create a deployment spec, etc.
    When user "peer2Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposal1" using chaincode spec "ccSpecV1.0"

    And user "peer2Admin" using cert alias "peer-admin-cert" sends proposal "installProposal1" to endorsers with timeout of "90" seconds with proposal responses "installProposalResponses":
      | Endorser |
      | peer2    |

    Then user "peer2Admin" expects proposal responses "installProposalResponses" with status "200" from endorsers:
      | Endorser |
      | peer2    |


    #######################################################
    #
    # Instantiation of the chaincode
    #
    #######################################################
    Given user "peer0Admin" gives "ccSpecV1.0" to user "configAdminBobOrg" who saves it as "ccSpecV1.0"

    And user "configAdminBobOrg" creates a signature policy envelope "signedByMemberOfBobOrgAndAliceOrg" using "envelope(n_out_of(2,[signed_by(0),signed_by(1)]),[member('bobOrg'), member('aliceOrg')])"

    When user "configAdminBobOrg" using cert alias "config-admin-cert" creates a instantiate proposal "instantiateProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "ccSpecV1.0" and endorsement policy "signedByMemberOfBobOrgAndAliceOrg"

    And user "configAdminBobOrg" using cert alias "config-admin-cert" sends proposal "instantiateProposal1" to endorsers with timeout of "90" seconds with proposal responses "instantiateProposalResponses":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "configAdminBobOrg" expects proposal responses "instantiateProposalResponses" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "configAdminBobOrg" expects proposal responses "instantiateProposalResponses" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "configAdminBobOrg" creates transaction "instantiateTx1" from proposal "instantiateProposal1" and proposal responses "instantiateProposalResponses" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "configAdminBobOrg" broadcasts transaction "instantiateTx1" to orderer "<orderer1>"

    # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "configAdminBobOrg" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 2     | 2   |

    Then user "configAdminBobOrg" should get a delivery "deliveredInstantiateTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    # Sleep to allow for chaincode instantiation on the peer
    And I wait "5" seconds




    #######################################################
    #
    # Bob creates the asset
    #
    #######################################################
    When user "bob" creates a chaincode invocation spec "invocationSpec1" using spec "ccSpecV1.0" with input:
      | funcName | arg1   |
      | create   | asset1 |

    And user "bob" using cert alias "consortium1-cert" creates a proposal "invokeProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpec1"

    And user "bob" using cert alias "consortium1-cert" sends proposal "invokeProposal1" to endorsers with timeout of "30" seconds with proposal responses "invokeProposal1Responses":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "bob" expects proposal responses "invokeProposal1Responses" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "bob" expects proposal responses "invokeProposal1Responses" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "bob" creates transaction "invokeTx1" from proposal "invokeProposal1" and proposal responses "invokeProposal1Responses" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "bob" broadcasts transaction "invokeTx1" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "bob" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 3     | 3   |

    Then user "bob" should get a delivery "deliveredInvokeTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds





    #######################################################
    #
    # Bob transfers the asset to alice
    #
    #######################################################
    Given user "alice" creates a serialized identity "serializedIdentityForConsortium1Cert" using cert alias "consortium1-cert"
    And user "alice" gives "serializedIdentityForConsortium1Cert" to user "bob" who saves it as "serializedIdentityForAlice"
    And user "bob" invokes "SerializeToString()" on "serializedIdentityForAlice" saving result as "serializedIdentityForAliceAsBytes"

    When user "bob" creates a chaincode invocation spec "transferInvocationSpec1" using spec "ccSpecV1.0" with input:
      | funcName | arg1   | arg2                                |
      | transfer | asset1 | {serializedIdentityForAliceAsBytes} |

    And user "bob" using cert alias "consortium1-cert" creates a proposal "transferProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "transferInvocationSpec1"

    And user "bob" using cert alias "consortium1-cert" sends proposal "transferProposal1" to endorsers with timeout of "30" seconds with proposal responses "transferProposal1Responses":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "bob" expects proposal responses "transferProposal1Responses" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "bob" expects proposal responses "transferProposal1Responses" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "bob" creates transaction "transferTx1" from proposal "transferProposal1" and proposal responses "transferProposal1Responses" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "bob" broadcasts transaction "transferTx1" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "bob" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 4     | 4   |

    Then user "bob" should get a delivery "deliveredtransferTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds





    #######################################################
    #
    # Alice creates channel1
    #
    #######################################################
    Given the user "alice" creates a peer organization set "peerOrgSet2" with peer organizations:
      | Organization |
      | aliceOrg     |
      | carolOrg     |

    And the user "alice" creates a new channel ConfigUpdate "createChannel2ConfigUpdate" using consortium "consortium1"
      | ChannelID                         | PeerOrgSet  | [PeerAnchorSet] |
      | com.acme.blockchain.jdoe.channel2 | peerOrgSet2 |                 |

    And the user "alice" creates a configUpdateEnvelope "createChannel2ConfigUpdateEnvelope" using configUpdate "createChannel2ConfigUpdate"

    And the user "alice" collects signatures for ConfigUpdateEnvelope "createChannel2ConfigUpdateEnvelope" from developers:
      | Developer | Cert Alias       |
      | alice     | consortium1-cert |
      | carol     | consortium1-cert |

    And the user "alice" creates a ConfigUpdate Tx "configUpdateTx1" using cert alias "consortium1-cert" using signed ConfigUpdateEnvelope "createChannel2ConfigUpdateEnvelope"

    And the user "alice" using cert alias "consortium1-cert" broadcasts ConfigUpdate Tx "configUpdateTx1" to orderer "<orderer0>"

    # Sleep as the local orderer needs to bring up the resources that correspond to the new channel
    # For the Kafka orderer, this includes setting up a producer and consumer for the channel's partition
    # Requesting a deliver earlier may result in a SERVICE_UNAVAILABLE response and a connection drop
    And I wait "<ChannelJoinDelay>" seconds

    When user "alice" using cert alias "consortium1-cert" connects to deliver function on orderer "<orderer0>"
    And user "alice" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel2 | 0     | 0   |

    Then user "alice" should get a delivery "genesisBlockForChannel2" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds



    #######################################################
    #
    # Alice joins channel2 on her peers
    #
    #######################################################
    Given user "alice" gives "genesisBlockForChannel2" to user "peer2Admin" who saves it as "genesisBlockForChannel2"
    Given user "alice" gives "genesisBlockForChannel2" to user "peer3Admin" who saves it as "genesisBlockForChannel2"

    When user "peer2Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel2" on peers with result "joinChannel2Result"
      | Peer  |
      | peer2 |

    Then user "peer2Admin" expects result code for "joinChannel2Result" of "200" from peers:
      | Peer  |
      | peer2 |

    When user "peer3Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel2" on peers with result "joinChannel2Result"
      | Peer  |
      | peer3 |

    Then user "peer3Admin" expects result code for "joinChannel2Result" of "200" from peers:
      | Peer  |
      | peer3 |



    #######################################################
    #
    # Carol joins channel2 on her peers
    #
    #######################################################
    Given user "alice" gives "genesisBlockForChannel2" to user "carol" who saves it as "genesisBlockForChannel2"
    Given user "carol" gives "genesisBlockForChannel2" to user "peer6Admin" who saves it as "genesisBlockForChannel2"
    Given user "carol" gives "genesisBlockForChannel2" to user "peer7Admin" who saves it as "genesisBlockForChannel2"

    When user "peer6Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel2" on peers with result "joinChannel2Result"
      | Peer  |
      | peer6 |

    Then user "peer6Admin" expects result code for "joinChannel2Result" of "200" from peers:
      | Peer  |
      | peer6 |

    When user "peer7Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel2" on peers with result "joinChannel2Result"
      | Peer  |
      | peer7 |

    Then user "peer7Admin" expects result code for "joinChannel2Result" of "200" from peers:
      | Peer  |
      | peer7 |




    #######################################################
    #
    # Now add danOrg to both channels
    #
    #######################################################
    When the user "configAdminBobOrg" using cert alias "config-admin-cert" adds organization "danOrg" to channel "com.acme.blockchain.jdoe.channel1" using orderer "orderer0" collecting signatures from:
      | User                | Cert Alias        |
      | configAdminBobOrg   | config-admin-cert |
      | configAdminAliceOrg | config-admin-cert |

    And I wait "<BroadcastWaitTime>" seconds

    And user "configAdminBobOrg" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 5     | 5   |

    Then user "configAdminBobOrg" should get a delivery "deliveredAddDanOrgToChannel1ConfigUpdateTxBlock" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds



    Given user "configAdminAliceOrg" using cert alias "config-admin-cert" connects to deliver function on orderer "<orderer0>"

    When the user "configAdminAliceOrg" using cert alias "config-admin-cert" adds organization "danOrg" to channel "com.acme.blockchain.jdoe.channel2" using orderer "orderer0" collecting signatures from:
      | User                | Cert Alias        |
      | configAdminAliceOrg | config-admin-cert |
      | configAdminCarolOrg | config-admin-cert |

    And I wait "<BroadcastWaitTime>" seconds

    And user "configAdminAliceOrg" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel2 | 1     | 1   |

    Then user "configAdminAliceOrg" should get a delivery "deliveredAddDanOrgToChannel2ConfigUpdateTxBlock" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds




    #######################################################
    #
    # Now have Dan join channel1 and channel2 on his peers
    #
    #######################################################
    Given user "alice" gives "genesisBlockForChannel1" to user "dan" who saves it as "genesisBlockForChannel1"
    And user "dan" gives "genesisBlockForChannel1" to user "peer4Admin" who saves it as "genesisBlockForChannel1"
    And user "dan" gives "genesisBlockForChannel1" to user "peer5Admin" who saves it as "genesisBlockForChannel1"

    When user "peer4Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel1" on peers with result "joinChannel1Result"
      | Peer  |
      | peer4 |

    Then user "peer4Admin" expects result code for "joinChannel1Result" of "200" from peers:
      | Peer  |
      | peer4 |

    When user "peer5Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel1" on peers with result "joinChannel1Result"
      | Peer  |
      | peer5 |

    Then user "peer5Admin" expects result code for "joinChannel1Result" of "200" from peers:
      | Peer  |
      | peer5 |


    Given user "alice" gives "genesisBlockForChannel2" to user "dan" who saves it as "genesisBlockForChannel2"
    And user "dan" gives "genesisBlockForChannel2" to user "peer4Admin" who saves it as "genesisBlockForChannel2"
    And user "dan" gives "genesisBlockForChannel2" to user "peer5Admin" who saves it as "genesisBlockForChannel2"

    When user "peer4Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel2" on peers with result "joinChannel2Result"
      | Peer  |
      | peer4 |

    Then user "peer4Admin" expects result code for "joinChannel2Result" of "200" from peers:
      | Peer  |
      | peer4 |

    When user "peer5Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForChannel2" on peers with result "joinChannel2Result"
      | Peer  |
      | peer5 |

    Then user "peer5Admin" expects result code for "joinChannel2Result" of "200" from peers:
      | Peer  |
      | peer5 |

    Given I wait "<ChannelJoinDelay>" seconds


    #######################################################
    #
    # Now Alice creates a new version of chaincode in preperation for endorsement policy change and installs on her peers
    #
    #######################################################
    When user "alice" creates a chaincode spec "ccSpecV1.1" with name "asset-transfer" and version "1.1" of type "GOLANG" for chaincode "github.com/hyperledger/fabric/examples/chaincode/go/safe_asset_transfer" with args
      | funcName |
      | init     |

    Given user "alice" gives "ccSpecV1.1" to user "peer2Admin" who saves it as "ccSpecV1.1"

    When user "peer2Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposalV1.1" using chaincode spec "ccSpecV1.1"

    And user "peer2Admin" using cert alias "peer-admin-cert" sends proposal "installProposalV1.1" to endorsers with timeout of "90" seconds with proposal responses "installProposalV1.1Responses":
      | Endorser |
      | peer2    |

    Then user "peer2Admin" expects proposal responses "installProposalV1.1Responses" with status "200" from endorsers:
      | Endorser |
      | peer2    |


    #######################################################
    #
    # Now have Bob installs the new version of the chaincode on his peers
    #
    #######################################################
    Given user "alice" gives "ccSpecV1.1" to user "bob" who saves it as "ccSpecV1.1"
    And user "bob" gives "ccSpecV1.1" to user "peer0Admin" who saves it as "ccSpecV1.1"

    When user "peer0Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposalV1.1" using chaincode spec "ccSpecV1.1"

    And user "peer0Admin" using cert alias "peer-admin-cert" sends proposal "installProposalV1.1" to endorsers with timeout of "90" seconds with proposal responses "installProposalV1.1Responses":
      | Endorser |
      | peer0    |

    Then user "peer0Admin" expects proposal responses "installProposalV1.1Responses" with status "200" from endorsers:
      | Endorser |
      | peer0    |

    #######################################################
    #
    # Now have Dan installs the chaincode on his peers
    #
    #######################################################
    Given user "alice" gives "ccSpecV1.1" to user "dan" who saves it as "ccSpecV1.1"
    And user "dan" gives "ccSpecV1.1" to user "peer4Admin" who saves it as "ccSpecV1.1"
    And user "dan" gives "ccSpecV1.1" to user "peer5Admin" who saves it as "ccSpecV1.1"

    When user "peer4Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposalV1.1" using chaincode spec "ccSpecV1.1"

    And user "peer4Admin" using cert alias "peer-admin-cert" sends proposal "installProposalV1.1" to endorsers with timeout of "90" seconds with proposal responses "installProposalV1.1Responses":
      | Endorser |
      | peer4    |

    Then user "peer4Admin" expects proposal responses "installProposalV1.1Responses" with status "200" from endorsers:
      | Endorser |
      | peer4    |

    When user "peer5Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposalV1.1" using chaincode spec "ccSpecV1.1"

    And user "peer5Admin" using cert alias "peer-admin-cert" sends proposal "installProposalV1.1" to endorsers with timeout of "90" seconds with proposal responses "installProposalV1.1Responses":
      | Endorser |
      | peer5    |

    Then user "peer5Admin" expects proposal responses "installProposalV1.1Responses" with status "200" from endorsers:
      | Endorser |
      | peer5    |


    #######################################################
    #
    # Now have Carol installs the new version of the chaincode on her peers
    #
    #######################################################
    Given user "alice" gives "ccSpecV1.1" to user "carol" who saves it as "ccSpecV1.1"
    And user "carol" gives "ccSpecV1.1" to user "peer6Admin" who saves it as "ccSpecV1.1"

    When user "peer6Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposalV1.1" using chaincode spec "ccSpecV1.1"

    And user "peer6Admin" using cert alias "peer-admin-cert" sends proposal "installProposalV1.1" to endorsers with timeout of "90" seconds with proposal responses "installProposalV1.1Responses":
      | Endorser |
      | peer6    |

    Then user "peer6Admin" expects proposal responses "installProposalV1.1Responses" with status "200" from endorsers:
      | Endorser |
      | peer6    |



    #######################################################
    #
    # In channel-1, Alice updates chaincode by modifying endorsement policy to "DanOrg AND (BobOrg OR AliceOrg)"
    #
    #######################################################
    Given user "alice" creates a signature policy envelope "signedByMemberDanOrgAnd(BobOrgOrAliceOrg)" using "envelope(n_out_of(2,[signed_by(0),n_out_of(1,[signed_by(1),signed_by(2)])]),[member('danOrg'),member('bobOrg'), member('aliceOrg')])"
    And user "alice" gives "signedByMemberDanOrgAnd(BobOrgOrAliceOrg)" to user "configAdminAliceOrg" who saves it as "signedByMemberDanOrgAnd(BobOrgOrAliceOrg)"
    And user "alice" gives "ccSpecV1.1" to user "configAdminAliceOrg" who saves it as "ccSpecV1.1"

    When user "configAdminAliceOrg" using cert alias "config-admin-cert" creates an upgrade proposal "upgradeProposalChannel1V1.1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "ccSpecV1.1" and endorsement policy "signedByMemberDanOrgAnd(BobOrgOrAliceOrg)"

    And user "configAdminAliceOrg" using cert alias "config-admin-cert" sends proposal "upgradeProposalChannel1V1.1" to endorsers with timeout of "90" seconds with proposal responses "upgradeProposalResonsesChannel1V1.1":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "configAdminAliceOrg" expects proposal responses "upgradeProposalResonsesChannel1V1.1" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "configAdminAliceOrg" expects proposal responses "upgradeProposalResonsesChannel1V1.1" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |


    When the user "configAdminAliceOrg" creates transaction "upgradeTxChannel1V1.1" from proposal "upgradeProposalChannel1V1.1" and proposal responses "upgradeProposalResonsesChannel1V1.1" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "configAdminAliceOrg" broadcasts transaction "upgradeTxChannel1V1.1" to orderer "<orderer0>"

    # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "configAdminAliceOrg" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 6     | 6   |

    Then user "configAdminAliceOrg" should get a delivery "deliveredUpgradeTxChannel1V1.1" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    # Sleep to allow for chaincode instantiation on the peer
    And I wait "5" seconds




    #######################################################
    #
    # In channel-2, Alice instantiates chaincode "asset-transfer" with endorsement policy "DanOrg AND (CarolOrg OR AliceOrg)"
    #
    #######################################################
    Given user "alice" creates a signature policy envelope "signedByMemberDanOrgAnd(CarolOrgOrAliceOrg)" using "envelope(n_out_of(2,[signed_by(0),n_out_of(1,[signed_by(1),signed_by(2)])]),[member('danOrg'),member('carolOrg'), member('aliceOrg')])"
    And user "alice" gives "signedByMemberDanOrgAnd(CarolOrgOrAliceOrg)" to user "configAdminAliceOrg" who saves it as "signedByMemberDanOrgAnd(CarolOrgOrAliceOrg)"

    When user "configAdminAliceOrg" using cert alias "config-admin-cert" creates a instantiate proposal "instantiateProposalChannel2V1.1" for channel "com.acme.blockchain.jdoe.channel2" using chaincode spec "ccSpecV1.1" and endorsement policy "signedByMemberDanOrgAnd(CarolOrgOrAliceOrg)"

    And user "configAdminAliceOrg" using cert alias "config-admin-cert" sends proposal "instantiateProposalChannel2V1.1" to endorsers with timeout of "90" seconds with proposal responses "instantiateProposalResponsesChannel2V1.1":
      | Endorser |
      | peer2    |
      | peer6    |

    Then user "configAdminAliceOrg" expects proposal responses "instantiateProposalResponsesChannel2V1.1" with status "200" from endorsers:
      | Endorser |
      | peer2    |
      | peer6    |

    And user "configAdminAliceOrg" expects proposal responses "instantiateProposalResponsesChannel2V1.1" each have the same value from endorsers:
      | Endorser |
      | peer2    |
      | peer6    |

    When the user "configAdminAliceOrg" creates transaction "instantiateTxChannel2V1.1" from proposal "instantiateProposalChannel2V1.1" and proposal responses "instantiateProposalResponsesChannel2V1.1" for channel "com.acme.blockchain.jdoe.channel2"

    And the user "configAdminAliceOrg" broadcasts transaction "instantiateTxChannel2V1.1" to orderer "<orderer1>"

    # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "configAdminAliceOrg" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel2 | 2     | 2   |

    Then user "configAdminAliceOrg" should get a delivery "deliveredInstantiateTxChannel2V1.1" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    # Sleep to allow for chaincode instantiation on the peer
    And I wait "5" seconds





    #######################################################
    #
    # In channel-1, Alice locks foo to channel-2
    #
    #######################################################
    When user "alice" creates a chaincode invocation spec "lockInvocationSpec1" using spec "ccSpecV1.1" with input:
      | funcName | arg1   | arg2                              |
      | lock     | asset1 | com.acme.blockchain.jdoe.channel2 |

    And user "alice" using cert alias "consortium1-cert" creates a proposal "lockProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "lockInvocationSpec1"

    And user "alice" using cert alias "consortium1-cert" sends proposal "lockProposal1" to endorsers with timeout of "30" seconds with proposal responses "lockProposal1Responses":
      | Endorser |
      | peer0    |
      | peer2    |
      | peer4    |

    Then user "alice" expects proposal responses "lockProposal1Responses" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
      | peer4    |

    And user "alice" expects proposal responses "lockProposal1Responses" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
      | peer4    |

    When the user "alice" creates transaction "lockTx1" from proposal "lockProposal1" and proposal responses "lockProposal1Responses" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "alice" broadcasts transaction "lockTx1" to orderer "<orderer0>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "alice" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 7     | 7   |

    Then user "alice" should get a delivery "deliveredLockTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds



    #######################################################
    #
    #  In channel-2, Dan (or Alice) shows foo from channel-1
    #
    #######################################################
    When user "alice" creates a chaincode invocation spec "showInvocationSpec1" using spec "ccSpecV1.1" with input:
      | funcName | arg1   | arg2                              |
      | show     | asset1 | com.acme.blockchain.jdoe.channel1 |

    And user "alice" using cert alias "consortium1-cert" creates a proposal "showProposal1" for channel "com.acme.blockchain.jdoe.channel2" using chaincode spec "showInvocationSpec1"

    And user "alice" using cert alias "consortium1-cert" sends proposal "showProposal1" to endorsers with timeout of "30" seconds with proposal responses "showProposal1Responses":
      | Endorser |
      | peer2    |
      | peer4    |
#      | peer6    |

    Then user "alice" expects proposal responses "showProposal1Responses" with status "200" from endorsers:
      | Endorser |
      | peer2    |
      | peer4    |
#      | peer6    |

    And user "alice" expects proposal responses "showProposal1Responses" each have the same value from endorsers:
      | Endorser |
      | peer2    |
      | peer4    |
#      | peer6    |

    When the user "alice" creates transaction "showTx1" from proposal "showProposal1" and proposal responses "showProposal1Responses" for channel "com.acme.blockchain.jdoe.channel2"

    And the user "alice" broadcasts transaction "showTx1" to orderer "<orderer0>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

    And user "alice" sends deliver a seek request on orderer "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel2 | 3     | 3   |

    Then user "alice" should get a delivery "deliveredShowTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds




    # TODO: Once events are working, consider listen event listener as well.

    Examples: Orderer Options
      | ComposeFile                      | SystemUpWaitTime | ConsensusType | ChannelJoinDelay | BroadcastWaitTime | orderer0 | orderer1 | orderer2 | Orderer Specific Info |
      | dc-base.yml dc-base-4-thru-7.yml | 0                | solo          | 2                | 2                 | orderer0 | orderer0 | orderer0 |                       |
#      | dc-base.yml  dc-peer-couchdb.yml                      | 10               | solo          | 2                | 2                 | orderer0 | orderer0 | orderer0 |                       |
#      | dc-base.yml  dc-orderer-kafka.yml                     | 40               | kafka         | 10               | 5                 | orderer0 | orderer1 | orderer2 |                       |
#      | dc-base.yml  dc-peer-couchdb.yml dc-orderer-kafka.yml | 40               | kafka         | 10               | 5                 | orderer0 | orderer1 | orderer2 |                       |
#      | dc-base.yml  dc-peer-couchdb.yml dc-composer.yml      | 10               | solo          | 2                | 2                 | orderer0 | orderer0 | orderer0 |                       |
