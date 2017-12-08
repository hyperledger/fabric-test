#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

from behave import *
import os
import config_util
import orderer_util
import common_util

TEST_CHANNEL_ID = "syschannel"

@given(u'I have a fabric config file')
def step_impl(context):
    config_util.generateCrypto(context)
    config_util.setupConfigs(context, TEST_CHANNEL_ID)

@given(u'I have a crypto config file with {numOrgs} orgs, {numPeers} peers, {numOrderers} orderers, and {numUsers} users')
def step_impl(context, numOrgs, numPeers, numOrderers, numUsers):
    config_util.buildCryptoFile(context, numOrgs, numPeers, numOrderers, numUsers)

@when(u'the network is bootstrapped for an orderer of type {ordererType}')
def ordererBootstrap_impl(context, ordererType):
    profile = config_util.PROFILE_TYPES[ordererType]
    config_util.generateOrdererConfig(context, TEST_CHANNEL_ID, profile, "orderer.block")

@when(u'the network is bootstrapped for an orderer')
def step_impl(context):
    ordererBootstrap_impl(context, "solo")

@when(u'the network is bootstrapped for a channel named "{channelId}"')
def step_impl(context, channelId):
    config_util.generateChannelConfig(channelId, config_util.CHANNEL_PROFILE, context)

@when(u'the crypto material is generated for TLS network')
@when(u'the crypto material is generated')
def step_impl(context):
    config_util.generateCrypto(context, "./configs/{0}/crypto.yaml".format(context.projectName))

@then(u'crypto directories are generated containing certificates for {numOrgs} orgs, {numPeers} peers, {numOrderers} orderers, and {numUsers} users')
def step_impl(context, numOrgs, numPeers, numOrderers, numUsers):
    config_util.generateCryptoDir(context, numOrgs, numPeers, numOrderers, numUsers, tlsExist=False)

@then(u'crypto directories are generated containing tls certificates for {numOrgs} orgs, {numPeers} peers, {numOrderers} orderers, and {numUsers} users')
def step_impl(context, numOrgs, numPeers, numOrderers, numUsers):
    config_util.generateCryptoDir(context, numOrgs, numPeers, numOrderers, numUsers, tlsExist=True)

@then(u'the "{fileName}" file is generated')
def step_impl(context, fileName):
    assert hasattr(context, "projectName"), "There is no projectName assigned for this test"
    assert os.path.exists("./configs/{0}/{1}".format(context.projectName, fileName)), "The file {0} does not exist".format(fileName)

@then(u'the orderer block "{fileName}" contains {value}')
def step_impl(context, fileName, value):
    blockInfo = config_util.inspectOrdererConfig(context, fileName)
    assert str(value) in str(blockInfo)

@then(u'the channel transaction file "{fileName}" contains {value}')
def step_impl(context, fileName, value):
    blockInfo = config_util.inspectChannelConfig(context, fileName)
    assert str(value) in str(blockInfo)

@when('the orderer node logs receiving the orderer block')
def step_impl(context):
     orderers = orderer_util.getOrdererList(context)
     for orderer in orderers:
       assert common_util.is_in_log([orderer], "with genesis block hash"), "The genesis block is not received"
