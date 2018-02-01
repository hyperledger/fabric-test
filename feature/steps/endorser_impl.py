#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

from behave import *
import sys
import os
import json
import time
import random
import string
import struct
import subprocess
import config_util
from endorser_util import CLIInterface, ToolInterface, SDKInterface


@when(u'a user sets up a channel named "{channelId}" using orderer "{orderer}"')
def setup_channel_impl(context, channelId, orderer, username="Admin"):
    # Be sure there is a transaction block for this channel
    config_util.generateChannelConfig(channelId, config_util.CHANNEL_PROFILE, context)
    peers = context.interface.get_peers(context)

    context.interface.create_channel(context, orderer, channelId, user=username)
    context.interface.fetch_channel(context, peers, orderer, channelId, user=username)
    context.interface.join_channel(context, peers, channelId, user=username)

    # If using any interface besides the CLI, we should add a few seconds delay to be sure
    # that the code executes successfully
    if not isinstance(context.interface, CLIInterface):
        time.sleep(3)

@when(u'a user sets up a channel named "{channelId}"')
def step_impl(context, channelId):
    setup_channel_impl(context, channelId, "orderer0.example.com")

@when(u'a user sets up a channel')
def step_impl(context):
    setup_channel_impl(context, context.interface.TEST_CHANNEL_ID, "orderer0.example.com")

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" with language "{language}" to "{peer}" on channel "{channel}" within {timeout:d} seconds')
def deploy_impl(context, path, args, name, language, peer, channel, timeout=300, username="Admin"):
    context.interface.deploy_chaincode(context, path, args, name, language, peer, username, timeout, channel)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" with language "{language}" to "{peer}" on channel "{channel}"')
def step_impl(context, path, args, name, language, peer, channel):
    deploy_impl(context, path, args, name, language, peer, channel, 300)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" to "{peer}" on channel "{channel}" within {timeout:d} seconds')
def step_impl(context, path, args, name, peer, channel, timeout):
    deploy_impl(context, path, args, name, "GOLANG", peer, channel, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" to "{peer}" on channel "{channel}"')
def step_impl(context, path, args, name, peer, channel):
    deploy_impl(context, path, args, name, "GOLANG", peer, channel)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" on the initial leader peer of "{org}"')
def step_impl(context, path, args, name, org):
    deploy_impl(context, path, args, name, "GOLANG", context.interface.get_initial_leader(context, org), context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" on the initial non-leader peer of "{org}"')
def step_impl(context, path, args, name, org):
    deploy_impl(context, path, args, name, "GOLANG", context.interface.get_initial_non_leader(context, org), context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" with language "{language}" on channel "{channel}" within {timeout:d} seconds')
def step_impl(context, path, args, name, language, channel, timeout):
    deploy_impl(context, path, args, name, language, "peer0.org1.example.com", channel, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" with language "{language}" on channel "{channel}"')
def step_impl(context, path, args, name, language, channel):
    deploy_impl(context, path, args, name, language, "peer0.org1.example.com", channel)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" with language "{language}" within {timeout:d} seconds')
def step_impl(context, path, args, name, language, timeout):
    deploy_impl(context, path, args, name, language, "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" with language "{language}"')
def step_impl(context, path, args, name, language):
    deploy_impl(context, path, args, name, language, "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode at path "{path}" with args {args} with language "{language}" within {timeout:d} seconds')
def step_impl(context, path, args, language, timeout):
    deploy_impl(context, path, args, "mycc", language, "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args} with language "{language}"')
def step_impl(context, path, args, language):
    deploy_impl(context, path, args, "mycc", language, "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" on channel "{channel}" within {timeout:d} seconds')
def step_impl(context, path, args, name, channel, timeout):
    deploy_impl(context, path, args, name, "GOLANG", "peer0.org1.example.com", channel, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" on channel "{channel}"')
def step_impl(context, path, args, name, channel):
    deploy_impl(context, path, args, name, "GOLANG", "peer0.org1.example.com", channel)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" within {timeout:d} seconds')
def step_impl(context, path, args, name, timeout):
    deploy_impl(context, path, args, name, "GOLANG", "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}"')
def step_impl(context, path, args, name):
    deploy_impl(context, path, args, name, "GOLANG", "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode at path "{path}" with args {args} within {timeout:d} seconds')
def step_impl(context, path, args, timeout):
    deploy_impl(context, path, args, "mycc", "GOLANG", "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID, timeout)

@when(u'a user deploys chaincode at path "{path}" with args {args}')
def step_impl(context, path, args):
    deploy_impl(context, path, args, "mycc", "GOLANG", "peer0.org1.example.com", context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode on channel "{channel}" with args {args} within {timeout:d} seconds')
def step_impl(context, channel, args, timeout):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                args,
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                channel, timeout)

@when(u'a user deploys chaincode on channel "{channel}" with args {args}')
def step_impl(context, channel, args):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                args,
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                channel)

@when(u'a user deploys chaincode on channel "{channel}" within {timeout:d} seconds')
def step_impl(context, channel, timeout):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                channel, timeout)

@when(u'a user deploys chaincode on channel "{channel}"')
def step_impl(context, channel):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                channel)

@when(u'a user deploys chaincode with name "{name}" on channel "{channel}" within {timeout:d} seconds')
def step_impl(context, name, channel, timeout):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                name,
                "GOLANG",
                "peer0.org1.example.com",
                channel, timeout)

@when(u'a user deploys chaincode with name "{name}" on channel "{channel}"')
def step_impl(context, name, channel):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                name,
                "GOLANG",
                "peer0.org1.example.com",
                channel)

@when(u'a user deploys chaincode with args {args} within {timeout:d} seconds')
def step_impl(context, args, timeout):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                args,
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                context.interface.TEST_CHANNEL_ID, timeout)

@when(u'a user deploys chaincode with args {args}')
def step_impl(context, args):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                args,
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                context.interface.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode within {timeout:d} seconds')
def step_impl(context, timeout):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                context.interface.TEST_CHANNEL_ID, timeout)

@when(u'a user deploys chaincode')
def step_impl(context):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                "mycc",
                "GOLANG",
                "peer0.org1.example.com",
                context.interface.TEST_CHANNEL_ID)

@when(u'a user installs chaincode at path "{path}" with args {args} with name "{name}" to "{peer}"')
def step_impl(context, path, args, name, peer, username="Admin"):
    context.interface.pre_deploy_chaincode(context, path, args, name, "GOLANG", peer)
    context.interface.install_chaincode(context, [peer], "Admin")

@when(u'a user installs chaincode')
def step_impl(context):
    context.interface.pre_deploy_chaincode(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                "mycc",
                "GOLANG",
                "peer0.org1.example.com")
    context.interface.install_chaincode(context, [peer], "Admin")

@when(u'a user instantiates the chaincode on "{peer}"')
def step_impl(context, peer, username="Admin", timeout=120):
    context.interface.instantiate_chaincode(context, peer, username)
    context.interface.post_deploy_chaincode(context, peer, timeout)

@when(u'a user queries for channel information')
def step_impl(context):
    get_chain_info_impl(context, context.interface.TEST_CHANNEL_ID)

@when(u'a user queries for channel information on channel "{channel}"')
def get_chain_info_impl(context, channel):
    chaincode = {"args": '["GetChainInfo","{}"]'.format(channel),
                 "chaincodeId": 'qscc',
                 "name": 'qscc'}
    context.result = context.interface.query_chaincode(context, chaincode, "peer0.org1.example.com", channel, user="Admin")

@when(u'a user queries for the first block')
def step_impl(context):
    get_block_num_impl(context, "1", context.interface.TEST_CHANNEL_ID)

@when(u'a user queries for the first block on the channel "{channel}"')
def step_impl(context, channel):
    get_block_num_impl(context, "1", channel)

@when(u'a user queries for block number "{number}" on the channel "{channel}"')
def get_block_num_impl(context, number, channel):
    updated_env = config_util.updateEnviron(context)
    time.sleep(2)
    chaincode = {"args": '["GetBlockByNumber","{0}","{1}"]'.format(channel, number),
                 "chaincodeId": 'qscc',
                 "name": 'qscc'}
    context.result = context.interface.query_chaincode(context, chaincode, "peer0.org1.example.com", channel, user="Admin")

@when(u'a user queries for last transaction using the transaction ID')
def step_impl(context, number, channel):
    chaincode = {"args": '["GetTransactionByID","{0}","{1}"]'.format(channel, txId),
                 "chaincodeId": 'qscc',
                 "name": 'qscc'}
    context.result = context.interface.query_chaincode(context, chaincode, "peer0.org1.example.com", channel, user="Admin")

@when(u'a user queries on the channel "{channel}" using chaincode named "{name}" for the random key with args {args} on "{peer}"')
def step_impl(context, channel, name, args, peer):
    query_impl(context, channel, name, args.format(random_key=context.random_key), peer)

@when(u'a user queries on the chaincode named "{name}" for the random key with args {args} on "{peer}"')
def step_impl(context, name, args, peer):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args.format(random_key=context.random_key), peer)

@when(u'a user queries on the chaincode named "{name}" for the random key with args {args}')
def step_impl(context, name, args):
    print("in the step_imp for random query ")
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args.format(random_key=context.random_key), "peer0.org1.example.com")

@when(u'a user queries on the chaincode for the random key with args {args}"')
def step_impl(context, args):
    query_impl(context, context.interface.TEST_CHANNEL_ID, "mycc", args.format(random_key=context.random_key), "peer0.org1.example.com")

@when(u'a user queries on the chaincode named "{name}" with args {args} on the initial leader peer of "{org}"')
def step_impl(context, name, args, org):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, context.interface.get_initial_leader(context, org))

@when(u'a user queries on the chaincode named "{name}" with args {args} on the initial non-leader peer of "{org}"')
def step_impl(context, name, args, org):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, context.interface.get_initial_non_leader(context, org))

@when(u'a user queries on the channel "{channel}" using chaincode named "{name}" with args {args} on "{peer}"')
def query_impl(context, channel, name, args, peer, targs=''):
    # Temporarily sleep for 2 sec. This delay should be able to be removed once we start using events for being sure the invokes are complete
    time.sleep(2)
    chaincode = {"args": args,
                 "chaincodeId": str(name),
                 "name": str(name)}
    context.result = context.interface.query_chaincode(context, chaincode, peer, channel, targs)

@when(u'a user queries on the chaincode named "{name}" with args {args} and generated transient args {targs} on "{peer}"')
def step_impl(context, name, args, peer, targs):
    # This is a workaround to allow targs to send a json structure
    generated = targs[2:-2].format(**context.command_result)
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, peer, targs[:2] + generated+ targs[-2:])

@when(u'a user queries on the chaincode named "{name}" with args {args} and generated transient args {targs}')
def step_impl(context, name, args, targs):
    # This is a workaround to allow targs to send a json structure
    generated = targs[2:-2].format(**context.command_result)
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com", targs[:2] + generated + targs[-2:])

@when(u'a user queries on the chaincode named "{name}" with args {args} and transient args {targs} on "{peer}"')
def step_impl(context, name, args, peer, targs):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, peer, targs)

@when(u'a user queries on the chaincode named "{name}" with args {args} and transient args {targs}')
def step_impl(context, name, args, targs):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com", targs)

@when(u'a user queries on the chaincode named "{name}" with args {args} on "{peer}"')
def step_impl(context, name, args, peer):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, peer)

@when(u'a user queries on the chaincode named "{name}" on channel "{channel}" with args {args}')
def step_impl(context, name, channel, args):
    query_impl(context, channel, name, args, "peer0.org1.example.com")

@when(u'a user queries on the chaincode named "{name}" with args {args}')
def step_impl(context, name, args):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com")

@when(u'a user queries on the channel "{channel}" using chaincode named "{name}" with args {args}')
def step_impl(context, channel, name, args):
    query_impl(context, channel, name, args, "peer0.org1.example.com")

@when(u'a user queries on the chaincode on channel "{channel}" with args {args}')
def step_impl(context, channel, args):
    query_impl(context, channel, "mycc", args, "peer0.org1.example.com")

@when(u'a user queries on the chaincode with args {args} from "{peer}"')
def step_impl(context, args, peer):
    query_impl(context, context.interface.TEST_CHANNEL_ID, "mycc", args, peer)

@when(u'a user queries on the chaincode with args {args}')
def step_impl(context, args):
    query_impl(context, context.interface.TEST_CHANNEL_ID, "mycc", args, "peer0.org1.example.com")

@when(u'a user queries on the chaincode named "{name}"')
def step_impl(context, name):
    query_impl(context, context.interface.TEST_CHANNEL_ID, name, '["query","a"]', "peer0.org1.example.com")

@when(u'a user queries on the chaincode')
def step_impl(context):
    query_impl(context, context.interface.TEST_CHANNEL_ID, "mycc", '["query","a"]', "peer0.org1.example.com")

@when(u'a user invokes {numInvokes:d} times on the channel "{channel}" using chaincode named "{name}" with args {args} on "{peer}" using orderer "{orderer}"')
def invokes_impl(context, numInvokes, channel, name, args, peer, orderer="orderer0.example.com", targs=''):
    chaincode = {"args": args,
                 "name": str(name),
                 "chaincodeId": str(name)}
    for count in range(numInvokes):
        context.result = context.interface.invoke_chaincode(context, chaincode, orderer, peer, channel, targs)

@when(u'a user invokes {numInvokes:d} times on the channel "{channel}" using chaincode named "{name}" with args {args} on "{peer}"')
def step_impl(context, numInvokes, channel, name, args):
    invokes_impl(context, numInvokes, channel, name, args, "peer0.org1.example.com")

@when(u'a user invokes {numInvokes:d} times on the channel "{channel}" using chaincode named "{name}" with args {args}')
def step_impl(context, numInvokes, channel, name, args):
    invokes_impl(context, numInvokes, channel, name, args, "peer0.org1.example.com")

@when(u'a user invokes {numInvokes:d} times using chaincode with args {args}')
def step_impl(context, numInvokes, args):
    invokes_impl(context, numInvokes, context.interface.TEST_CHANNEL_ID, "mycc", args, "peer0.org1.example.com")

@when(u'a user invokes {numInvokes:d} times using chaincode named "{name}" with args {args}')
def step_impl(context, numInvokes, name, args):
    invokes_impl(context, numInvokes, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com")

@when(u'a user invokes on the channel "{channel}" using chaincode named "{name}" with args {args} on "{peer}"')
def step_impl(context, channel, name, args, peer):
    invokes_impl(context, 1, channel, name, args, peer)

@when(u'a user invokes on the chaincode named "{name}" with args {args} and generated transient args {targs} on "{peer}"')
def step_impl(context, name, args, targs, peer):
    # This is a workaround to allow targs to send a json structure
    generated = targs[2:-2].format(**context.command_result)
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, peer, targs=targs[:2] + generated + targs[-2:])

@when(u'a user invokes on the chaincode named "{name}" with args {args} and generated transient args {targs}')
def step_impl(context, name, args, targs):
    # This is a workaround to allow targs to send a json structure
    generated = targs[2:-2].format(**context.command_result)
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com", targs=targs[:2] + generated + targs[-2:])

@when(u'a user invokes on the chaincode named "{name}" with args {args} and transient args {targs} on "{peer}"')
def step_impl(context, name, args, peer, targs):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, peer, targs=targs)

@when(u'a user invokes on the chaincode named "{name}" with args {args} and transient args {targs}')
def step_impl(context, name, args, targs):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com", targs=targs)

@when(u'a user invokes on the chaincode named "{name}" with args {args} on "{peer}"')
def step_impl(context, name, args, peer):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, peer)

@when(u'a user invokes on the chaincode with args {args}')
def step_impl(context, args):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, "mycc", args, "peer0.org1.example.com")

@when(u'a user invokes on the channel "{channel}" using chaincode named "{name}" with args {args}')
def step_impl(context, channel, name, args):
    invokes_impl(context, 1, channel, name, args, "peer0.org1.example.com")

@when(u'a user invokes on the chaincode named "{name}" with args {args} on the initial leader peer of "{org}"')
def step_impl(context, name, args, org):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, context.interface.get_initial_leader(context, org))

@when(u'a user invokes on the chaincode named "{name}" with args {args} on the initial non-leader peer of "{org}"')
def step_impl(context, name, args, org):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, context.interface.get_initial_non_leader(context, org))

@when(u'a user invokes on the chaincode named "{name}" with args {args} on {peer}')
def step_impl(context, name, args, peer):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, peer)

@when(u'a user invokes on the chaincode named "{name}" with args {args}')
def step_impl(context, name, args):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com")

@when(u'a user invokes {numInvokes:d} times on the chaincode')
def step_impl(context, numInvokes):
    invokes_impl(context, numInvokes, context.interface.TEST_CHANNEL_ID, "mycc", '["invoke","a","b","5"]', "peer0.org1.example.com")

@when(u'a user invokes on the chaincode named "{name}" with random args {args} of length {length:d} on peer "{peer}" using orderer "{orderer}"')
def random_invoke_impl(context, name, args, length, peer, orderer):
    payload = ''.join(random.choice(string.ascii_letters) for _ in range(length))
    random_key = str(random.randint(0, sys.maxint))
    context.payload = {"payload": payload,
                    "len": length}
    context.random_key=random_key
    chaincode = {"args": args.format(random_value=payload, random_key=random_key),
                 "chaincodeId": str(name),
                 "name": str(name)}
    context.result = context.interface.invoke_chaincode(context, chaincode, orderer, peer, context.interface.TEST_CHANNEL_ID)

@when(u'a user invokes on the chaincode named "{name}" with random args {args} of length {length:d} on peer "{peer}"')
def step_impl(context, name, args, length):
    random_invoke_impl(context, name, args, length, "peer0.org1.example.com", "orderer0.example.com")

@when(u'a user invokes on the chaincode named "{name}" with random args {args} of length {length:d}')
def step_impl(context, name, args, length):
    random_invoke_impl(context, name, args, length, "peer0.org1.example.com", "orderer0.example.com")

@when(u'a user invokes on the chaincode named "{name}" with random args {args}')
def step_impl(context, name, args):
    random_invoke_impl(context, name, args, 1024, "peer0.org1.example.com", "orderer0.example.com")

@when(u'a user invokes on the chaincode named "{name}"')
def step_impl(context, name):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, name, '["invoke","a","b","5"]', "peer0.org1.example.com")

@when(u'a user invokes on the chaincode')
def step_impl(context):
    invokes_impl(context, 1, context.interface.TEST_CHANNEL_ID, "mycc", '["invoke","a","b","5"]', "peer0.org1.example.com")

@when(u'a user creates a channel named "{channelId}" using orderer "{orderer}')
def create_channel_impl(context, channelId, orderer):
    # Be sure there is a transaction block for this channel
    if not os.path.exists("./configs/{0}/{1}.tx".format(context.projectName, channelId)):
        config_util.generateChannelConfig(channelId, config_util.CHANNEL_PROFILE, context)
    context.interface.create_channel(context, orderer, channelId)

@when(u'a user creates a channel named "{channelId}"')
def step_impl(context, channelId):
    create_channel_impl(context, channelId, "orderer0.example.com")

@when(u'a user creates a channel')
def step_impl(context):
    create_channel_impl(context, context.interface.TEST_CHANNEL_ID, "orderer0.example.com")

@when(u'a user makes all peers join the channel "{channelId}"')
def join_channel_impl(context, channelId):
    peers = context.interface.get_peers(context)
    context.interface.join_channel(context, peers, channelId)

@when(u'a user makes all peers join the channel')
def step_impl(context):
    join_channel_impl(context, context.interface.TEST_CHANNEL_ID)

@when(u'a user makes peer "{peer}" join the channel "{channelId}"')
def step_impl(context, channelId, peer):
    context.interface.join_channel(context, [peer], channelId)

@when(u'a user makes peer "{peer}" join the channel')
def step_impl(context, peer):
    context.interface.join_channel(context, [peer], context.interface.TEST_CHANNEL_ID)

@when(u'a user fetches genesis information for a channel "{channelID}" from peer "{peer}" using "{orderer}" to location "{location}"')
def fetch_impl(context, channelID, peer, orderer, location, ext="block"):
    context.interface.fetch_channel(context, [peer], orderer, channelID, location, ext=ext)

@when(u'a user fetches genesis information for a channel "{channelID}" from peer "{peer}" to location "{location}"')
def step_impl(context, channelID, peer, location):
    fetch_impl(context, channelID, peer, "orderer0.example.com", location, ext='tx')

@when(u'a user fetches genesis information for a channel "{channelID}" from peer "{peer}"')
def step_impl(context, channelID, peer):
    fetch_impl(context, channelID, peer, "orderer0.example.com", None)

@when(u'a user fetches genesis information from peer "{peer}" using "{orderer}" to location "{location}"')
def step_impl(context, peer, orderer, location):
    fetch_impl(context, context.interface.TEST_CHANNEL_ID, peer, orderer, location)

@when(u'a user fetches genesis information from peer "{peer}" using "{orderer}"')
def step_impl(context, peer, orderer):
    fetch_impl(context, context.interface.TEST_CHANNEL_ID, peer, orderer, None)

@when(u'a user fetches genesis information from peer "{peer}"')
def step_impl(context, peer):
    fetch_impl(context, context.interface.TEST_CHANNEL_ID, peer, "orderer0.example.com", None)

@then(u'a user receives {status} response of {response} from the initial leader peer of "{org}"')
def step_impl(context, response, org, status):
    expected_impl(context, response, context.interface.get_initial_leader(context, org))

@then(u'a user receives {status} response of {response} from the initial non-leader peer of "{org}"')
def step_impl(context, response, org, status):
    expected_impl(context, response, context.interface.get_initial_non_leader(context, org))

@then(u'a user receives {status} response of {response} from "{peer}"')
def expected_impl(context, response, peer, status="a success"):
    assert peer in context.result, "There is no response from {0}".format(peer)
    if status == "a success":
        assert context.result[peer] == "Query Result: {0}\n".format(response), \
               "Expected response was {0}; received {1}".format(response,
                                                                context.result[peer])
    elif status == "an error":
        assert "Error:" in context.result[peer], "There was not an error response: {0}".format(context.result[peer])
        assert response in context.result[peer], "Expected response was {0}; received {1}".format(response, context.result[peer])
    else:
        assert False, "Unknown response type: {}. Please choose success or error".format(status)


@then(u'a user receives {status} response of {response}')
def step_impl(context, response, status="a success"):
    expected_impl(context, response, "peer0.org1.example.com", status)

@then(u'a user receives a response with the {valueType} value from "{peer}"')
def set_response_impl(context, valueType, peer):
    assert peer in context.result, "There is no response from {0}".format(peer)
    assert "Error endorsing query" not in context.result[peer], "There was an error response: {0}".format(context.result[peer])
    if valueType == "length":
        try:
            assert len(context.result[peer])-15 == context.payload["len"], \
                 "Expected response to be of length {0}; received length {1}; Result: {2}".format(context.payload["len"],
                                                                                                  len(context.result[peer]),
                                                                                                  context.result[peer])
        except:
            # There are some chaincodes that are adding quotes around their responses (such as map), so we check for quotes as well
            # Take a look at the 15th character so that the "Query Result: " string is not included and the second to last (last is \n)
            assert (len(context.result[peer])-17 == context.payload["len"]) and (context.result[peer][14] == '"' and context.result[peer][-2] == '"'), \
                 "Expected response to be of length {0}; received length {1}; Result: {2}".format(context.payload["len"],
                                                                                                  len(context.result[peer]),
                                                                                                  context.result[peer])
    elif valueType == "random":
        assert context.payload["payload"] in context.result[peer], \
             "Expected response does not match the actual response; Result: {0}".format(context.result[peer])
    else:
        assert False, "Unknown value type {}. This type may need to be implemented in the framework.".format(valueType)

@then(u'a user receives a response with the {valueType} value')
def step_impl(context, valueType):
    set_response_impl(context, valueType, "peer0.org1.example.com")

@then(u'a user receives a response containing a value of length {length:d} from "{peer}"')
def length_impl(context, length, peer):
    assert peer in context.result, "There is no response from {0}".format(peer)
    assert "Error endorsing query" not in context.result[peer], "There was an error response: {0}".format(context.result[peer])
    try:
        assert len(context.result[peer])-15 == length, \
            "Expected response to be of length {0}; received length {1}; Result: {2}".format(length,
                                                                                             len(context.result[peer]),
                                                                                             context.result[peer])
    except:
        # There are some chaincodes that are adding quotes around their responses (such as map), so we check for quotes as well
        # Take a look at the 15th character so that the "Query Result: " string is not included and the second to last (last is \n)
        assert (len(context.result[peer])-17 == length) and (context.result[peer][14] == '"' and context.result[peer][-2] == '"'), \
            "Expected response to be of length {0}; received length {1}; Result: {2}".format(length,
                                                                                             len(context.result[peer]),
                                                                                             context.result[peer])

@then(u'a user receives a response containing a value of length {length:d}')
def step_impl(context, length):
    length_impl(context, length, "peer0.org1.example.com")

@then(u'a user receives a response containing {response} from "{peer}"')
def containing_impl(context, response, peer):
    assert peer in context.result, "There is no response from {0}".format(peer)
    print("Type of result: {}".format(type(context.result[peer])))
    if type(response) == type(context.result[peer]):
        assert response in context.result[peer][13:], "Expected response was {0}; received {1}".format(response, context.result[peer])
    else:
        assert str(response) in context.result[peer][13:], "Expected response was {0}; received {1}".format(response, context.result[peer])

@then(u'a user receives a response containing {response}')
def step_impl(context, response):
    containing_impl(context, response, "peer0.org1.example.com")

@then(u'a user receives a response not containing {response} from "{peer}"')
def not_containing_impl(context, response, peer):
    assert peer in context.result, "There is no response from {0}".format(peer)
    assert response not in context.result[peer], "Received response {0} (Expected it to NOT contain {1})".format(context.result[peer], response)

@then(u'a user receives a response not containing {response}')
def step_impl(context, response):
    not_containing_impl(context, response, "peer0.org1.example.com")

@then(u'the "{fileName}" file is fetched from peer "{peer}" at location "{location}"')
def block_found_impl(context, fileName, peer, location=None):
    if location is None:
        location = "/var/hyperledger/configs/{0}".format(context.projectName)

    output = context.composition.docker_exec(["ls", location], [peer])
    assert fileName in output[peer], "The channel block file has not been fetched"

@then(u'the block file is fetched from peer "{peer}" at location "{location}"')
def step_impl(context, peer, location):
    block_found_impl(context, context.interface.TEST_CHANNEL_ID, peer, location)

@then(u'the "{fileName}" file is fetched from peer "{peer}"')
def step_impl(context, fileName, peer):
    info = fileName.split('.')
    block_found_impl(context, info[0], peer, None)
