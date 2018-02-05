# Copyright IBM Corp. 2016 All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from collections import defaultdict
from behave import *
from contexthelper import ContextHelper
import endorser_util
import bootstrap_util
import orderer_util
import compose
import composer
import time
import ast

@given(u'the orderer network has organizations')
def step_impl(context):
    assert 'table' in context, "Expected table of orderer organizations"
    directory = bootstrap_util.getDirectory(context)
    for row in context.table.rows:
        org = directory.getOrganization(row['Organization'], shouldCreate = True)
        org.addToNetwork(bootstrap_util.Network.Orderer)


@given(u'user requests role of orderer admin by creating a key and csr for orderer and acquires signed certificate from organization')
def step_impl(context):
    assert 'table' in context, "Expected table with triplet of User/Orderer/Organization"
    directory = bootstrap_util.getDirectory(context)
    for row in context.table.rows:
        nodeAdminTuple = directory.registerOrdererAdminTuple(row['User'], row['Orderer'], row['Organization'])
        aliasToSaveUnder = row['AliasSavedUnder']
        if aliasToSaveUnder != "":
            directory.getUser(row['User']).setTagValue(aliasToSaveUnder, nodeAdminTuple)

@given(u'user requests role for peer by creating a key and csr for peer and acquires signed certificate from organization')
def step_impl(context):
    assert 'table' in context, "Expected table with triplet of User/Peer/Organization"
    directory = bootstrap_util.getDirectory(context)
    for row in context.table.rows:
        nodeAdminTuple = directory.registerOrdererAdminTuple(row['User'], row['Peer'], row['Organization'])
        aliasToSaveUnder = row['AliasSavedUnder']
        if aliasToSaveUnder != "":
            directory.getUser(row['User']).setTagValue(aliasToSaveUnder, nodeAdminTuple)


@given(u'the peer network has organizations')
def step_impl(context):
    assert 'table' in context, "Expected table of peer network organizations"
    directory = bootstrap_util.getDirectory(context)
    for row in context.table.rows:
        org = directory.getOrganization(row['Organization'], shouldCreate = True)
        org.addToNetwork(bootstrap_util.Network.Peer)

@given(u'a ordererBootstrapAdmin is identified and given access to all public certificates and orderer node info')
def step_impl(context):
    directory = bootstrap_util.getDirectory(context)
    assert len(directory.ordererAdminTuples) > 0, "No orderer admin tuples defined!!!"
    # Simply create the user
    bootstrap_util.getOrdererBootstrapAdmin(context, shouldCreate=True)

@given(u'the ordererBootstrapAdmin using cert alias "{certAlias}" creates the genesis block "{ordererGenesisBlockName}" for chain "{ordererSystemChainIdName}" for composition "{composeFile}" and consensus "{consensusType}" with consortiums modification policy "{consortiumsModPolicy}" using consortiums')
def step_impl(context, certAlias, ordererGenesisBlockName, ordererSystemChainIdName, composeFile, consensusType, consortiumsModPolicy):
    directory = bootstrap_util.getDirectory(context=context)
    contextHelper = ContextHelper.GetHelper(context=context)
    bootstrap_helper = contextHelper.get_bootstrap_helper()

    ordererBootstrapAdmin = bootstrap_util.getOrdererBootstrapAdmin(context)
    ordererSystemChainIdGUUID = ordererBootstrapAdmin.tags[ordererSystemChainIdName]
    # Now collect the named signed config items
    configGroups =[bootstrap_util.getDefaultConsortiumGroup(consortiumsModPolicy)]
    for row in context.table.rows:
        configGroupName = row['Consortium']
        configGroups += ordererBootstrapAdmin.tags[configGroupName]
    # Concatenate signedConfigItems

    service_names = compose.Composition(context, composeFilesYaml=composeFile, register_and_up=False).getServiceNames()

    # Construct block
    nodeAdminTuple = ordererBootstrapAdmin.tags[certAlias]
    bootstrapCert = directory.findCertForNodeAdminTuple(nodeAdminTuple=nodeAdminTuple)
    (genesisBlock, envelope, genesis_block_channel_config) = bootstrap_helper.create_genesis_block(context=context,
                                                                                                   service_names=service_names,
                                                                                                   chainId=ordererSystemChainIdGUUID,
                                                                                                   consensusType=consensusType,
                                                                                                   nodeAdminTuple=nodeAdminTuple,
                                                                                                   signedConfigItems=configGroups)
    ordererBootstrapAdmin.setTagValue(ordererGenesisBlockName + "_genesis_channel_config", genesis_block_channel_config)
    ordererBootstrapAdmin.setTagValue(ordererGenesisBlockName, genesisBlock)
    ordererBootstrapAdmin.setTagValue("ConsensusType", consensusType)
    ordererCallback = bootstrap_util.OrdererGensisBlockCompositionCallback(context, genesisBlock)
    peerCallback = bootstrap_util.PeerCompositionCallback(context)
    composer.ComposerCompositionCallback(context, peerCallback)

@given(u'the orderer admins inspect and approve the genesis block for chain "{chainId}"')
def step_impl(context, chainId):
    pass

@given(u'the orderer admins use the genesis block for chain "{chainId}" to configure orderers')
def step_impl(context, chainId):
    pass
    #raise NotImplementedError(u'STEP: Given the orderer admins use the genesis block for chain "testchainid" to configure orderers')

@given(u'the ordererBootstrapAdmin generates a GUUID to identify the orderer system chain and refer to it by name as "{ordererSystemChainId}"')
def step_impl(context, ordererSystemChainId):
    directory = bootstrap_util.getDirectory(context)
    ordererBootstrapAdmin = bootstrap_util.getOrdererBootstrapAdmin(context)
    chaind_id = bootstrap_util.GetUniqueChannelName()
    ordererBootstrapAdmin.setTagValue(ordererSystemChainId, chaind_id)


@given(u'the orderer config admin "{ordererConfigAdmin}" creates a consortium "{consortiumName}" with modification policy "{modPolicy}" for peer orgs who wish to form a network')
def step_impl(context, ordererConfigAdmin, consortiumName, modPolicy):
    directory = bootstrap_util.getDirectory(context)
    ordererConfigAdmin = directory.getUser(ordererConfigAdmin)

    # Collect the orgs from the table
    orgNames = [row['Organization'] for row in context.table.rows]
    bootstrap_util.addOrdererBootstrapAdminOrgReferences(context, consortiumName, orgNames)

    consortium = bootstrap_util.create_consortium(context=context, consortium_name=consortiumName, org_names=orgNames, mod_policy=modPolicy)
    ordererConfigAdmin.setTagValue(consortiumName, consortium)

@given(u'the orderer config admin "{ordererConfigAdmin}" creates a consortiums config update "{consortiumsConfigUpdateName}" using config "{configName}" using orderer system channel ID "{ordererSystemChainIdName}" to add consortiums')
def step_impl(context, ordererConfigAdmin, consortiumsConfigUpdateName, configName, ordererSystemChainIdName):
    '''
    channel group/Consortiums/
    Read the consortiums Group from existing genesis block.
    '''
    directory = bootstrap_util.getDirectory(context)
    ordererConfigAdmin = directory.getUser(ordererConfigAdmin)
    channel_group = ordererConfigAdmin.getTagValue(configName)
    orderer_system_chain_id = ordererConfigAdmin.getTagValue(ordererSystemChainIdName)
    config_groups = []
    # Now collect the consortiums
    for row in context.table.rows:
        config_groups.append(ordererConfigAdmin.getTagValue(row['Consortium']))
    config_update = bootstrap_util.create_orderer_consortium_config_update(orderer_system_chain_id, channel_group, config_groups)
    ordererConfigAdmin.setTagValue(tagKey=consortiumsConfigUpdateName, tagValue=config_update)

@given(u'the user "{userName}" creates a peer organization set "{peerOrgSetName}" with peer organizations')
def step_impl(context, userName, peerOrgSetName):
    ' At the moment, only really defining MSP Config Items (NOT SIGNED)'
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName)
    user.setTagValue(peerOrgSetName, [directory.getOrganization(row['Organization']).name for row in context.table.rows])

@given(u'the user "{userName}" creates a configUpdateEnvelope "{configUpdateEnvelopeName}" using configUpdate "{configUpdateName}"')
def step_impl(context, userName, configUpdateEnvelopeName, configUpdateName):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName)
    config_update_envelope = bootstrap_util.create_config_update_envelope(config_update=user.getTagValue(configUpdateName))
    user.setTagValue(tagKey=configUpdateEnvelopeName, tagValue=config_update_envelope)

@given(u'the user "{userName}" creates a new channel ConfigUpdate "{create_channel_config_update_name}" using consortium "{consortium_name}"')
def step_impl(context, userName, create_channel_config_update_name, consortium_name):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName)
    consortium_config_group = user.getTagValue(tagKey=consortium_name)

    peer_org_set = user.getTagValue(tagKey=context.table.rows[0]["PeerOrgSet"])
    peer_anchor_set_tag_key = context.table.rows[0]["[PeerAnchorSet]"]
    peer_anchor_config_group = None
    if peer_anchor_set_tag_key != "":
        peer_anchor_config_group = user.getTagValue(tagKey=peer_anchor_set_tag_key)

    channel_id = context.table.rows[0]["ChannelID"]
    # Loop through templates referenced orgs
    # mspOrgNames = [org.name for org in user.tags[templateName]]
    #TODO: Where does the system_channel_version come from?
    system_channel_version = 0
    channel_config_update = bootstrap_util.create_channel_config_update(system_channel_version, channel_id, consortium_config_group)

    # Add the anchors config group
    if peer_anchor_config_group:
        bootstrap_util.merge_config_groups(channel_config_update.write_set, peer_anchor_config_group)

    #Make sure orgs exist in consortium
    for orgName in peer_org_set:
        assert orgName in channel_config_update.write_set.groups['Application'].groups.keys(), "PeerOrgSet entry {0} not found in consortium".format(orgName)

    # Strip out any organizations that are NOT referenced in peerOrgSet
    for orgName in channel_config_update.write_set.groups['Application'].groups.keys():
        if not orgName in peer_org_set:
            del(channel_config_update.read_set.groups['Application'].groups[orgName])
            del(channel_config_update.write_set.groups['Application'].groups[orgName])

    user.setTagValue(create_channel_config_update_name, channel_config_update)

@Given(u'the user "{user_name}" creates an existing channel config update "{existing_channel_config_update_name}" using config update "{input_config_update_name}"')
def step_impl(context, user_name, existing_channel_config_update_name, input_config_update_name):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(user_name)

    input_config_update = user.getTagValue(tagKey=input_config_update_name)

    channel_id = context.table.rows[0]["ChannelID"]

    peer_anchor_set_tag_key = context.table.rows[0]["[PeerAnchorSet]"]
    peer_anchor_config_group = None
    if peer_anchor_set_tag_key != "":
        peer_anchor_config_group = user.getTagValue(tagKey=peer_anchor_set_tag_key)


    assert peer_anchor_config_group != None, "Required to specify a PeerAnchorSet for now"
    #TODO: Where does the system_channel_version come from?
    system_channel_version = 0
    channel_config_update = bootstrap_util.create_existing_channel_config_update(system_channel_version=system_channel_version,
                                                                                 channel_id=channel_id,
                                                                                 input_config_update=input_config_update,
                                                                                 config_groups=[peer_anchor_config_group])

    user.setTagValue(existing_channel_config_update_name, channel_config_update)

@given(u'the following application developers are defined for peer organizations and each saves their cert as alias')
def step_impl(context):
    assert 'table' in context, "Expected table with triplet of Developer/Consortium/Organization"
    directory = bootstrap_util.getDirectory(context)
    for row in context.table.rows:
        userName = row['Developer']
        nodeAdminNamedTuple = directory.registerOrdererAdminTuple(userName, row['Consortium'], row['Organization'])
        user = directory.getUser(userName)
        user.setTagValue(row['AliasSavedUnder'], nodeAdminNamedTuple)

@given(u'the user "{userName}" collects signatures for ConfigUpdateEnvelope "{createChannelSignedConfigEnvelopeName}" from developers')
def step_impl(context, userName, createChannelSignedConfigEnvelopeName):
    assert 'table' in context, "Expected table of peer organizations"
    directory = bootstrap_util.getDirectory(context)
    contextHelper = ContextHelper.GetHelper(context=context)
    bootstrap_helper = contextHelper.get_bootstrap_helper()
    user = directory.getUser(userName=userName)
    config_update_envelope = user.tags[createChannelSignedConfigEnvelopeName]
    for row in context.table.rows:
        user = directory.getUser(row['Developer'])
        namedAdminTuple = user.tags[row['Cert Alias']]
        cert = directory.findCertForNodeAdminTuple(namedAdminTuple)
        bootstrap_helper.add_signature_to_config_update_envelope(config_update_envelope, (user, namedAdminTuple.organization, cert))

@given(u'the user "{userName}" creates a ConfigUpdate Tx "{configUpdateTxName}" using cert alias "{certAlias}" using signed ConfigUpdateEnvelope "{createChannelSignedConfigEnvelopeName}"')
def step_impl(context, userName, certAlias, configUpdateTxName, createChannelSignedConfigEnvelopeName):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    namedAdminTuple = user.tags[certAlias]
    cert = directory.findCertForNodeAdminTuple(namedAdminTuple)
    config_update_envelope = user.tags[createChannelSignedConfigEnvelopeName]
    config_update = bootstrap_util.get_config_update_from_envelope(config_update_envelope)
    envelope_for_config_update = bootstrap_util.create_envelope_for_msg(directory=directory,
                                                                        nodeAdminTuple=namedAdminTuple,
                                                                        chainId=config_update.channel_id,
                                                                        msg=config_update_envelope,
                                                                        typeAsString="CONFIG_UPDATE")
    user.setTagValue(configUpdateTxName, envelope_for_config_update)

@given(u'the user "{userName}" using cert alias "{certAlias}" broadcasts ConfigUpdate Tx "{configTxName}" to orderer "{orderer}"')
def step_impl(context, userName, certAlias, configTxName, orderer):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    configTxEnvelope = user.tags[configTxName]
    bootstrap_util.broadcast_channel_config_tx(context=context, certAlias=certAlias, composeService=orderer, user=user, configTxEnvelope=configTxEnvelope)

@when(u'the user "{userName}" broadcasts transaction "{transactionAlias}" to orderer "{orderer}"')
def step_impl(context, userName, transactionAlias, orderer):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    transaction = user.tags[transactionAlias]
    bootstrap_util.broadcast_channel_config_tx(context=context, certAlias=None, composeService=orderer, user=user, configTxEnvelope=transaction)


@when(u'user "{userName}" using cert alias "{certAlias}" connects to deliver function on node "{composeService}" using port "{port}"')
@Given(u'user "{userName}" using cert alias "{certAlias}" connects to deliver function on node "{composeService}" using port "{port}"')
def step_impl(context, userName, certAlias, composeService, port):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    user.connectToDeliverFunction(context, composeService, nodeAdminTuple=user.tags[certAlias], port=port)

@when(u'user "{userName}" sends deliver a seek request on node "{composeService}" with properties')
def step_impl(context, userName, composeService):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    row = context.table.rows[0]
    chainID = row['ChainId']
    start, end, = orderer_util.convertSeek(row['Start']), orderer_util.convertSeek(row['End'])
    print("Start and end = {0}/{1}".format(start, end))
    print("")
    streamHelper = user.getDelivererStreamHelper(context, composeService)
    streamHelper.seekToRange(chainID=chainID, start = start, end = end)

@given(u'user "{userName}" retrieves the latest config block "{latest_config_name}" from orderer "{service_name}" for channel "{channel_id_or_ref}"')
def step_impl(context, userName, latest_config_name, service_name, channel_id_or_ref):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    (channel_id,) = bootstrap_util.get_args_for_user([channel_id_or_ref], user)
    streamHelper = user.getDelivererStreamHelper(context, service_name)
    latest_config_block = bootstrap_util.get_latest_configuration_block(deliverer_stream_helper=streamHelper, channel_id=channel_id)
    channel_group = bootstrap_util.get_channel_group_from_config_block(latest_config_block)
    user.setTagValue(tagKey=latest_config_name, tagValue=channel_group)
    # raise NotImplementedError(u'STEP: Given user "configAdminOrdererOrg0" retrieves the latest configuration "latestOrdererConfig" from orderer "orderer0" for channel "OrdererSystemChainId"')

@then(u'user "{userName}" should get a delivery "{deliveryName}" from "{composeService}" of "{expectedBlocks}" blocks with "{numMsgsToBroadcast}" messages within "{batchTimeout}" seconds')
def step_impl(context, userName, deliveryName, composeService, expectedBlocks, numMsgsToBroadcast, batchTimeout):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    streamHelper = user.getDelivererStreamHelper(context, composeService)

    blocks = streamHelper.getBlocks()

    # Verify block count
    assert len(blocks) == int(expectedBlocks), "Expected {0} blocks, received {1}".format(expectedBlocks, len(blocks))
    user.setTagValue(deliveryName, blocks)

@when(u'user "{userName}" using cert alias "{certAlias}" requests to join channel using genesis block "{genisisBlockName}" on peers with result "{joinChannelResult}"')
def step_impl(context, userName, certAlias, genisisBlockName, joinChannelResult):
    timeout = 10
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName)
    nodeAdminTuple = user.tags[certAlias]
    # Find the cert using the cert tuple information saved for the user under certAlias
    signersCert = directory.findCertForNodeAdminTuple(nodeAdminTuple)

    # Retrieve the genesis block from the returned value of deliver (Will be list with first block as genesis block)
    genesisBlock = user.tags[genisisBlockName][0]
    ccSpec = endorser_util.getChaincodeSpec("GOLANG", "", "cscc", ["JoinChain", genesisBlock.SerializeToString()])
    proposal = endorser_util.createInvokeProposalForBDD(context, ccSpec=ccSpec, chainID="",signersCert=signersCert, Mspid=user.tags[certAlias].organization, type="CONFIG")
    signedProposal = endorser_util.signProposal(proposal=proposal, entity=user, signersCert=signersCert)

    # Send proposal to each specified endorser, waiting 'timeout' seconds for response/error
    endorsers = [row['Peer'] for row in context.table.rows]
    proposalResponseFutures = [endorserStub.ProcessProposal.future(signedProposal, int(timeout)) for endorserStub in endorser_util.getEndorserStubs(context,composeServices=endorsers, directory=directory, nodeAdminTuple=nodeAdminTuple)]
    resultsDict =  dict(zip(endorsers, [respFuture.result() for respFuture in proposalResponseFutures]))
    user.setTagValue(joinChannelResult, resultsDict)


@then(u'user "{userName}" expects result code for "{proposalResponseName}" of "{proposalResponseResultCode}" from peers')
def step_impl(context, userName, proposalResponseName, proposalResponseResultCode):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    peerToProposalResponseDict = user.tags[proposalResponseName]
    unexpectedResponses = [(composeService,proposalResponse) for composeService, proposalResponse in peerToProposalResponseDict.items() if str(proposalResponse.response.status) != proposalResponseResultCode]
    assert len(unexpectedResponses) ==0, 'Received unexpected result code(s): {0}'.format(unexpectedResponses)
    print("ProposalResponse: \n{0}\n".format(proposalResponse))
    print("")

@given(u'the user "{userName}" creates an peer anchor set "{anchorSetName}" for orgs')
def step_impl(context, userName, anchorSetName):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=userName)
    nodeAdminTuples = [directory.findNodeAdminTuple(row['User'], row['Peer'], row['Organization']) for row in context.table.rows]
    user.setTagValue(anchorSetName, bootstrap_util.getAnchorPeersConfigGroup(context=context, nodeAdminTuples=nodeAdminTuples))


@given(u'we set the base fabric version to "{default_fabric_version}"')
def step_impl(context, default_fabric_version):
    compose.Composition.set_default_version(context, default_fabric_version)

@given(u'we compose "{composeYamlFile}"')
def step_impl(context, composeYamlFile):
    # time.sleep(10)              # Should be replaced with a definitive interlock guaranteeing that all peers/membersrvc are ready
    composition = compose.Composition(context, composeYamlFile)
    context.compose_containers = composition.containerDataList
    context.composition = composition

def check_state(container_data, state_status, state_running):
    current_state_status = container_data.inspect_data['State']['Status']
    assert  current_state_status == state_status, "Expected State:Status of {0} for service {1}, instead found {2}".format(state_status, container_data.composeService, current_state_status)
    assert container_data.inspect_data['State']['Running'] == ast.literal_eval(state_running), "Expected State:Running to be {0} for service {1}, instead found {2}".format(state_running, container_data.composeService, container_data.inspect_data['State']['Running'])


@then(u'all services should have state with status of "{state_status}" and running is "{state_running}" with the following exceptions')
def step_impl(context, state_status, state_running):
    assert "composition" in context, "No composition found in context"
    composition = context.composition
    exceptional_services = [row['Service'] for row in context.table.rows]

    # First make sure all of the exceptional services are in the service list
    difference = set(exceptional_services).difference(set(composition.getServiceNames()))
    assert len(difference) == 0, "Exceptional service(s) not found: {0}".format(difference)

    # Rebuild the container data first
    composition.rebuildContainerData()

    # Verify the service that are NOT in the exception list are in expected State
    for container_data in [c for c in composition.containerDataList if not c.composeService in exceptional_services]:
        check_state(container_data, state_status, state_running)

    # Now Verify the exceptional services are in their specified State
    for row in context.table.rows:
        container_data = next(c for c in composition.containerDataList if c.composeService == row['Service'])
        check_state(container_data, row['Status'], row['Running'])

@given(u'I wait "{seconds}" seconds')
def step_impl(context, seconds):
    time.sleep(float(seconds))

@when(u'I wait "{seconds}" seconds')
def step_impl(context, seconds):
    time.sleep(float(seconds))

@then(u'I wait "{seconds}" seconds')
def step_impl(context, seconds):
    time.sleep(float(seconds))

@given(u'user "{userNameSource}" gives "{objectAlias}" to user "{userNameTarget}" who saves it as "{target_alias}"')
def step_impl(context, userNameSource, objectAlias, userNameTarget, target_alias):
    directory = bootstrap_util.getDirectory(context)
    userSource = directory.getUser(userName=userNameSource)
    userTarget = directory.getUser(userName=userNameTarget)
    userTarget.setTagValue(target_alias, userSource.tags[objectAlias])

@given(u'the ordererBootstrapAdmin creates a cert alias "{certAlias}" for orderer network bootstrap purposes for organizations')
def step_impl(context, certAlias):
    assert "table" in context, "Expected table of Organizations"
    directory = bootstrap_util.getDirectory(context)
    ordererBootstrapAdmin = bootstrap_util.getOrdererBootstrapAdmin(context)
    assert len(context.table.rows) == 1, "Only support single orderer orgnaization at moment"
    for row in context.table.rows:
        nodeAdminNamedTuple = directory.registerOrdererAdminTuple(ordererBootstrapAdmin.name, "ordererBootstrapAdmin", row['Organization'])
        ordererBootstrapAdmin.setTagValue(certAlias, nodeAdminNamedTuple)

@given(u'we "{command}" service "{service_name}"')
def step_impl(context, command, service_name):
    assert "composition" in context, "No composition found in context"
    composition = context.composition
    composition.issueCommand([command], [service_name])

@given(u'user "{user_name}" issues the "{command}" command to "{service_name}"')
def step_impl(context, user_name, command, service_name):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=user_name)
    assert "composition" in context, "No composition found in context"
    composition = context.composition
    composition.issueCommand([command], [service_name])

@given(u'user "{user_name}" creates a signature policy envelope "{sig_policy_env_name}" using "{sig_policy_as_string}"')
def step_impl(context, user_name, sig_policy_env_name, sig_policy_as_string):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=user_name)
    policy_parser = bootstrap_util.PolicyParser(directory)
    sig_policy_env = policy_parser.parse(sig_policy_as_string)
    user.setTagValue(tagKey=sig_policy_env_name, tagValue=sig_policy_env)

@given(u'user "{user_name}" creates a serialized identity "{serialized_identity_name}" using cert alias "{cert_alias}"')
def step_impl(context, user_name, serialized_identity_name, cert_alias):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=user_name)
    nat = user.getTagValue(cert_alias)
    signers_cert = directory.findCertForNodeAdminTuple(nat)
    serialized_identity = endorser_util.create_serialized_identity(msp_id=nat.organization, signers_cert=signers_cert)
    user.setTagValue(tagKey=serialized_identity_name, tagValue=serialized_identity)

@given(u'user "{user_name}" invokes "{function}" on "{alias_target}" saving result as "{alias_result}"')
def step_impl(context, user_name, function, alias_target, alias_result):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=user_name)
    target = user.getTagValue(alias_target)
    result = None
    exec('result = target.{0}'.format(function))
    user.setTagValue(tagKey=alias_result, tagValue=result)

@when(u'the user "{user_name}" using cert alias "{cert_alias}" adds organization "{org_name}" to channel "{channel_id}" using orderer "{compose_service}" collecting signatures from')
def step_impl(context, user_name, cert_alias, org_name, channel_id, compose_service):
    directory = bootstrap_util.getDirectory(context)
    requesting_config_admin = directory.getUser(userName=user_name)
    requesting_config_admin_nat = requesting_config_admin.tags[cert_alias]
    signing_nats = [directory.getUser(row['User']).getTagValue(row['Cert Alias']) for row in context.table.rows]
    bootstrap_util.add_org_to_channel(context, directory, requesting_config_admin_nat, signing_nats, directory.getOrganization(org_name), channel_id)

@given(u'user "{user_name}" upgrades "{compose_service}" to version "{upgrade_version}"')
def step_impl(context, user_name, compose_service, upgrade_version):
    directory = bootstrap_util.getDirectory(context)
    user = directory.getUser(userName=user_name)
    assert "composition" in context, "No composition found in context"
    composition = context.composition
    composition.issueCommand(['stop'],[compose_service])
    composition.issueCommand(['rm','-f'],[compose_service])
    composition.set_version_for_service(compose_service, upgrade_version)
    composition.issueCommand(['up','-d'],[compose_service])


@given(u'all users disconnect from orderers')
def step_impl(context):
    directory = bootstrap_util.getDirectory(context)
    directory.cleanup()

@given(u'user "{user_name}" creates a capabilities config update "{config_update_alias}" using config "{config_update_source_alias}" using channel ID "{channel_id_or_ref}" with mod policy "{mod_policy}" to add capabilities')
def step_impl(context, user_name, config_update_alias, config_update_source_alias, channel_id_or_ref, mod_policy):
    contextHelper = ContextHelper.GetHelper(context=context)
    bootstrap_helper = contextHelper.get_bootstrap_helper()
    directory = bootstrap_util.getDirectory(context)
    config_admin = directory.getUser(user_name)
    (channel_id,) = bootstrap_util.get_args_for_user([channel_id_or_ref], config_admin)
    source_channel_group = config_admin.getTagValue(config_update_source_alias)
    group_to_capabilities_to_add = defaultdict(set)
    [group_to_capabilities_to_add[row['Group']].add(row['Capabilities']) for row in context.table.rows]
    # new_config_group = bootstrap_helper.add_capabilities(config_group=source_channel_group.groups[group_name], capabilities_to_add=capabilities_to_add)
    new_config_update = bootstrap_helper.create_capabilities_config_update(channel_id=channel_id, config_group=source_channel_group, group_to_capabilities_to_add=group_to_capabilities_to_add)
    config_admin.setTagValue(config_update_alias, new_config_update)


@given(u'all orderer admins agree to upgrade')
def step_impl(context):
    pass

@given(u'all peer admins remove existing chaincode docker images')
def step_impl(context):
    assert "composition" in context, "No composition found in context"
    composition = context.composition
    composition.remove_chaincode_containers()
    composition.remove_chaincode_images()
