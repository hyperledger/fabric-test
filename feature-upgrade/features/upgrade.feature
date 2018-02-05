# Copyright IBM Corp. 2016 All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# Test Upgrade function
#
# Tags that can be used and will affect test internals:
#  @doNotDecompose will NOT decompose the named compose_yaml after scenario ends.  Useful for setting up environment and reviewing after scenario.
#
#  @generateDocs will generate documentation for the scenario that can be used for both verification and comprehension.
#

@upgrade
Feature: Upgrade
  As a blockchain entrepreneur
  I want to bootstrap a new blockchain network and then demonstrate non-compatible upgrade (e.g. 1.0.X -> 1.1)

  # User Story: As a Fabric consortium, I want ability to enable new non-compatible features of Fabric, only when I am ready to consume them, by leveraging a capability framework on the channel configuration.

  @doNotDecompose
  @generateDocs
  Scenario Outline: Upgrade nodes and capabilities in a development network with 4 peers (2 orgs) and <ConsensusType> orderer service (1 org), each having a single independent root of trust (No fabric-ca, just openssl) from base version <FabricBaseVersion> to orderer version <OrdererUpgradeVersion> and peer version <PeerUpgradeVersion>
      #creates 1 self-signed key/cert pair per orderer organization
    Given the orderer network has organizations:
      | Organization | Readers | Writers | Admins |
      | ordererOrg0  | member  | member  | admin  |
#      | ordererOrg1   |    member  |  member  |  admin  |

    And user requests role of orderer admin by creating a key and csr for orderer and acquires signed certificate from organization:
      | User                   | Orderer     | Organization | AliasSavedUnder   |
      | orderer0Signer         | orderer0    | ordererOrg0  |                   |
      | orderer1Signer         | orderer1    | ordererOrg0  |                   |
      | orderer2Signer         | orderer2    | ordererOrg0  |                   |
      | orderer0Admin          | orderer0    | ordererOrg0  |                   |
      | orderer1Admin          | orderer1    | ordererOrg0  |                   |
      | orderer2Admin          | orderer2    | ordererOrg0  |                   |
      | configAdminOrdererOrg0 | configAdmin | ordererOrg0  | config-admin-cert |
#     | configAdminOrdererOrg1 | configAdmin | ordererOrg1  | config-admin-cert |


      # Rolenames : MspPrincipal.proto
    And the peer network has organizations:
      | Organization | Readers | Writers | Admins |
      | peerOrg0     | member  | member  | admin  |
      | peerOrg1     | member  | member  | admin  |
      | peerOrg2     | member  | member  | admin  |

    And a ordererBootstrapAdmin is identified and given access to all public certificates and orderer node info

    And the ordererBootstrapAdmin creates a cert alias "bootstrapCertAlias" for orderer network bootstrap purposes for organizations
      | Organization |
      | ordererOrg0  |

    And the ordererBootstrapAdmin generates a GUUID to identify the orderer system chain and refer to it by name as "ordererSystemChannelId"

    # We now have an orderer network with NO peers.  Now need to configure and start the peer network
    # This can be currently automated through folder creation of the proper form and placing PEMs.
    And user requests role for peer by creating a key and csr for peer and acquires signed certificate from organization:
      | User                | Peer        | Organization | AliasSavedUnder   |
      | peer0Signer         | peer0       | peerOrg0     |                   |
      | peer1Signer         | peer1       | peerOrg0     |                   |
      | peer2Signer         | peer2       | peerOrg1     |                   |
      | peer3Signer         | peer3       | peerOrg1     |                   |
      | peer0Admin          | peer0       | peerOrg0     | peer-admin-cert   |
      | peer1Admin          | peer1       | peerOrg0     | peer-admin-cert   |
      | peer2Admin          | peer2       | peerOrg1     | peer-admin-cert   |
      | peer3Admin          | peer3       | peerOrg1     | peer-admin-cert   |
      | configAdminPeerOrg0 | configAdmin | peerOrg0     | config-admin-cert |
      | configAdminPeerOrg1 | configAdmin | peerOrg1     | config-admin-cert |
      | configAdminPeerOrg2 | configAdmin | peerOrg2     | config-admin-cert |
      | composer0Signer     | admin       | peerOrg0     |                   |
      | composer1Signer     | admin       | peerOrg1     |                   |

    # Order info includes orderer admin/orderer information and address (host:port) from previous steps
    # Only the peer organizations can vary.
    And the ordererBootstrapAdmin using cert alias "bootstrapCertAlias" creates the genesis block "ordererGenesisBlock" for chain "ordererSystemChannelId" for composition "<ComposeFile>" and consensus "<ConsensusType>" with consortiums modification policy "/Channel/Orderer/Admins" using consortiums:
      | Consortium |
#      | consortium1 |


    And the orderer admins inspect and approve the genesis block for chain "ordererSystemChannelId"

    # to be used for setting the orderer genesis block path parameter in composition
    And the orderer admins use the genesis block for chain "ordererSystemChannelId" to configure orderers

    And we set the base fabric version to "<FabricBaseVersion>"

    And we compose "<ComposeFile>"

    Then all services should have state with status of "running" and running is "True" with the following exceptions:
      | Service | Status | Running |


    # Sleep as to allow system up time
    And I wait "<SystemUpWaitTime>" seconds


    Given user "ordererBootstrapAdmin" gives "ordererSystemChannelId" to user "configAdminOrdererOrg0" who saves it as "ordererSystemChannelId"
    And user "ordererBootstrapAdmin" gives "ordererGenesisBlock" to user "configAdminOrdererOrg0" who saves it as "ordererGenesisBlock"

    And the orderer config admin "configAdminOrdererOrg0" creates a consortium "consortium1" with modification policy "/Channel/Orderer/Admins" for peer orgs who wish to form a network:
      | Organization |
      | peerOrg0     |
      | peerOrg1     |
      | peerOrg2     |

    And user "configAdminOrdererOrg0" using cert alias "config-admin-cert" connects to deliver function on node "<orderer0>" using port "7050"

    And user "configAdminOrdererOrg0" retrieves the latest config block "latestOrdererConfig" from orderer "<orderer0>" for channel "{ordererSystemChannelId}"

    And the orderer config admin "configAdminOrdererOrg0" creates a consortiums config update "consortiumsConfigUpdate1" using config "latestOrdererConfig" using orderer system channel ID "ordererSystemChannelId" to add consortiums:
      | Consortium  |
      | consortium1 |

    And the user "configAdminOrdererOrg0" creates a configUpdateEnvelope "consortiumsConfigUpdate1Envelope" using configUpdate "consortiumsConfigUpdate1"

    And the user "configAdminOrdererOrg0" collects signatures for ConfigUpdateEnvelope "consortiumsConfigUpdate1Envelope" from developers:
      | Developer              | Cert Alias        |
      | configAdminOrdererOrg0 | config-admin-cert |
#      | configAdminOrdererOrg1 | config-admin-cert |

    And the user "configAdminOrdererOrg0" creates a ConfigUpdate Tx "consortiumsConfigUpdateTx1" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "consortiumsConfigUpdate1Envelope"

    And the user "configAdminOrdererOrg0" using cert alias "config-admin-cert" broadcasts ConfigUpdate Tx "consortiumsConfigUpdateTx1" to orderer "<orderer0>"



    Given the following application developers are defined for peer organizations and each saves their cert as alias
      | Developer | Consortium  | Organization | AliasSavedUnder  |
      | dev0Org0  | consortium1 | peerOrg0     | consortium1-cert |
      | dev0Org1  | consortium1 | peerOrg1     | consortium1-cert |

    And user "configAdminOrdererOrg0" gives "consortium1" to user "dev0Org0" who saves it as "consortium1"

    And the user "dev0Org0" creates a peer organization set "peerOrgSet1" with peer organizations:
      | Organization |
      | peerOrg0     |
      | peerOrg1     |
#      |  peerOrg2     |

    And the user "dev0Org0" creates an peer anchor set "anchors1" for orgs:
      | User        | Peer  | Organization |
      | peer0Signer | peer0 | peerOrg0     |
      | peer2Signer | peer2 | peerOrg1     |

    ###########################################################################
    #
    # Entry point for creating a channel
    #
    ###########################################################################

    And the user "dev0Org0" creates a new channel ConfigUpdate "createChannelConfigUpdate1" using consortium "consortium1"
      | ChannelID                         | PeerOrgSet  | [PeerAnchorSet] |
      | com.acme.blockchain.jdoe.channel1 | peerOrgSet1 |                 |

    And the user "dev0Org0" creates a configUpdateEnvelope "createChannelConfigUpdate1Envelope" using configUpdate "createChannelConfigUpdate1"


    And the user "dev0Org0" collects signatures for ConfigUpdateEnvelope "createChannelConfigUpdate1Envelope" from developers:
      | Developer | Cert Alias       |
      | dev0Org0  | consortium1-cert |
      | dev0Org1  | consortium1-cert |

    And the user "dev0Org0" creates a ConfigUpdate Tx "configUpdateTx1" using cert alias "consortium1-cert" using signed ConfigUpdateEnvelope "createChannelConfigUpdate1Envelope"

    And the user "dev0Org0" using cert alias "consortium1-cert" broadcasts ConfigUpdate Tx "configUpdateTx1" to orderer "<orderer0>"

    # Sleep as the local orderer needs to bring up the resources that correspond to the new channel
    # For the Kafka orderer, this includes setting up a producer and consumer for the channel's partition
    # Requesting a deliver earlier may result in a SERVICE_UNAVAILABLE response and a connection drop
    And I wait "<ChannelJoinDelay>" seconds

    When user "dev0Org0" using cert alias "consortium1-cert" connects to deliver function on node "<orderer0>" using port "7050"
    And user "dev0Org0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 0     | 0   |

    Then user "dev0Org0" should get a delivery "genesisBlockForMyNewChannel" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    Given user "dev0Org0" gives "genesisBlockForMyNewChannel" to user "dev0Org1" who saves it as "genesisBlockForMyNewChannel"

    Given user "dev0Org0" gives "genesisBlockForMyNewChannel" to user "peer0Admin" who saves it as "genesisBlockForMyNewChannel"
    Given user "dev0Org0" gives "genesisBlockForMyNewChannel" to user "peer1Admin" who saves it as "genesisBlockForMyNewChannel"


    ###########################################################################
    #
    # This is entry point for joining a channel
    #
    ###########################################################################

    When user "peer0Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForMyNewChannel" on peers with result "joinChannelResult"
      | Peer  |
      | peer0 |

    Then user "peer0Admin" expects result code for "joinChannelResult" of "200" from peers:
      | Peer  |
      | peer0 |

    When user "peer1Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForMyNewChannel" on peers with result "joinChannelResult"
      | Peer  |
      | peer1 |

    Then user "peer1Admin" expects result code for "joinChannelResult" of "200" from peers:
      | Peer  |
      | peer1 |

    ###########################################################################
    #
    # Entry point for creating a channel config update to add anchor peers
    # (using anchors1, which was previously created)
    #
    ###########################################################################

    Given the user "configAdminPeerOrg0" creates an peer anchor set "anchors1" for orgs:
      | User        | Peer  | Organization |
      | peer0Signer | peer0 | peerOrg0     |

    And user "configAdminPeerOrg0" using cert alias "config-admin-cert" connects to deliver function on node "<orderer0>" using port "7050"

    And user "configAdminPeerOrg0" retrieves the latest config block "latestChannelConfigUpdate" from orderer "<orderer0>" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "configAdminPeerOrg0" creates an existing channel config update "existingChannelConfigUpdate1" using config update "latestChannelConfigUpdate"
      | ChannelID                         | [PeerAnchorSet] |
      | com.acme.blockchain.jdoe.channel1 | anchors1        |

    Given the user "configAdminPeerOrg0" creates a configUpdateEnvelope "existingChannelConfigUpdate1Envelope" using configUpdate "existingChannelConfigUpdate1"


    And the user "configAdminPeerOrg0" collects signatures for ConfigUpdateEnvelope "existingChannelConfigUpdate1Envelope" from developers:
      | Developer           | Cert Alias        |
      | configAdminPeerOrg0 | config-admin-cert |

    And the user "configAdminPeerOrg0" creates a ConfigUpdate Tx "existingChannelConfigUpdateTx1" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "existingChannelConfigUpdate1Envelope"


    When the user "configAdminPeerOrg0" broadcasts transaction "existingChannelConfigUpdateTx1" to orderer "<orderer0>"

    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "configAdminPeerOrg0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 1     | 1   |

    Then user "configAdminPeerOrg0" should get a delivery "deliveredExistingChannelConfigUpdateTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds


    # Simulate the administrator sharing the channel genesis block with other peer org admins, so they can join their peers to the channel too

    Given user "dev0Org1" gives "genesisBlockForMyNewChannel" to user "peer2Admin" who saves it as "genesisBlockForMyNewChannel"
    Given user "dev0Org1" gives "genesisBlockForMyNewChannel" to user "peer3Admin" who saves it as "genesisBlockForMyNewChannel"

    When user "peer2Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForMyNewChannel" on peers with result "joinChannelResult"
      | Peer  |
      | peer2 |

    Then user "peer2Admin" expects result code for "joinChannelResult" of "200" from peers:
      | Peer  |
      | peer2 |

    When user "peer3Admin" using cert alias "peer-admin-cert" requests to join channel using genesis block "genesisBlockForMyNewChannel" on peers with result "joinChannelResult"
      | Peer  |
      | peer3 |

    Then user "peer3Admin" expects result code for "joinChannelResult" of "200" from peers:
      | Peer  |
      | peer3 |


      # Uncomment this if you wish to stop with just a channel created and joined on all peers
#      And we stop


    ###########################################################################
    #
    # Entry point for install and instantiate chaincode on peers on a channel
    #
    ###########################################################################

    When user "peer0Admin" creates a chaincode spec "ccSpec" with name "example02" and version "1.0" of type "GOLANG" for chaincode "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02" with args
      | funcName | arg1 | arg2 | arg3 | arg4 |
      | init     | a    | 100  | b    | 200  |

      ### TODO: Will soon need to collect signatures (owners) and create a SignedChaincodeDeploymentSpec which will supplant the payload for installProposal.

      # Under the covers, create a deployment spec, etc.
    And user "peer0Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposal1" using chaincode spec "ccSpec"

    And user "peer0Admin" using cert alias "peer-admin-cert" sends proposal "installProposal1" to endorsers with timeout of "90" seconds with proposal responses "installProposalResponses1":
      | Endorser |
      | peer0    |

    Then user "peer0Admin" expects proposal responses "installProposalResponses1" with status "200" from endorsers:
      | Endorser |
      | peer0    |

    Given user "peer0Admin" gives "ccSpec" to user "peer2Admin" who saves it as "ccSpec"

      # Under the covers, create a deployment spec, etc.
    When user "peer2Admin" using cert alias "peer-admin-cert" creates a install proposal "installProposal2" using chaincode spec "ccSpec"

    And user "peer2Admin" using cert alias "peer-admin-cert" sends proposal "installProposal2" to endorsers with timeout of "90" seconds with proposal responses "installProposalResponses2":
      | Endorser |
      | peer2    |

    Then user "peer2Admin" expects proposal responses "installProposalResponses2" with status "200" from endorsers:
      | Endorser |
      | peer2    |


    Given user "peer0Admin" gives "ccSpec" to user "dev0Org0" who saves it as "ccSpec"
    And user "peer0Admin" gives "ccSpec" to user "configAdminPeerOrg0" who saves it as "ccSpec"

    And user "configAdminPeerOrg0" creates a signature policy envelope "signedByMemberOfPeerOrg0AndPeerOrg1" using "envelope(n_out_of(2,[signed_by(0),signed_by(1)]),[member('peerOrg0'), member('peerOrg1')])"

    When user "configAdminPeerOrg0" using cert alias "config-admin-cert" creates a instantiate proposal "instantiateProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "ccSpec" and endorsement policy "signedByMemberOfPeerOrg0AndPeerOrg1"

    And user "configAdminPeerOrg0" using cert alias "config-admin-cert" sends proposal "instantiateProposal1" to endorsers with timeout of "90" seconds with proposal responses "instantiateProposalResponses1":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "configAdminPeerOrg0" expects proposal responses "instantiateProposalResponses1" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "configAdminPeerOrg0" expects proposal responses "instantiateProposalResponses1" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "configAdminPeerOrg0" creates transaction "instantiateTx1" from proposal "instantiateProposal1" and proposal responses "instantiateProposalResponses1" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "configAdminPeerOrg0" broadcasts transaction "instantiateTx1" to orderer "<orderer1>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "configAdminPeerOrg0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 2     | 2   |

    Then user "configAdminPeerOrg0" should get a delivery "deliveredInstantiateTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

      # Sleep to allow for chaincode instantiation on the peer
    And I wait "15" seconds

    ###########################################################################
    #
    # Entry point for invoke and query on a channel
    #
    ###########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "invocationSpec1" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpec1"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposal1" to endorsers with timeout of "30" seconds with proposal responses "invokeProposalResponses1":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponses1" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponses1" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTx1" from proposal "invokeProposal1" and proposal responses "invokeProposalResponses1" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTx1" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      #########################################################################
      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 3     | 3   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTx1Block" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    #########################################################################
    #
    # Query peers; ensure block was delivered to each of them with same value
    #
    #########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "querySpec1" using spec "ccSpec" with input:
      | funcName | arg1 |
      | query    | a    |

      # Under the covers, create a deployment spec, etc.
    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "querySpec1"

### Potential bug here (and in similar steps further below):
### ALL peers should receive the new data, not just the endorsers, so we should be able to
### query them all (currently fails) and check heights on all of them (passes).
### TODO: Before creating a bug for failed queries to committer peers (where the cc was not installed),
### first be sure we understand if our test code needs to be redesigned. Maybe this step (which sends
### proposal "to endorsers") might prevent us querying them, so look for another test step function.
    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryProposal1" to endorsers with timeout of "30" seconds with proposal responses "queryProposalResponses1":
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    Then user "dev0Org0" expects proposal responses "queryProposalResponses1" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    And user "dev0Org0" expects proposal responses "queryProposalResponses1" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    ###########################################################################
    #
    # Verifying blockinfo for all peers in the channel
    #
    ###########################################################################

    Given I wait "<VerifyAllBlockHeightsWaitTime>" seconds

    When user "dev0Org0" creates a chaincode spec "qsccSpecGetChainInfo1" with name "qscc" and version "1.0" of type "GOLANG" for chaincode "/" with args
      | funcName     | arg1                              |
      | GetChainInfo | com.acme.blockchain.jdoe.channel1 |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryGetChainInfoProposal1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "qsccSpecGetChainInfo1"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryGetChainInfoProposal1" to endorsers with timeout of "30" seconds with proposal responses "queryGetChainInfoProposalResponses1":
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    Then user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponses1" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    And user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponses1" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |


    ###########################################################################
    ###########################################################################
    #
    #                     Beginning of upgrade steps
    #
    ###########################################################################
    ###########################################################################



    ###########################################################################
    ###########################################################################
    #
    # Upgrade all orderers binaries versions first, before peers
    #
    # CAUTION: If you do NOT upgrade ALL of the orderers to v1.1 before adding
    # any of the new version capabilities, it is possible to have a state fork
    # for any channel (i.e. orderer system or peers) - which of course would be
    # CATASTROPHIC and break the guarantee of data integrity !!!
    #
    ###########################################################################
    ###########################################################################

    # Note: This "disconnect" step is here because it is needed for
    # this test framework to work cleanly, even though it seems like it
    # should not be required in real world...
#   Given all users disconnect from orderers
#   Given all orderer admins agree to upgrade

# Further below, this test script performs rolling upgrade of orderers,
# stopping one orderer at a time, upgrading the version, and restarting it.

# This immediate block of commented out steps is intended for a
# full outage scenario where all orderer admins would stop all of their
# respective orderer nodes, kafkas, etc, now.

#   And we "stop" service "<orderer0>"
#   And we "stop" service "<orderer1>"
#   And we "stop" service "<orderer2>"

#    And we "stop" service "kafka0"
#    And I wait "6" seconds
#    And we "stop" service "kafka1"
#    And I wait "6" seconds
#    And we "stop" service "kafka2"
#    And I wait "6" seconds
#    And we "stop" service "kafka3"
#    And I wait "6" seconds

#    And we "stop" service "zookeeper0"
#    And I wait "6" seconds
#    And we "stop" service "zookeeper1"
#    And I wait "6" seconds
#    And we "stop" service "zookeeper2"
#    And I wait "6" seconds

#    And user "orderer0Admin" upgrades "zookeeper0" to version "<OrdererUpgradeVersion>"
#    And user "orderer0Admin" upgrades "zookeeper1" to version "<OrdererUpgradeVersion>"
#    And user "orderer0Admin" upgrades "zookeeper2" to version "<OrdererUpgradeVersion>"

#    And I wait "<RestartOrdererWaitTime>" seconds

#    And user "orderer0Admin" upgrades "kafka0" to version "<OrdererUpgradeVersion>"
#    And user "orderer0Admin" upgrades "kafka1" to version "<OrdererUpgradeVersion>"
#    And user "orderer0Admin" upgrades "kafka2" to version "<OrdererUpgradeVersion>"
#    And user "orderer0Admin" upgrades "kafka3" to version "<OrdererUpgradeVersion>"

#    And I wait "<SystemUpWaitTime>" seconds



    ###########################################################################
    #
    # Upgrading orderer0 and entry point for invoking after upgrading orderer0
    #
    ###########################################################################

    Given all users disconnect from orderers
    Given all orderer admins agree to upgrade
    And we "stop" service "<orderer0>"

    And user "orderer0Admin" upgrades "<orderer0>" to version "<OrdererUpgradeVersion>"
    And I wait "<RestartOrdererWaitTime>" seconds

    And user "dev0Org0" using cert alias "consortium1-cert" connects to deliver function on node "<orderer0>" using port "7050"

    And user "dev0Org0" retrieves the latest config block "latestChannelConfigAfterUpgrOrd0" from orderer "<orderer0>" for channel "com.acme.blockchain.jdoe.channel1"

    # entry point for invoking after upgrading orderer
    When user "dev0Org0" creates a chaincode invocation spec "invocationSpec2" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposal2" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpec2"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposal2" to endorsers with timeout of "30" seconds with proposal responses "invokeProposalResponses2":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponses2" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponses2" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTx2" from proposal "invokeProposal2" and proposal responses "invokeProposalResponses2" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTx2" to orderer "<orderer0>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 4     | 4   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTxBlockAfterUpgrOrd0" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    ###########################################################################
    #
    # Upgrading orderer1 and entry point for invoking after upgrading orderer1
    #
    ###########################################################################

    # For now, we must uncomment this next line if testing solo, i.e. if <orderer0> == <orderer1> == <orderer2>. (Ideally, we should just enhance the disconnect step, so we could specify a single orderer.)
    #Given all users disconnect from orderers
    Given all orderer admins agree to upgrade
    And we "stop" service "<orderer1>"

    And user "orderer1Admin" upgrades "<orderer1>" to version "<OrdererUpgradeVersion>"
    And I wait "<RestartOrdererWaitTime>" seconds

    And user "dev0Org0" using cert alias "consortium1-cert" connects to deliver function on node "<orderer1>" using port "7050"

    And user "dev0Org0" retrieves the latest config block "latestChannelConfigAfterUpgrOrd1" from orderer "<orderer1>" for channel "com.acme.blockchain.jdoe.channel1"

    # entry point for invoking after upgrading orderer
    When user "dev0Org0" creates a chaincode invocation spec "invocationSpecAfterUpgrOrd1" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposalAfterUpgrOrd1" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpecAfterUpgrOrd1"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposalAfterUpgrOrd1" to endorsers with timeout of "30" seconds with proposal responses "invokeProposalResponsesAfterUpgrOrd1":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterUpgrOrd1" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterUpgrOrd1" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTxAfterUpgrOrd1" from proposal "invokeProposalAfterUpgrOrd1" and proposal responses "invokeProposalResponsesAfterUpgrOrd1" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTxAfterUpgrOrd1" to orderer "<orderer1>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer1>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 5     | 5   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTxBlockAfterUpgrOrd1" from "<orderer1>" of "1" blocks with "1" messages within "1" seconds

    ###########################################################################
    #
    # Upgrading orderer2 and entry point for invoking after upgrading orderer2
    #
    ###########################################################################

    # For now, we must uncomment this next line if testing solo, i.e. if <orderer0> == <orderer1> == <orderer2>. (Ideally, we should just enhance the disconnect step, so we could specify a single orderer.)
    #Given all users disconnect from orderers
    Given all orderer admins agree to upgrade
    And we "stop" service "<orderer2>"

    And user "orderer2Admin" upgrades "<orderer2>" to version "<OrdererUpgradeVersion>"
    And I wait "<RestartOrdererWaitTime>" seconds

    And user "dev0Org0" using cert alias "consortium1-cert" connects to deliver function on node "<orderer2>" using port "7050"
    And user "dev0Org0" retrieves the latest config block "latestChannelConfigAfterUpgrOrd2" from orderer "<orderer2>" for channel "com.acme.blockchain.jdoe.channel1"

    # entry point for invoking after upgrading orderer
    When user "dev0Org0" creates a chaincode invocation spec "invocationSpecAfterUpgrOrd2" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposalAfterUpgrOrd2" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpecAfterUpgrOrd2"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposalAfterUpgrOrd2" to endorsers with timeout of "30" seconds with proposal responses "invokeProposalResponsesAfterUpgrOrd2":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterUpgrOrd2" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterUpgrOrd2" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTxAfterUpgrOrd2" from proposal "invokeProposalAfterUpgrOrd2" and proposal responses "invokeProposalResponsesAfterUpgrOrd2" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTxAfterUpgrOrd2" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer2>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 6     | 6   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTxBlockAfterUpgrOrd2" from "<orderer2>" of "1" blocks with "1" messages within "1" seconds

    ###########################################################################
    #
    # Done upgrading binaries versions of Orderer system nodes.
    # Next, verify everything is working by querying the peers to ensure
    # the invokes that we sent during each step were successfully delivered
    # and stored in peer ledgers.
    #
    ###########################################################################

    #########################################################################
    #
    # Query peers; ensure block was delivered to each of them with same value
    #
    #########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "querySpecAfterUpversionOrds" using spec "ccSpec" with input:
      | funcName | arg1 |
      | query    | a    |

      # Under the covers, create a deployment spec, etc.
    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryProposalAfterUpversionOrds" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "querySpecAfterUpversionOrds"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryProposalAfterUpversionOrds" to endorsers with timeout of "30" seconds with proposal responses "queryProposalResponsesAfterUpversionOrds":
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    Then user "dev0Org0" expects proposal responses "queryProposalResponsesAfterUpversionOrds" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    And user "dev0Org0" expects proposal responses "queryProposalResponsesAfterUpversionOrds" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    ###########################################################################
    #
    # Verifying blockinfo for all peers in the channel
    #
    ###########################################################################

    Given I wait "<VerifyAllBlockHeightsWaitTime>" seconds

    When user "dev0Org0" creates a chaincode spec "qsccSpecGetChainInfoAfterUpversionOrds" with name "qscc" and version "1.0" of type "GOLANG" for chaincode "/" with args
      | funcName     | arg1                              |
      | GetChainInfo | com.acme.blockchain.jdoe.channel1 |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryGetChainInfoProposalAfterUpversionOrds" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "qsccSpecGetChainInfoAfterUpversionOrds"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryGetChainInfoProposalAfterUpversionOrds" to endorsers with timeout of "30" seconds with proposal responses "queryGetChainInfoProposalResponsesAfterUpversionOrds":
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    Then user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterUpversionOrds" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    And user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterUpversionOrds" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |


    ###########################################################################
    #
    # End upgrading all orderers binaries versions.
    # Done checking block chain heights in orderers and peers.
    # Done verifying peers in synch by using invokes and queries.
    #
    ###########################################################################


    ###########################################################################
    ###########################################################################
    #
    # Entry point for upgrading the peers binaries versions
    #
    ###########################################################################
    ###########################################################################


    # With the Peer Admin members, upgrade 1 peer per org
    # TODO: Investigate possible bug:
    # NOTE: from 1.0.x -> 1.1 there appears to be an identity resolution issue that prohibits gossip from reestablishing post upgrade.  The peers will then
    # directly connect to the orderers to pull blocks.

    Given user "peer1Admin" upgrades "peer1" to version "<PeerUpgradeVersion>"
    And I wait "<RestartPeerWaitTime>" seconds

    Given user "peer3Admin" upgrades "peer3" to version "<PeerUpgradeVersion>"
    And I wait "<RestartPeerWaitTime>" seconds

    ###########################################################################
    #
    # Since fabric code does not automatically do it, all administrators must
    # remove all existing chaincode images from their peers when they are
    # stopped for the upgrade. (Chaincode containers will get recreated
    # automatically by fabric peer as soon as they are next used.) Otherwise,
    # TLS cert failure will occur in restarted chaincode container log.
    #
    ###########################################################################

    ### Possible TODO: it would be more accurate to redesign our test steps to
    ### just remove them on each individual peer WHILE that peer is down

    Given all peer admins remove existing chaincode docker images


###
### NOTE: The following code sends invoke TX to the non-upgraded peers 0 and 2.
### TODO: Also at this point, send invoke TX to the upgraded peers 1 and 3,
### before verifying on all peers.
### And probably add similar steps again at further points below...
### However, to do that, those peers would need to be endorsers, so we would
### need to add code steps to install the chaincode on those peers too.
###

    ###########################################################################
    #
    # Send invoke TX; note the endorser peers are still on old version
    # Verify on orderer and peers that each return the same height and value
    #
    ###########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "invocationSpecAfterSomePeersUpversioned" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposalAfterSomePeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpecAfterSomePeersUpversioned"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposalAfterSomePeersUpversioned" to endorsers with timeout of "60" seconds with proposal responses "invokeProposalResponsesAfterSomePeersUpversioned":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterSomePeersUpversioned" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterSomePeersUpversioned" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTxAfterSomePeersUpversioned" from proposal "invokeProposalAfterSomePeersUpversioned" and proposal responses "invokeProposalResponsesAfterSomePeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTxAfterSomePeersUpversioned" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 7     | 7   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTxBlockAfterSomePeersUpversioned" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    #########################################################################
    #
    # Query peers; ensure block was delivered to each of them with same value
    #
    #########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "querySpecAfterSomePeersUpversioned" using spec "ccSpec" with input:
      | funcName | arg1 |
      | query    | a    |

      # Under the covers, create a deployment spec, etc.
    When user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryProposalAfterSomePeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "querySpecAfterSomePeersUpversioned"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryProposalAfterSomePeersUpversioned" to endorsers with timeout of "30" seconds with proposal responses "queryProposalResponsesAfterSomePeersUpversioned":
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    Then user "dev0Org0" expects proposal responses "queryProposalResponsesAfterSomePeersUpversioned" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    And user "dev0Org0" expects proposal responses "queryProposalResponsesAfterSomePeersUpversioned" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    ###########################################################################
    #
    # Verifying blockinfo for all peers in the channel
    #
    ###########################################################################

    Given I wait "<VerifyAllBlockHeightsWaitTime>" seconds

    When user "dev0Org0" creates a chaincode spec "qsccSpecGetChainInfoAfterSomePeersUpversioned" with name "qscc" and version "1.0" of type "GOLANG" for chaincode "/" with args
      | funcName     | arg1                              |
      | GetChainInfo | com.acme.blockchain.jdoe.channel1 |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryGetChainInfoProposalAfterSomePeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "qsccSpecGetChainInfoAfterSomePeersUpversioned"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryGetChainInfoProposalAfterSomePeersUpversioned" to endorsers with timeout of "30" seconds with proposal responses "queryGetChainInfoProposalResponsesAfterSomePeersUpversioned":
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    Then user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterSomePeersUpversioned" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    And user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterSomePeersUpversioned" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |





    ###########################################################################
    ###########################################################################
    ####                                                                   ####
    ####    ARE YOU READY???  THIS IS PONR = THE POINT OF NO RETURN!!!!!   ####
    ####                                                                   ####
    ####    All orderers have new versions of binaries.                    ####
    ####    Some or all peers have new versions of binaries.               ####
    ####    Ready to turn on new version capabilities.                     ####
    ####                                                                   ####
    ###########################################################################
    ###########################################################################





    # Demonstrate turning on a non-compatible capability in a channel


    ###########################################################################
    #
    # ### TODO: First test sending Config_update to peer channel with new value
    # 'Capabilities', but with incorrect or no specific capability.Scenario
    # Verify if the non-upgraded peers panic only when appropriate...
    #
    ###########################################################################


    ###########################################################################
    ###########################################################################
    #
    # Config_update to orderer system channel for group /Channel/Orderer with
    # new value 'Capabilities', use the first one 'V1.1'.
    # NOTE: This is step 1 of a 2-step process.
    # (Step 2 will be a similar config_update, for group /Channel .)
    #
    ###########################################################################
    ###########################################################################

    Given user "configAdminOrdererOrg0" using cert alias "config-admin-cert" connects to deliver function on node "<orderer0>" using port "7050"
    And user "configAdminOrdererOrg0" retrieves the latest config block "latestOrdererConfigForCapabilitiesChange" from orderer "<orderer0>" for channel "{ordererSystemChannelId}"
    And user "configAdminOrdererOrg0" creates a capabilities config update "capabilitiesV1.1ConfigUpdateForOrderer" using config "latestOrdererConfigForCapabilitiesChange" using channel ID "{ordererSystemChannelId}" with mod policy "Admins" to add capabilities:
      | Group            | Capabilities |
      | /Channel/Orderer | V1_1         |
    And the user "configAdminOrdererOrg0" creates a configUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForOrderer" using configUpdate "capabilitiesV1.1ConfigUpdateForOrderer"

    And the user "configAdminOrdererOrg0" collects signatures for ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForOrderer" from developers:
      | Developer              | Cert Alias        |
      | configAdminOrdererOrg0 | config-admin-cert |
#      | configAdminOrdererOrg1 | config-admin-cert |

    And the user "configAdminOrdererOrg0" creates a ConfigUpdate Tx "capabilitiesConfigUpdateTx1" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForOrderer"

    And the user "configAdminOrdererOrg0" using cert alias "config-admin-cert" broadcasts ConfigUpdate Tx "capabilitiesConfigUpdateTx1" to orderer "<orderer0>"


    ###########################################################################
    #
    # Config_update to orderer system channel for group /Channel with
    # new value 'Capabilities', use the first one 'V1.1'.
    # NOTE: This is step 2 of a 2-step process.
    # (Step 1 was a similar config_update, for group /Channel/Orderer .)
    #
    ###########################################################################
    Given user "configAdminOrdererOrg0" retrieves the latest config block "latestOrdererConfigForCapabilitiesChange2" from orderer "<orderer0>" for channel "{ordererSystemChannelId}"
    And user "configAdminOrdererOrg0" creates a capabilities config update "capabilitiesV1.1ConfigUpdateForOrderer2" using config "latestOrdererConfigForCapabilitiesChange2" using channel ID "{ordererSystemChannelId}" with mod policy "Admins" to add capabilities:
      | Group    | Capabilities |
      | /Channel | V1_1         |
    And the user "configAdminOrdererOrg0" creates a configUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForOrderer2" using configUpdate "capabilitiesV1.1ConfigUpdateForOrderer2"

    And the user "configAdminOrdererOrg0" collects signatures for ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForOrderer2" from developers:
      | Developer              | Cert Alias        |
      | configAdminOrdererOrg0 | config-admin-cert |
#      | configAdminOrdererOrg1 | config-admin-cert |

    And the user "configAdminOrdererOrg0" creates a ConfigUpdate Tx "capabilitiesConfigUpdateTx2" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForOrderer2"

    And the user "configAdminOrdererOrg0" using cert alias "config-admin-cert" broadcasts ConfigUpdate Tx "capabilitiesConfigUpdateTx2" to orderer "<orderer0>"

    #  So if you create a new Channel post orderer fix, you will now have a correctly set mod_policy at channel level vs prior channel genesis block.

    ###########################################################################
    #
    # orderer config Admin then adds the same capability to the Orderer group for existing channels
    # and expected result is non-upgraded peers should panic
    #
    ###########################################################################
    Given user "configAdminOrdererOrg0" retrieves the latest config block "latestPeerConfigForCapabilitiesChange" from orderer "<orderer0>" for channel "com.acme.blockchain.jdoe.channel1"
    And user "configAdminOrdererOrg0" creates a capabilities config update "capabilitiesV1.1ConfigUpdateForPeer" using config "latestPeerConfigForCapabilitiesChange" using channel ID "com.acme.blockchain.jdoe.channel1" with mod policy "Admins" to add capabilities:
      | Group            | Capabilities |
      | /Channel/Orderer | V1_1         |
    And the user "configAdminOrdererOrg0" creates a configUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForPeer" using configUpdate "capabilitiesV1.1ConfigUpdateForPeer"

    And the user "configAdminOrdererOrg0" collects signatures for ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForPeer" from developers:
      | Developer              | Cert Alias        |
      | configAdminOrdererOrg0 | config-admin-cert |
#      | configAdminOrdererOrg1 | config-admin-cert |

    And the user "configAdminOrdererOrg0" creates a ConfigUpdate Tx "capabilitiesConfigUpdateForPeerTx1" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForPeer"

    And the user "configAdminOrdererOrg0" using cert alias "config-admin-cert" broadcasts ConfigUpdate Tx "capabilitiesConfigUpdateForPeerTx1" to orderer "<orderer0>"

    And I wait "<BroadcastWaitTime>" seconds

    Then all services should have state with status of "running" and running is "True" with the following exceptions:
      | Service | Status | Running |
      | peer0   | exited | False   |
      | peer2   | exited | False   |

    ###########################################################################
    #
    # Admin must make sure the existing chaincode images are cleared or
    # TLS cert failure will occur in restarted chaincode container log.
    # (Do not worry; chaincode containers will get recreated as needed.)
    #
    ###########################################################################

    Given all peer admins remove existing chaincode docker images


    ###########################################################################
    ###########################################################################
    #
    # Upgrade the remaining back-revved peers. They should successfully
    # catch up to rest of network (verify if Gossip can reestablish).
    #
    ###########################################################################
    ###########################################################################

    Given user "peer0Admin" upgrades "peer0" to version "<PeerUpgradeVersion>"
    And I wait "<RestartPeerWaitTime>" seconds

    Given user "peer2Admin" upgrades "peer2" to version "<PeerUpgradeVersion>"
    And I wait "<RestartPeerWaitTime>" seconds

    Then all services should have state with status of "running" and running is "True" with the following exceptions:
      | Service | Status | Running |

    ###########################################################################
    #
    # Send invoke TX on preexisting channel1, and then
    # Verify on orderer and peers that each return the same height and value
    #
    ###########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "invocationSpecAfterAllPeersUpversioned" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposalAfterAllPeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpecAfterAllPeersUpversioned"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposalAfterAllPeersUpversioned" to endorsers with timeout of "60" seconds with proposal responses "invokeProposalResponsesAfterAllPeersUpversioned":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterAllPeersUpversioned" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterAllPeersUpversioned" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTxAfterAllPeersUpversioned" from proposal "invokeProposalAfterAllPeersUpversioned" and proposal responses "invokeProposalResponsesAfterAllPeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTxAfterAllPeersUpversioned" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 8     | 8   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTxBlockAfterAllPeersUpversioned" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    #########################################################################
    #
    # Query peers; ensure block was delivered to each of them with same value
    #
    #########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "querySpecAfterAllPeersUpversioned" using spec "ccSpec" with input:
      | funcName | arg1 |
      | query    | a    |

      # Under the covers, create a deployment spec, etc.
    When user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryProposalAfterAllPeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "querySpecAfterAllPeersUpversioned"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryProposalAfterAllPeersUpversioned" to endorsers with timeout of "30" seconds with proposal responses "queryProposalResponsesAfterAllPeersUpversioned":
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    Then user "dev0Org0" expects proposal responses "queryProposalResponsesAfterAllPeersUpversioned" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    And user "dev0Org0" expects proposal responses "queryProposalResponsesAfterAllPeersUpversioned" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    ###########################################################################
    #
    # Verifying blockinfo for all peers in the channel
    #
    ###########################################################################

    Given I wait "<VerifyAllBlockHeightsWaitTime>" seconds

    When user "dev0Org0" creates a chaincode spec "qsccSpecGetChainInfoAfterAllPeersUpversioned" with name "qscc" and version "1.0" of type "GOLANG" for chaincode "/" with args
      | funcName     | arg1                              |
      | GetChainInfo | com.acme.blockchain.jdoe.channel1 |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryGetChainInfoProposalAfterAllPeersUpversioned" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "qsccSpecGetChainInfoAfterAllPeersUpversioned"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryGetChainInfoProposalAfterAllPeersUpversioned" to endorsers with timeout of "30" seconds with proposal responses "queryGetChainInfoProposalResponsesAfterAllPeersUpversioned":
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    Then user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterAllPeersUpversioned" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    And user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterAllPeersUpversioned" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |



    ###########################################################################
    ###########################################################################
    #
    # The orderer config Admin then adds the same V1_1 capability to the
    # /Channel and /Channel/Application groups for existing channels
    #
    ###########################################################################
    ###########################################################################

    Given user "configAdminOrdererOrg0" retrieves the latest config block "latestPeerConfigForCapabilitiesChangeForChannel" from orderer "<orderer0>" for channel "com.acme.blockchain.jdoe.channel1"
    And user "configAdminOrdererOrg0" creates a capabilities config update "capabilitiesV1.1ConfigUpdateForPeerChannelLevel" using config "latestPeerConfigForCapabilitiesChangeForChannel" using channel ID "com.acme.blockchain.jdoe.channel1" with mod policy "Admins" to add capabilities:
      | Group                | Capabilities |
      | /Channel             | V1_1         |
      | /Channel/Application | V1_1         |
    And the user "configAdminOrdererOrg0" creates a configUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForPeerChannelLevel" using configUpdate "capabilitiesV1.1ConfigUpdateForPeerChannelLevel"

    And the user "configAdminOrdererOrg0" collects signatures for ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForPeerChannelLevel" from developers:
      | Developer              | Cert Alias        |
      | configAdminOrdererOrg0 | config-admin-cert |
      | configAdminPeerOrg0    | config-admin-cert |
      | configAdminPeerOrg1    | config-admin-cert |
#      | configAdminOrdererOrg1 | config-admin-cert |

    And the user "configAdminOrdererOrg0" creates a ConfigUpdate Tx "capabilitiesConfigUpdateForPeerTx1ChannelLevel" using cert alias "config-admin-cert" using signed ConfigUpdateEnvelope "capabilitiesV1.1ConfigUpdateEnvelopeForPeerChannelLevel"

    And the user "configAdminOrdererOrg0" using cert alias "config-admin-cert" broadcasts ConfigUpdate Tx "capabilitiesConfigUpdateForPeerTx1ChannelLevel" to orderer "<orderer0>"

    ###########################################################################
    #
    # pre-existing channel1:
    # Send invoke TX on channel1, now that all peers are on new version and
    # new capabilities have been added to fix up existing channels.
    # Verify on orderer and peers that each return the same height and value
    #
    ###########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "invocationSpecAfterAddCapsToExistChans" using spec "ccSpec" with input:
      | funcName | arg1 | arg2 | arg3 |
      | invoke   | a    | b    | 10   |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "invokeProposalAfterAddCapsToExistChans" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "invocationSpecAfterAddCapsToExistChans"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "invokeProposalAfterAddCapsToExistChans" to endorsers with timeout of "30" seconds with proposal responses "invokeProposalResponsesAfterAddCapsToExistChans":
      | Endorser |
      | peer0    |
      | peer2    |

    Then user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterAddCapsToExistChans" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    And user "dev0Org0" expects proposal responses "invokeProposalResponsesAfterAddCapsToExistChans" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |

    When the user "dev0Org0" creates transaction "invokeTxAfterAddCapsToExistChans" from proposal "invokeProposalAfterAddCapsToExistChans" and proposal responses "invokeProposalResponsesAfterAddCapsToExistChans" for channel "com.acme.blockchain.jdoe.channel1"

    And the user "dev0Org0" broadcasts transaction "invokeTxAfterAddCapsToExistChans" to orderer "<orderer2>"

      # Sleep as the local orderer ledger needs to create the block that corresponds to the start number of the seek request
    And I wait "<BroadcastWaitTime>" seconds

      # Check one of the orderers for the new block on the channel
    And user "dev0Org0" sends deliver a seek request on node "<orderer0>" with properties:
      | ChainId                           | Start | End |
      | com.acme.blockchain.jdoe.channel1 | 9     | 9   |

    Then user "dev0Org0" should get a delivery "deliveredInvokeTxBlockAfterAddCapsToExistChans" from "<orderer0>" of "1" blocks with "1" messages within "1" seconds

    #########################################################################
    #
    # pre-existing channel1:
    # Query peers; ensure block was delivered to each of them with same value
    #
    #########################################################################

    When user "dev0Org0" creates a chaincode invocation spec "querySpecAfterAddCapsToExistChans" using spec "ccSpec" with input:
      | funcName | arg1 |
      | query    | a    |

      # Under the covers, create a deployment spec, etc.
    When user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryProposalAfterAddCapsToExistChans" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "querySpecAfterAddCapsToExistChans"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryProposalAfterAddCapsToExistChans" to endorsers with timeout of "30" seconds with proposal responses "queryProposalResponsesAfterAddCapsToExistChans":
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    Then user "dev0Org0" expects proposal responses "queryProposalResponsesAfterAddCapsToExistChans" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    And user "dev0Org0" expects proposal responses "queryProposalResponsesAfterAddCapsToExistChans" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer2    |
#     | peer1    |
#     | peer3    |

    ###########################################################################
    #
    # pre-existing channel1:
    # Verifying blockinfo for all peers in the channel
    #
    ###########################################################################

    Given I wait "<VerifyAllBlockHeightsWaitTime>" seconds

    When user "dev0Org0" creates a chaincode spec "qsccSpecGetChainInfoAfterAddCapsToExistChans" with name "qscc" and version "1.0" of type "GOLANG" for chaincode "/" with args
      | funcName     | arg1                              |
      | GetChainInfo | com.acme.blockchain.jdoe.channel1 |

    And user "dev0Org0" using cert alias "consortium1-cert" creates a proposal "queryGetChainInfoProposalAfterAddCapsToExistChans" for channel "com.acme.blockchain.jdoe.channel1" using chaincode spec "qsccSpecGetChainInfoAfterAddCapsToExistChans"

    And user "dev0Org0" using cert alias "consortium1-cert" sends proposal "queryGetChainInfoProposalAfterAddCapsToExistChans" to endorsers with timeout of "30" seconds with proposal responses "queryGetChainInfoProposalResponsesAfterAddCapsToExistChans":
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    Then user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterAddCapsToExistChans" with status "200" from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |

    And user "dev0Org0" expects proposal responses "queryGetChainInfoProposalResponsesAfterAddCapsToExistChans" each have the same value from endorsers:
      | Endorser |
      | peer0    |
      | peer1    |
      | peer2    |
      | peer3    |



    ### TODO: Once events are working, consider listen event listener as well.



    # Note: to execute scenarios with ConsensusType=solo, we need to uncomment a couple lines. Search for "Ideally" to find them quickly...
    Examples: Orderer Options
      | ComposeFile                                           | SystemUpWaitTime | ConsensusType | ChannelJoinDelay | BroadcastWaitTime | orderer0 | orderer1 | orderer2 | OrdererSpecificInfo | RestartOrdererWaitTime | FabricBaseVersion | OrdererUpgradeVersion | RestartPeerWaitTime | PeerUpgradeVersion | VerifyAllBlockHeightsWaitTime |
#     | dc-base.yml                                           | 10               | solo          | 3                | 3                 | orderer0 | orderer0 | orderer0 |                     | 2                      | x86_64-1.0.4      | latest                | 2                   | latest             | 10                            |
#     | dc-base.yml dc-peer-couchdb.yml                       | 10               | solo          | 3                | 3                 | orderer0 | orderer0 | orderer0 |                     | 2                      | x86_64-1.0.4      | latest                | 30                  | latest             | 10                            |
      | dc-base.yml dc-orderer-kafka.yml                      | 30               | kafka         | 10               | 5                 | orderer0 | orderer1 | orderer2 |                     | 2                      | x86_64-1.0.4      | latest                | 30                  | latest             | 10                            |
#     | dc-base.yml dc-peer-couchdb.yml dc-orderer-kafka.yml  | 30               | kafka         | 10               | 5                 | orderer0 | orderer1 | orderer2 |                     | 2                      | x86_64-1.0.4      | latest                | 30                  | latest             | 10                            |
#     | dc-base.yml dc-peer-couchdb.yml dc-composer.yml       | 10               | solo          | 3                | 3                 | orderer0 | orderer0 | orderer0 |                     | 2                      | x86_64-1.0.4      | latest                | 30                   | latest             | 10                            |
