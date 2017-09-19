#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

import config_util
import json
import os
import shutil
import subprocess
import sys
import time
import common_util

try:
    pbFilePath = "../fabric/bddtests"
    sys.path.insert(0, pbFilePath)
    from peer import chaincode_pb2
except:
    print("ERROR! Unable to import the protobuf libraries from the ../fabric/bddtests directory: {0}".format(sys.exc_info()[0]))
    sys.exit(1)

# The default channel ID
SYS_CHANNEL_ID = "behavesyschan"
TEST_CHANNEL_ID = "behavesystest"


class InterfaceBase:
    # The default channel ID
    SYS_CHANNEL_ID = "behavesyschan"
    TEST_CHANNEL_ID = "behavesystest"

    def get_orderers(self, context):
        orderers = []
        for container in context.composition.collectServiceNames():
            if container.startswith("orderer"):
                orderers.append(container)
        return orderers

    def get_peers(self, context):
        peers = []
        for container in context.composition.collectServiceNames():
            if container.startswith("peer"):
                peers.append(container)
        return peers

    def deploy_chaincode(self, context, chaincode, containers, channelId=TEST_CHANNEL_ID):
        for container in containers:
            assert container in context.composition.collectServiceNames(), "Unknown component '{0}'".format(container)

        orderers = self.get_orderers(context)
        peers = self.get_peers(context)
        assert orderers != [], "There are no active orderers in this network"

        chaincode.update({"orderers": orderers,
                          "channelID": channelId,
                          })

        if not hasattr(context, "network") and not self.channel_block_present(context, containers, channelId):
            config_util.generateChannelConfig(channelId, config_util.CHANNEL_PROFILE, context)

        self.install_chaincode(context, chaincode, peers)
        self.instantiate_chaincode(context, chaincode, containers)

    def channel_block_present(self, context, containers, channelId):
        ret = False
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = context.composition.docker_exec(["ls", configDir], containers)
        for container in containers:
            if "{0}.tx".format(channelId) in output[container]:
                ret |= True
        print("Channel Block Present Result {0}".format(ret))
        return ret

    def get_initial_leader(self, context, org):
        if not hasattr(context, 'initial_leader'):
            context.initial_leader={}
        if org not in context.initial_leader:
            for container in self.get_peers(context):
                if ((org in container) and self.is_in_log(container, "Becoming a leader")):
                    context.initial_leader[org]=container
                    print("initial leader is "+context.initial_leader[org])
                    return context.initial_leader[org]
            assert org in context.initial_leader.keys(), "Error: No gossip-leader found by looking at the logs, for "+org
        return context.initial_leader[org]

    def get_initial_non_leader(self, context, org):
        if not hasattr(context, 'initial_non_leader'):
            context.initial_non_leader={}
        if org not in context.initial_non_leader:
            for container in self.get_peers(context):
                if ((org in container) and not self.is_in_log(container, "Becoming a leader")):
                    context.initial_non_leader[org]=container
                    print("initial non-leader is "+context.initial_non_leader[org])
                    return context.initial_non_leader[org]
            assert org in context.initial_non_leader.keys(), "Error: No gossip-leader found by looking at the logs, for "+org
        return context.initial_non_leader[org]

    def is_in_log(self, container, keyText):
        rc = subprocess.call(
                "docker logs "+container+" 2>&1 | grep "+"\""+keyText+"\"",
                shell=True)
        if rc==0:
            return True
        return False


class ToolInterface(InterfaceBase):
    def __init__(self, context):
        pass


class SDKInterface(InterfaceBase):
    def __init__(self, language):
        # use PyExecJS for executing NodeJS code - https://pypi.python.org/pypi/PyExecJS
        # use Pyjnius for executing Java code - http://pyjnius.readthedocs.io/en/latest/index.html
        pass


class CLIInterface(InterfaceBase):

    def get_env_vars(self, context, peer="peer0.org1.example.com", includeAll=True):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = ["/bin/bash", "-c",
                 '"CORE_PEER_MSPCONFIGPATH={0}/peerOrganizations/{1}/users/Admin@{1}/msp'.format(configDir, org)]

        if includeAll:
            setup += ['CORE_PEER_LOCALMSPID={0}'.format(org),
                      'CORE_PEER_ID={0}'.format(peer),
                      'CORE_PEER_ADDRESS={0}:7051'.format(peer)]

        if context.tls:
            setup.append('CORE_PEER_TLS_ROOTCERT_FILE={0}/peerOrganizations/{1}/peers/{2}/tls/ca.crt'.format(configDir, org, peer))
            setup.append('CORE_PEER_TLS_CERT_FILE={0}/peerOrganizations/{1}/peers/{2}/tls/server.crt'.format(configDir, org, peer))
            setup.append('CORE_PEER_TLS_KEY_FILE={0}/peerOrganizations/{1}/peers/{2}/tls/server.key'.format(configDir, org, peer))
        return setup

    def get_chaincode_deploy_spec(self, projectDir, ccType, path, name, args):
        subprocess.call(["peer", "chaincode", "package",
                         "-n", name,
                         "-c", '{"Args":{0}}'.format(args),
                         "-p", path,
                         "configs/{0}/test.file".format(projectDir)], shell=True)
        ccDeploymentSpec = chaincode_pb2.ChaincodeDeploymentSpec()
        with open("test.file", 'rb') as f:
            ccDeploymentSpec.ParseFromString(f.read())
        return ccDeploymentSpec

    def install_chaincode(self, context, chaincode, peers):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = {}
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer)
            command = ["peer", "chaincode", "install",
                       "--name", chaincode['name'],
                       "--lang", chaincode['language'],
                       "--version", str(chaincode.get('version', 0)),
                       "--path", chaincode['path']]
            if "orderers" in chaincode:
                command = command + ["--orderer", '{0}:7050'.format(chaincode["orderers"][0])]
            if "user" in chaincode:
                command = command + ["--username", chaincode["user"]]
            if "policy" in chaincode:
                command = command + ["--policy", chaincode["policy"]]
            command.append('"')
            ret = context.composition.docker_exec(setup+command, ['cli'])
            output[peer] = ret['cli']
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def instantiate_chaincode(self, context, chaincode, peers):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        args = chaincode.get('args', '[]').replace('"', r'\"')
        output = {}
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer)
            command = ["peer", "chaincode", "instantiate",
                       "--name", chaincode['name'],
                       "--version", str(chaincode.get('version', 0)),
                       "--lang", chaincode['language'],
                       "--channelID", str(chaincode.get('channelID', TEST_CHANNEL_ID)),
                       "--ctor", r"""'{\"Args\": %s}'""" % (args)]
            if context.tls:
                command = command + ["--tls",
                                     common_util.convertBoolean(context.tls),
                                     "--cafile",
                                     '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
            if "orderers" in chaincode:
                command = command + ["--orderer", '{0}:7050'.format(chaincode["orderers"][0])]
            if "user" in chaincode:
                command = command + ["--username", chaincode["user"]]
            if "policy" in chaincode:
                command = command + ["--policy", chaincode["policy"]]
            command.append('"')

            output[peer] = context.composition.docker_exec(setup + command, [peer])
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output


    def create_channel(self, context, orderers, channelId=TEST_CHANNEL_ID):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, "peer0.org1.example.com")
        command = ["peer", "channel", "create",
                   "--file", "/var/hyperledger/configs/{0}/{1}.tx".format(context.composition.projectName, channelId),
                   "--channelID", channelId,
                   "--timeout", "120", # This sets the timeout for the channel creation instead of the default 5 seconds
                   "--orderer", '{0}:7050'.format(orderers[0])]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]

        command.append('"')

        output = context.composition.docker_exec(setup+command, ['cli'])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        assert "Error:" not in output, "Unable to successfully create channel {}".format(channelId)

#        # For now, copy the channel block to the config directory
#        output = context.composition.docker_exec(["cp",
#                                                  "{0}.block".format(channelId),
#                                                  configDir],
#                                                 ['cli'])
#        print("[{0}]: {1}".format(" ".join(command), output))
        return output

    def fetch_channel(self, context, peers, orderers, channelId=TEST_CHANNEL_ID, location=None):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        if not location:
            location = configDir

        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, False)
            command = ["peer", "channel", "fetch", "config",
                       "{0}/{1}.block".format(location, channelId),
                       "--channelID", channelId,
                       "--orderer", '{0}:7050'.format(orderers[0])]
            if context.tls:
                command = command + ["--tls",
                                     "--cafile",
                                     '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]

            command.append('"')

            output = context.composition.docker_exec(setup+command, [peer])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        return output

    def join_channel(self, context, peers, orderers, channelId=TEST_CHANNEL_ID):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)

        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer)
            command = ["peer", "channel", "join",
                       "--blockpath", '/var/hyperledger/configs/{0}/{1}.block"'.format(context.composition.projectName, channelId)]
            count = 0
            output = "Error"

            # Try joining the channel 5 times with a 2 second delay between tries
            while count < 5 and "Error" in output:
                output = context.composition.docker_exec(setup+command, [peer])
                time.sleep(2)
                count = count + 1
                output = output[peer]

        print("[{0}]: {1}".format(" ".join(setup+command), output))
        return output

    def invoke_chaincode(self, context, chaincode, orderers, peer, channelId=TEST_CHANNEL_ID):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        args = chaincode.get('args', '[]').replace('"', r'\"')
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = self.get_env_vars(context, peer)
        command = ["peer", "chaincode", "invoke",
                   "--name", chaincode['name'],
                   "--ctor", r"""'{\"Args\": %s}'""" % (args),
                   "--channelID", channelId]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
        command = command + ["--orderer", '{0}:7050'.format(orderers[0])]
        command.append('"')
        output = context.composition.docker_exec(setup+command, [peer])
        print("Invoke[{0}]: {1}".format(" ".join(setup+command), str(output)))
        return output


    def query_chaincode(self, context, chaincode, peer, channelId=TEST_CHANNEL_ID):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        args = chaincode.get('args', '[]').replace('"', r'\"')
        setup = self.get_env_vars(context, peer)
        command = ["peer", "chaincode", "query",
                   "--name", chaincode['name'],
                   "--ctor", r"""'{\"Args\": %s}'""" % (args),
                   "--channelID", channelId, '"']
        print("Query Exec command: {0}".format(" ".join(setup+command)))
        return context.composition.docker_exec(setup+command, [peer])
