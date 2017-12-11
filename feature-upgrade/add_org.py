from steps import bootstrap_util
from common import configtx_pb2 as common_dot_configtx_pb2

contextHelper = bootstrap_util.ContextHelper.GetHelper(context=context)
bootstrap_helper = contextHelper.get_bootstrap_helper()

config_admin_peerOrg0 = directory.getUser('configAdminPeerOrg0')
channel_id = 'com.acme.blockchain.jdoe.channel1'
deliverer_stream_helper = config_admin_peerOrg0.connectToDeliverFunction(context, 'orderer0', config_admin_peerOrg0.tags['config-admin-cert'])
latest_config_block = bootstrap_util.get_latest_configuration_block(deliverer_stream_helper, channel_id)
latest_channel_group = bootstrap_util.get_channel_group_from_config_block(latest_config_block)

read_set = common_dot_configtx_pb2.ConfigGroup()
write_set = common_dot_configtx_pb2.ConfigGroup()

read_set.CopyFrom(latest_channel_group)
write_set.CopyFrom(read_set)

org_to_add = directory.getOrganization('peerOrg2')

# Add the MSP Config
write_set.groups[bootstrap_util.ApplicationGroup].groups[org_to_add.name].values[bootstrap_helper.KEY_MSP_INFO].value = bootstrap_util.toValue(
    bootstrap_util.get_msp_config(org=org_to_add, directory=directory))
write_set.groups[bootstrap_util.ApplicationGroup].groups[org_to_add.name].values[bootstrap_helper.KEY_MSP_INFO].mod_policy=bootstrap_helper.KEY_POLICY_ADMINS
# bootstrap_util.set_default_msp_config_for_orgs(directory=directory, channel=write_set, orgs=[org_to_add], group_name=bootstrap_util.ApplicationGroup)
bootstrap_util.set_default_policies_for_orgs(channel=write_set, orgs=[org_to_add], group_name=bootstrap_util.ApplicationGroup)

# Now increment the ApplicationGroup version because keyset changed
write_set.groups[bootstrap_util.ApplicationGroup].version+=1

config_update = common_dot_configtx_pb2.ConfigUpdate(channel_id=channel_id, read_set=read_set, write_set=write_set)
config_update_envelope = bootstrap_util.create_config_update_envelope(config_update=config_update)


#Now add the signature(s), requires 2 in this case
config_admin_peerOrg0_nat = config_admin_peerOrg0.tags['config-admin-cert']
bootstrap_helper.add_signature_to_config_update_envelope(config_update_envelope, (config_admin_peerOrg0, config_admin_peerOrg0_nat.organization, directory.findCertForNodeAdminTuple(config_admin_peerOrg0_nat)))

config_admin_peerOrg1 = directory.getUser('configAdminPeerOrg1')
config_admin_peerOrg1_nat = config_admin_peerOrg1.tags['config-admin-cert']
bootstrap_helper.add_signature_to_config_update_envelope(config_update_envelope, (config_admin_peerOrg1, config_admin_peerOrg1_nat.organization, directory.findCertForNodeAdminTuple(config_admin_peerOrg1_nat)))


envelope_for_config_update = bootstrap_util.create_envelope_for_msg(directory=directory,
                                                                    nodeAdminTuple=config_admin_peerOrg0_nat,
                                                                    chainId=channel_id,
                                                                    msg=config_update_envelope,
                                                                    typeAsString="CONFIG_UPDATE")
# Now broadcast to orderer
bootstrap_util.broadcast_channel_config_tx(context=context, certAlias=None, composeService='orderer0', user=config_admin_peerOrg0, configTxEnvelope=envelope_for_config_update)


