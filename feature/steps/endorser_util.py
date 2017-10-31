#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

import config_util
import json
import yaml
import os
import remote_util
import shutil
import subprocess
import sys
import time
import common_util
import execjs

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
        max_waittime=30
        waittime=5
        try:
            with common_util.Timeout(max_waittime):
                while  org not in context.initial_leader:
                    for container in self.get_peers(context):
                        if ((org in container) and common_util.is_in_log([container], "Becoming a leader")):
                            context.initial_leader[org]=container
                            print("initial leader is "+context.initial_leader[org])
                            break
                    time.sleep(waittime)
        finally:
            assert org in context.initial_leader, "Error: After " + str(max_waittime) + " seconds, no gossip-leader found by looking at the logs, for "+org
        return context.initial_leader[org]

    def get_initial_non_leader(self, context, org):
        self.get_initial_leader(context, org)
        if not hasattr(context, 'initial_non_leader'):
            context.initial_non_leader={}
        if org not in context.initial_non_leader:
            for container in self.get_peers(context):
                if (org in container) and (not common_util.is_in_log([container], "Becoming a leader")):
                    context.initial_non_leader[org]=container
                    print("initial non-leader is "+context.initial_non_leader[org])
                    return context.initial_non_leader[org]
        assert org in context.initial_non_leader, "Error: No gossip-non-leader found by looking at the logs, for "+org
        return context.initial_non_leader[org]

    def wait_for_deploy_completion(self, context, chaincode_container, timeout):
        pass

    def install_chaincode(self, context, chaincode, peers):
        return self.cli.install_chaincode(context, chaincode, peers)

    def instantiate_chaincode(self, context, chaincode, peers):
        return self.cli.instantiate_chaincode(context, chaincode, peers)

    def create_channel(self, context, orderer, channelId):
        return self.cli.create_channel(context, orderer, channelId)

    def fetch_channel(self, context, peers, orderer, channelId):
        return self.cli.fetch_channel(context, peers, orderer, channelId)

    def join_channel(self, context, peers, channelId):
        return self.cli.join_channel(context, peers, channelId)

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId):
        return self.cli.invoke_chaincode(context, chaincode, orderer, peer, channelId)

    def query_chaincode(self, context, chaincode, peer, channelId):
        return self.cli.query_chaincode(context, chaincode, peer, channelId)


class ToolInterface(InterfaceBase):
    def __init__(self, context):
        remote_util.getNetworkDetails(context)

        # use CLI for non implemented functions
        self.cli = CLIInterface()

    def install_chaincode(self, context, chaincode, peers):
        results = {}
        for peer in peers:
            peer_name = context.networkInfo["nodes"][peer]["nodeName"]
            cmd = "node v1.0_sdk_tests/app.js installcc -i {0} -v 1 -p {1}".format(chaincode['name'],
                                                                    peer_name)
            print(cmd)
            results[peer] = subprocess.check_call(cmd.split(), env=os.environ)
        return results

    def instantiate_chaincode(self, context, chaincode, containers):
        channel = str(chaincode.get('channelID', self.TEST_CHANNEL_ID))
        args = json.loads(chaincode["args"])
        print(args)
        peer_name = context.networkInfo["nodes"]["peer0.org1.example.com"]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js instantiatecc -c {0} -i {1} -v 1 -a {2} -b {3} -p {4}".format(channel,
                                                                                        chaincode["name"],
                                                                                        args[2],
                                                                                        args[4],
                                                                                        peer_name)
        print(cmd)
        return subprocess.check_call(cmd.split(), env=os.environ)

    def create_channel(self, context, orderer, channelId):
        orderer_name = context.networkInfo["nodes"][orderer]["nodeName"]
        peer_name = context.networkInfo["nodes"]["peer0.org1.example.com"]["nodeName"]

        # Config Setup for tool
        cmd = "node v1.0_sdk_tests/app.js configtxn -c {0} -r {1}".format(channelId, "1,3")
        ret = subprocess.check_call(cmd.split(), env=os.environ)
        shutil.copyfile("{}.pb".format(channelId), "v1.0_sdk_tests/{}.pb".format(channelId))

        cmd = "node v1.0_sdk_tests/app.js createchannel -c {0} -o {1} -r {2} -p {3}".format(channelId,
                                                                      orderer_name,
                                                                      "1,3",
                                                                      peer_name)
        print(cmd)
        return subprocess.check_call(cmd.split(), env=os.environ)

    def join_channel(self, context, peers, channelId):
        results = {}
        for peer in peers:
            peer_name = context.networkInfo["nodes"][peer]["nodeName"]
            cmd = "node v1.0_sdk_tests/app.js joinchannel -c {0} -p {1}".format(channelId, peer_name)
            print(cmd)
            results[peer] = subprocess.check_call(cmd.split(), env=os.environ)
        return results

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId):
        args = json.loads(chaincode["args"])
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js invoke -c {0} -i {1} -v 1 -p {2} -m {3}".format(channelId,
                                                                         chaincode["name"],
                                                                         peer_name,
                                                                         args[-1])
        print(cmd)
        return {peer: subprocess.check_call(cmd.split(), env=os.environ)}

    def query_chaincode(self, context, chaincode, peer, channelId):
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js query -c {0} -i {1} -v 1 -p {2}".format(channelId,
                                                                   chaincode["name"],
                                                                   peer_name)
        print(cmd)
        return {peer: subprocess.check_call(cmd.split(), env=os.environ)}

    def update_chaincode(self, context, chaincode, peer, channelId):
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]


class SDKInterface(InterfaceBase):
    def __init__(self, context, language):
        # use PyExecJS for executing NodeJS code - https://pypi.python.org/pypi/PyExecJS
        # use Pyjnius for executing Java code - http://pyjnius.readthedocs.io/en/latest/index.html
        if context.remote:
            remote_util.getNetwork()
        self.networkConfigFile = self.generateNetworkConfig(context)

        if language.lower() == "nodejs":
            self.initializeNode()
        else:
            raise "Language {} is not supported in the test framework yet.".format(language)

        # use CLI for non implemented functions
        self.cli = CLIInterface()

    def generateNetworkConfig(self, context):
        with open("./configs/network-config.json", "r") as fd:
            networkConfig = fd.read()

        grpcType = "grpc"
        if context.tls:
            grpcType = "grpcs"
        networkConfigFile = "{0}/configs/{1}/network-config.json".format(os.path.abspath('.'),
                                                                         context.projectName)
        with open(networkConfigFile, "w+") as fd:
            structure = {"config": "{0}/configs/{1}".format(os.path.abspath('.'),
                                                            context.projectName),
                         "tls": common_util.convertBoolean(context.tls),
                         "grpcType": grpcType,
                         "networkId": context.projectName}
            updated = networkConfig % (structure)
            fd.write(updated)
        return networkConfigFile

    def initializeNode(self):
        shutil.rmtree("./node_modules", ignore_errors=True)
        shutil.copyfile("package.json", "../../package.json")
        node = execjs.get(execjs.runtime_names.Node)
        print("node info: {}".format(node.name))
        npminstall =  subprocess.check_output(["npm install --silent"],
                                            env=os.environ,
                                            cwd="../..",
                                            shell=True)
        print("npm install: {}".format(npminstall))
        shutil.copytree("../../node_modules", "./node_modules")

        with open("./sdk/node/invoke.js", "r") as fd:
            invoke_text = fd.read()
        self.invoke_func = execjs.compile(invoke_text)
        with open("./sdk/node/query.js", "r") as fd:
            query_text = fd.read()
        self.query_func = execjs.compile(query_text)

    def reformat_chaincode(self, chaincode, channelId):
        reformatted = yaml.safe_load(chaincode.get('args', '[]'))
        function = reformatted.pop(0)
        chaincode['fcn'] = str(function)
        chaincode['args'] = reformatted
        chaincode['channelId'] = str(channelId)
        return chaincode

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId=TEST_CHANNEL_ID, targs=""):
        reformatted = self.reformat_chaincode(chaincode, channelId)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        orgName = org.title().replace('.', '')
        result = self.invoke_func.call("invoke", "User1@{}".format(org), orgName, reformatted, [peer], orderer, self.networkConfigFile)
        print("Invoke: {}".format(result))
        return {peer: result}

    def query_chaincode(self, context, chaincode, peer, channelId, targs):
        reformatted = self.reformat_chaincode(chaincode, channelId)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        orgName = org.title().replace('.', '')
        print("Query Info: User1@{0}, {1}, {2}, {3}".format(org, orgName, reformatted, peer))
        result = self.query_func.call("query", "User1@{}".format(org), orgName, reformatted, [peer], self.networkConfigFile)
        return {peer: result}


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
            setup += ['CORE_PEER_TLS_ROOTCERT_FILE={0}/peerOrganizations/{1}/peers/{2}/tls/ca.crt'.format(configDir, org, peer),
                      'CORE_PEER_TLS_CERT_FILE={0}/peerOrganizations/{1}/peers/{2}/tls/server.crt'.format(configDir, org, peer),
                      'CORE_PEER_TLS_KEY_FILE={0}/peerOrganizations/{1}/peers/{2}/tls/server.key'.format(configDir, org, peer)]
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


    def create_channel(self, context, orderer, channelId=TEST_CHANNEL_ID):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, "peer0.org1.example.com")
        timeout = str(120 + common_util.convertToSeconds(context.composition.environ.get('CONFIGTX_ORDERER_BATCHTIMEOUT', '0s')))
        command = ["peer", "channel", "create",
                   "--file", "/var/hyperledger/configs/{0}/{1}.tx".format(context.composition.projectName, channelId),
                   "--channelID", channelId,
                   "--timeout", timeout,
                   "--orderer", '{0}:7050'.format(orderer)]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/{1}/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir, orderer)]

        command.append('"')

        output = context.composition.docker_exec(setup+command, ['cli'])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        if "SERVICE_UNAVAILABLE" in output['cli']:
            time.sleep(5)
            print("Received: {0}, Trying again...".format(output['cli']))
            output = context.composition.docker_exec(setup+command, ['cli'])
        assert "Error:" not in output, "Unable to successfully create channel {}".format(channelId)

        return output

    def fetch_channel(self, context, peers, orderer, channelId=TEST_CHANNEL_ID, location=None):
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
                       "--orderer", '{0}:7050'.format(orderer)]
            if context.tls:
                command = command + ["--tls",
                                     "--cafile",
                                     '{0}/ordererOrganizations/example.com/orderers/{1}/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir, orderer)]

            command.append('"')

            output = context.composition.docker_exec(setup+command, [peer])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        return output

    def join_channel(self, context, peers, channelId=TEST_CHANNEL_ID):
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

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId=TEST_CHANNEL_ID, targs=""):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        args = chaincode.get('args', '[]').replace('"', r'\"')
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = self.get_env_vars(context, peer)
        command = ["peer", "chaincode", "invoke",
                   "--name", chaincode['name'],
                   "--ctor", r"""'{\"Args\": %s}'""" % (args),
                   "--channelID", channelId,
                   "--orderer", '{0}:7050'.format(orderer)]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
        command.append('"')
        output = context.composition.docker_exec(setup+command, [peer])
        print("Invoke[{0}]: {1}".format(" ".join(setup+command), str(output)))
        output = self.retry(context, output, peer, setup, command)
        return output


    def query_chaincode(self, context, chaincode, peer, channelId=TEST_CHANNEL_ID, targs=""):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        args = chaincode.get('args', '[]').replace('"', r'\"')
        setup = self.get_env_vars(context, peer)
        command = ["peer", "chaincode", "query",
                   "--name", chaincode['name'],
                   "--ctor", r"""'{\"Args\": %s}'""" % (str(args)), # This should work for rich queries as well
                   "--channelID", channelId, '"']
        result = context.composition.docker_exec(setup+command, [peer])
        print("Query Exec command: {0}".format(" ".join(setup+command)))
        result = self.retry(context, result, peer, setup, command)
        return result

    def wait_for_deploy_completion(self, context, chaincode_container, timeout):
        containers = subprocess.check_output(["docker ps -a"], shell=True)
        try:
            with common_util.Timeout(timeout):
                while chaincode_container not in containers:
                    containers = subprocess.check_output(["docker ps -a"], shell=True)
                    time.sleep(1)
        finally:
            assert chaincode_container in containers, "The expected chaincode container {} is not running".format(chaincode_container)

        # Allow time for chaincode initialization to complete
        time.sleep(10)

    def retry(self, context, output, peer, setup, command):
        count = 0
        while count < 3:
            count += 1
            if "been successfully instantiated and try again" in output[peer]:
                time.sleep(5)
                print("Received: {0}, Trying again({1})...".format(output[peer], count))
                output = context.composition.docker_exec(setup+command, [peer])
        return output
