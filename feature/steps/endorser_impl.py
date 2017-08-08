# Copyright IBM Corp. 2017 All Rights Reserved.
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

from behave import *
import json
import time
import subprocess
import random
import string
import endorser_util
import config_util


@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" to "{containerName}" on channel "{channel}"')
def deploy_impl(context, path, args, name, containerName, channel):
    # Be sure there is a transaction block for this channel
    config_util.generateChannelConfig(channel, config_util.CHANNEL_PROFILE, context)

    chaincode = {
        "path": path,
        "language": "GOLANG",
        "name": name,
        "channelID": channel,
        "args": args,
    }
    context.results = endorser_util.deploy_chaincode(context, chaincode, [containerName], channel)
    # Save chaincode name and path and args
    context.chaincode = chaincode

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}" on channel "{channel}"')
def step_impl(context, path, args, name, channel):
    deploy_impl(context, path, args, name, "peer0.org1.example.com", channel)

@when(u'a user deploys chaincode at path "{path}" with args {args} with name "{name}"')
def step_impl(context, path, args, name):
    deploy_impl(context, path, args, name, "peer0.org1.example.com", endorser_util.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode at path "{path}" with args {args}')
def step_impl(context, path, args):
    deploy_impl(context, path, args, "mycc", "peer0.org1.example.com", endorser_util.TEST_CHANNEL_ID)

@when(u'a user deploys chaincode')
def step_impl(context):
    deploy_impl(context,
                "github.com/hyperledger/fabric/examples/chaincode/go/chaincode_example02",
                '["init", "a", "100" , "b", "200"]',
                "mycc",
                "peer0.org1.example.com",
                (endorser_util.TEST_CHANNEL_ID))

@when(u'a user queries on the channel "{channel}" using chaincode named "{name}" with args {args} on "{component}"')
def query_impl(context, channel, name, args, component):
    # Temporarily sleep for 2 sec. This delay should be able to be removed once we start using the python sdk
    time.sleep(2)
    chaincode = {"args": args,
                 "name": name}
    context.result = endorser_util.query_chaincode(context, chaincode, component, channel)

@when(u'a user queries on the chaincode named "{name}" with args {args} on "{component}"')
def step_impl(context, name, args, component):
    query_impl(context, endorser_util.TEST_CHANNEL_ID, name, args, component)

@when(u'a user queries on the chaincode named "{name}" with args {args}')
def step_impl(context, name, args):
    query_impl(context, endorser_util.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com")

@when(u'a user queries on the chaincode with args {args}')
def step_impl(context, args):
    query_impl(context, endorser_util.TEST_CHANNEL_ID, "mycc", args, "peer0.org1.example.com")

@when(u'a user queries on the chaincode named "{name}"')
def step_impl(context, name):
    query_impl(context, endorser_util.TEST_CHANNEL_ID, name, '["query","a"]', "peer0.org1.example.com")

@when(u'a user queries on the chaincode')
def step_impl(context):
    query_impl(context, endorser_util.TEST_CHANNEL_ID, "mycc", '["query","a"]', "peer0.org1.example.com")

@when(u'a user invokes {numInvokes} times on the channel "{channel}" using chaincode named "{name}" with args {args} on "{component}"')
def invokes_impl(context, numInvokes, channel, name, args, component):
    chaincode = {"args": args,
                 "name": name}
    orderers = endorser_util.get_orderers(context)
    for count in range(int(numInvokes)):
        context.result = endorser_util.invoke_chaincode(context, chaincode, orderers, component, channel)

@when(u'a user invokes {numInvokes} times on the channel "{channel}" using chaincode named "{name}" with args {args}')
def step_impl(context, numInvokes, channel, name, args):
    invokes_impl(context, numInvokes, channel, name, args, "peer0.org1.example.com")

@when(u'a user invokes {numInvokes} times using chaincode named "{name}" with args {args}')
def step_impl(context, numInvokes, name, args):
    invokes_impl(context, numInvokes, endorser_util.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com")

@when(u'a user invokes on the chaincode named "{name}" with args {args}')
def step_impl(context, name, args):
    invokes_impl(context, 1, endorser_util.TEST_CHANNEL_ID, name, args, "peer0.org1.example.com")

@when(u'a user invokes {numInvokes} times on the chaincode')
def step_impl(context, numInvokes):
    invokes_impl(context, numInvokes, endorser_util.TEST_CHANNEL_ID, "mycc", '["invoke","a","b","5"]', "peer0.org1.example.com")

@when(u'a user invokes on the chaincode named "{name}" with random args {args} of length {length:d} on peer "{peer}"')
def random_invoke_impl(context, name, args, length, peer):
    payload = ''.join(random.choice(string.ascii_letters) for _ in range(length))
    context.payload = {"payload": payload,
                    "len": length}
    chaincode = {"args": args.format(random=payload),
                 "name": name}
    orderers = endorser_util.get_orderers(context)
    context.result = endorser_util.invoke_chaincode(context,
                                                    chaincode,
                                                    orderers,
                                                    peer,
                                                    endorser_util.TEST_CHANNEL_ID)

@when(u'a user invokes on the chaincode named "{name}" with random args {args} of length {length:d}')
def step_impl(context, name, args, length):
    random_invoke_impl(context, name, args, length, "peer0.org1.example.com")

@when(u'a user invokes on the chaincode named "{name}" with random args {args}')
def step_impl(context, name, args):
    random_invoke_impl(context, name, args, 1024, "peer0.org1.example.com")

@when(u'a user invokes on the chaincode named "{name}"')
def step_impl(context, name):
    invokes_impl(context, 1, endorser_util.TEST_CHANNEL_ID, name, '["invoke","a","b","5"]', "peer0.org1.example.com")

@when(u'a user invokes on the chaincode')
def step_impl(context):
    invokes_impl(context, 1, endorser_util.TEST_CHANNEL_ID, "mycc", '["invoke","a","b","5"]', "peer0.org1.example.com")

@when(u'a user creates a channel "{channelID}" on peer "{peer}"')
def step_impl(context, channelID, peer):
    orderers = endorser_util.get_orderers(context)
    endorser_util.create_channel(context, [peer], orderers, channelID)

@when(u'a user joins a channel "{channelID}" on peer "{peer}"')
def step_impl(context, channelID, peer):
    orderers = endorser_util.get_orderers(context)
    endorser_util.join_channel(context, [peer], orderers, channelID)

@when(u'a user fetches genesis information for a channel "{channelID}" from peer "{peer}"')
def step_impl(context, channelID, peer):
    orderers = endorser_util.get_orderers(context)
    endorser_util.fetch_channel(context, [peer], orderers, channelID, location=".")

@then(u'the chaincode is deployed')
def step_impl(context):
    # Temporarily sleep for 2 sec. This delay should be able to be removed once we start using the python sdk
    time.sleep(2)

    peers = endorser_util.get_peers(context)

    # Verify that a chaincode container has started
    containers = subprocess.check_output(["docker ps -a"], shell=True)
    chaincode_container = "{0}-{1}-{2}-0".format(context.composition.projectName,
                                                 peers[0],
                                                 context.chaincode['name'])
    assert chaincode_container in containers, "The chaincode container is not running"

@then(u'a user receives {status} response of {response} from "{peer}"')
def expected_impl(context, response, peer, status="a success"):
    assert peer in context.result, "There is no response from {0}".format(peer)
    if status == "a success":
        assert context.result[peer] == "Query Result: {0}\n".format(response), "Expected response was {0}; received {1}".format(response, context.result[peer])
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
        assert len(context.result[peer])-15 == context.payload["len"], \
             "Expected response to be of length {0}; received length {1}; Result: {2}".format(context.payload["len"], len(context.result[peer]), context.result[peer])
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
    assert len(context.result[peer])-15 == length, \
        "Expected response to be of length {0}; received length {1}; Result: {2}".format(length,
                                                                                         len(context.result[peer]),
                                                                                         context.result[peer])

@then(u'a user receives a response containing a value of length {length:d}')
def step_impl(context, length):
    length_impl(context, length, "peer0.org1.example.com")


@then(u'a user receives a response containing {response} from "{peer}"')
def containing_impl(context, response, peer):
    assert peer in context.result, "There is no response from {0}".format(peer)
    assert response in context.result[peer], "Expected response was {0}; received {1}".format(response, context.result[peer])

@then(u'a user receives a response containing {response}')
def step_impl(context, response):
    containing_impl(context, response, "peer0.org1.example.com")
