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
import time
import os
import uuid
import compose_util
import config_util
import endorser_util


@given(u'I wait "{seconds}" seconds')
@when(u'I wait "{seconds}" seconds')
@then(u'I wait "{seconds}" seconds')
def step_impl(context, seconds):
    time.sleep(float(seconds))

@given(u'I compose "{composeYamlFile}"')
def compose_impl(context, composeYamlFile, projectName=None, startContainers=True):
    if not hasattr(context, "composition"):
       context.composition = compose_util.Composition(context, composeYamlFile,
                                           projectName=projectName,
                                           startContainers=startContainers)
    else:
        context.composition.composeFilesYaml = composeYamlFile
        context.composition.up()
    context.compose_containers = context.composition.collectServiceNames()

@given(u'I have a bootstrapped fabric network')
def step_impl(context):
    bootstrapped_impl(context, "solo")

@given(u'I have a bootstrapped fabric network of type {ordererType}')
def bootstrapped_impl(context, ordererType):
    assert ordererType in config_util.ORDERER_TYPES, "Unknown network type '%s'" % ordererType
    curpath = os.path.realpath('.')
    context.composeFile = "%s/docker-compose/docker-compose-%s.yml" % (curpath, ordererType)
    assert os.path.exists(context.composeFile), "The docker compose file does not exist: {0}".format(context.composeFile)
    context.ordererProfile = config_util.PROFILE_TYPES.get(ordererType, "SampleInsecureSolo")
    channelID = endorser_util.SYS_CHANNEL_ID
    if hasattr(context,"composition"):
        context.projectName = context.composition.projectName
    else:
        context.projectName = str(uuid.uuid1()).replace('-','')
    config_util.generateCrypto(context)
    config_util.generateConfig(context, channelID, config_util.CHANNEL_PROFILE, context.ordererProfile)
    compose_impl(context, context.composeFile, projectName=context.projectName)

@given(u'"{component}" is taken down')
def step_impl(context, component):
    assert component in context.composition.collectServiceNames(), "Unknown component '{0}'".format(component)
    context.composition.stop([component])

@given(u'"{component}" comes back up')
def step_impl(context, component):
    assert component in context.composition.collectServiceNames(), "Unknown component '{0}'".format(component)
    context.composition.start([component])

@when(u'I start a fabric network using a {ordererType} orderer service')
def start_network_impl(context, ordererType):
    assert ordererType in config_util.ORDERER_TYPES, "Unknown network type '%s'" % ordererType
    curpath = os.path.realpath('.')
    context.composeFile = "%s/docker-compose/docker-compose-%s.yml" % (curpath, ordererType)
    assert os.path.exists(context.composeFile), "The docker compose file does not exist: {0}".format(context.composeFile)
    compose_impl(context, context.composeFile, projectName=context.projectName)

@when(u'I start a fabric network')
def step_impl(context):
    start_network_impl(context, "solo")
