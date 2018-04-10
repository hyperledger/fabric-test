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

    def deploy_chaincode(self, context, path, args, name, language, peer, username, timeout, channel=TEST_CHANNEL_ID, version=0, policy=None):
        self.pre_deploy_chaincode(context, path, args, name, language, channel, version, policy)
        all_peers = self.get_peers(context)
        self.install_chaincode(context, all_peers, username)
        self.instantiate_chaincode(context, peer, username)
        self.post_deploy_chaincode(context, peer, timeout)

    def pre_deploy_chaincode(self, context, path, args, name, language, channelId=TEST_CHANNEL_ID, version=0, policy=None):
        config_util.generateChannelConfig(channelId, config_util.CHANNEL_PROFILE, context)
        orderers = self.get_orderers(context)
        peers = self.get_peers(context)
        assert orderers != [], "There are no active orderers in this network"

        context.chaincode={"path": path,
                           "language": language,
                           "name": name,
                           "version": str(version),
                           "args": args,
                           "orderers": orderers,
                           "channelID": channelId,
                           }
        if policy:
            context.chaincode['policy'] = policy

    def post_deploy_chaincode(self, context, peer, timeout):
        chaincode_container = "{0}-{1}-{2}-{3}".format(context.projectName, peer, context.chaincode['name'], context.chaincode.get('version', 0))
        context.interface.wait_for_deploy_completion(context, chaincode_container, timeout)

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
        if org in context.initial_leader:
            return context.initial_leader[org]
        max_waittime=15
        waittime=5
        try:
            with common_util.Timeout(max_waittime):
                while  org not in context.initial_leader:
                    for container in self.get_peers(context):
                        if ((org in container) and common_util.get_leadership_status(container)):
                            context.initial_leader[org]=container
                            print("initial leader is "+context.initial_leader[org])
                            break
                    time.sleep(waittime)
        finally:
            assert org in context.initial_leader, "Error: After polling for " + str(max_waittime) + " seconds, no gossip-leader found by looking at the logs, for "+org
        return context.initial_leader[org]

    def get_initial_non_leader(self, context, org):
        if not hasattr(context, 'initial_non_leader'):
            context.initial_non_leader={}
        if org in context.initial_non_leader:
            return context.initial_non_leader[org]
        if org not in context.initial_non_leader:
            for container in self.get_peers(context):
                if (org in container and  (not common_util.get_leadership_status(container))):
                    context.initial_non_leader[org]=container
                    print("initial non-leader is "+context.initial_non_leader[org])
                    return context.initial_non_leader[org]
        assert org in context.initial_non_leader, "Error: After polling for " + str(max_waittime) + " seconds, no gossip-non-leader found by looking at the logs, for "+org
        return context.initial_non_leader[org]

    def wait_for_deploy_completion(self, context, chaincode_container, timeout):
        pass

    def install_chaincode(self, context, peers, user="Admin"):
        return self.cli.install_chaincode(context, peers, user=user)

    def instantiate_chaincode(self, context, peer, user="Admin"):
        return self.cli.instantiate_chaincode(context, peer, user=user)

    def create_channel(self, context, orderer, channelId, user="Admin"):
        return self.cli.create_channel(context, orderer, channelId, user=user)

    def fetch_channel(self, context, peers, orderer,channelId=TEST_CHANNEL_ID, location=None, user="Admin"):
        return self.cli.fetch_channel(context, peers, orderer, channelId, location, user=user)

    def join_channel(self, context, peers, channelId, user="Admin"):
        return self.cli.join_channel(context, peers, channelId, user=user)

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId, targs="", user="User1"):
        # targs and user are optional parameters with defaults set if they are not included
        return self.cli.invoke_chaincode(context, chaincode, orderer, peer, channelId, targs, user)

    def query_chaincode(self, context, chaincode, peer, channelId, targs="", user="User1"):
        # targs and user are optional parameters with defaults set if they are not included
        return self.cli.query_chaincode(context, chaincode, peer, channelId, targs, user)


class ToolInterface(InterfaceBase):
    def __init__(self, context):
        remote_util.getNetworkDetails(context)

        # use CLI for non implemented functions
        self.cli = CLIInterface()

    def install_chaincode(self, context, peers, user="Admin"):
        results = {}
        for peer in peers:
            peer_name = context.networkInfo["nodes"][peer]["nodeName"]
            cmd = "node v1.0_sdk_tests/app.js installcc -i {0} -v 1 -p {1}".format(context.chaincode['name'],
                                                                    peer_name)
            print(cmd)
            results[peer] = subprocess.check_call(cmd.split(), env=os.environ)
        return results

    def instantiate_chaincode(self, context, peer="peer0.org1.example.com", user="Admin"):
        channel = str(context.chaincode.get('channelID', self.TEST_CHANNEL_ID))
        args = json.loads(context.chaincode["args"])
        print(args)
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js instantiatecc -c {0} -i {1} -v 1 -a {2} -b {3} -p {4}".format(channel,
                                                                                    context.chaincode["name"],
                                                                                    args[2],
                                                                                    args[4],
                                                                                    peer_name)
        print(cmd)
        return subprocess.check_call(cmd.split(), env=os.environ)

    def create_channel(self, context, orderer, channelId, user="Admin"):
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

    def join_channel(self, context, peers, channelId, user="Admin"):
        results = {}
        for peer in peers:
            peer_name = context.networkInfo["nodes"][peer]["nodeName"]
            cmd = "node v1.0_sdk_tests/app.js joinchannel -c {0} -p {1}".format(channelId, peer_name)
            print(cmd)
            results[peer] = subprocess.check_call(cmd.split(), env=os.environ)
        return results

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId, targs="", user="User1"):
        # targs and user are optional parameters with defaults set if they are not included
        args = json.loads(chaincode["args"])
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js invoke -c {0} -i {1} -v 1 -p {2} -m {3}".format(channelId,
                                                                         chaincode["name"],
                                                                         peer_name,
                                                                         args[-1])
        print(cmd)
        return {peer: subprocess.check_call(cmd.split(), env=os.environ)}

    def query_chaincode(self, context, chaincode, peer, channelId, targs="", user="User1"):
        # targs and user are optional parameters with defaults set if they are not included
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js query -c {0} -i {1} -v 1 -p {2}".format(channelId,
                                                                   chaincode["name"],
                                                                   peer_name)
        print(cmd)
        return {peer: subprocess.check_call(cmd.split(), env=os.environ)}

    def update_chaincode(self, context, chaincode, peer, channelId, user="Admin"):
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

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1"):
        # channelId, targs and user are optional parameters with defaults set if they are not included
        reformatted = self.reformat_chaincode(chaincode, channelId)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        orgName = org.title().replace('.', '')
        result = self.invoke_func.call("invoke", "{0}@{1}".format(user, org), orgName, reformatted, [peer], orderer, self.networkConfigFile)
        print("Invoke: {}".format(result))
        return {peer: result}

    def query_chaincode(self, context, chaincode, peer, channelId, targs="", user="User1"):
        # targs and user are optional parameters with defaults set if they are not included
        reformatted = self.reformat_chaincode(chaincode, channelId)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        orgName = org.title().replace('.', '')
        print("Query Info: {0}@{1}, {2}, {3}, {4}".format(user, org, orgName, reformatted, peer))
        result = self.query_func.call("query", "{0}@{1}".format(user, org), orgName, reformatted, [peer], self.networkConfigFile)
        return {peer: result}

    def wait_for_deploy_completion(self, context, chaincode_container, timeout):
        if context.remote:
            time.sleep(30)

        containers = subprocess.check_output(["docker ps -a"], shell=True)
        try:
            with common_util.Timeout(timeout):
                while chaincode_container not in containers:
                    containers = subprocess.check_output(["docker ps -a"], shell=True)
                    time.sleep(1)
        finally:
            assert chaincode_container in containers, "The expected chaincode container {} is not running".format(chaincode_container)

        # Allow time for chaincode initialization to complete
        time.sleep(15)

class CLIInterface(InterfaceBase):

    def get_env_vars(self, context, peer="peer0.org1.example.com", user="Admin", includeAll=True):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = ["/bin/bash", "-c",
                 '"CORE_PEER_MSPCONFIGPATH={0}/peerOrganizations/{2}/users/{1}@{2}/msp'.format(configDir, user, org)]

        if includeAll:
            setup += ['CORE_PEER_LOCALMSPID={0}'.format(org),
                      'CORE_PEER_ID={0}'.format(peer),
                      'CORE_PEER_ADDRESS={0}:7051'.format(peer)]

        # Only pull the env vars specific to the peer
        if peer in context.composition.environ.keys():
            for key, value in context.composition.environ[peer].items():
                setup.append("{0}={1}".format(key, value))

        if context.tls and "CORE_PEER_TLS_CERT_FILE" not in setup:
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

    def install_chaincode(self, context, peers, user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = {}
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, user=user)
            command = ["peer", "chaincode", "install",
                       "--name",context.chaincode['name'],
                       "--lang", context.chaincode['language'],
                       "--version", str(context.chaincode.get('version', 0)),
                       "--path", context.chaincode['path']]
            if "orderers" in context.chaincode:
                command = command + ["--orderer", 'orderer0.example.com:7050']
            if "user" in context.chaincode:
                command = command + ["--username", context.chaincode["user"]]
            command.append('"')
            ret = context.composition.docker_exec(setup+command, ['cli'])
            output[peer] = ret['cli']
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def instantiate_chaincode(self, context, peer="peer0.org1.example.com", user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        args = context.chaincode.get('args', '[]').replace('"', r'\"')
        output = {}
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = self.get_env_vars(context, peer, user=user)
        command = ["peer", "chaincode", "instantiate",
                   "--name", context.chaincode['name'],
                   "--version", str(context.chaincode.get('version', 0)),
                   "--lang", context.chaincode['language'],
                   "--channelID", str(context.chaincode.get('channelID', self.TEST_CHANNEL_ID)),
                   "--ctor", r"""'{\"Args\": %s}'""" % (args)]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
        if "orderers" in context.chaincode:
            command = command + ["--orderer", 'orderer0.example.com:7050']
        if "user" in context.chaincode:
            command = command + ["--username", context.chaincode["user"]]
        if context.chaincode.get("policy", None) is not None:
            command = command + ["--policy", context.chaincode["policy"].replace('"', r'\"')]
        command.append('"')

        output[peer] = context.composition.docker_exec(setup + command, [peer])
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def create_channel(self, context, orderer, channelId=TEST_CHANNEL_ID, user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, "peer0.org1.example.com", user=user)
        # Ideally this would NOT be a 5 minute timeout, but more like a 2 minute timeout.
        timeout = str(300 + common_util.convertToSeconds(context.composition.environ.get('CONFIGTX_ORDERER_BATCHTIMEOUT', '0s')))
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

    def fetch_channel(self, context, peers, orderer, channelId=TEST_CHANNEL_ID, location=None, user="Admin", ext=""):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        if not location:
            location = configDir

        if not ext:
            ext = "block"

        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, includeAll=False, user=user)
            command = ["peer", "channel", "fetch", "config",
                       "{0}/{1}.{2}".format(location, channelId, ext),
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

    def join_channel(self, context, peers, channelId=TEST_CHANNEL_ID, user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)

        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, user=user)
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

    def update_channel(self, context, peers, channelId=TEST_CHANNEL_ID, orderer="orderer0.example.com", block_filename="update.pb", user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)

        # peer channel update -f org3_update_in_envelope.pb -c $CHANNEL_NAME -o orderer.example.com:7050 --tls --cafile $ORDERER_CA
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, includeAll=False, user=user)
            command = ["peer", "channel", "update",
                       "--file", block_filename,
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

    def sign_channel(self, context, peers, block_filename="update.pb", user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)

        # peer channel signconfigtx -f org3_update_in_envelope.pb
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, user=user)
            command = ["peer", "channel", "signconfigtx",
                       "--file", '/var/hyperledger/configs/{0}/{1}"'.format(context.composition.projectName, block_filename)]
            output = context.composition.docker_exec(setup+command, [peer])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        return output

    def upgrade_chaincode(self, context, orderer, channelId=TEST_CHANNEL_ID, args=None, user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, "peer0.org1.example.com", user=user)
        command = ["peer", "chaincode", "upgrade",
                   "--name", context.chaincode['name'],
                   "--version", str(context.chaincode.get('version', 1)),
                   "--channelID", str(context.chaincode.get('channelID', channelId))]
        if args:
            #command = command + ["--ctor", r"""'{\"Args\": %s}'""" % (str(context.chaincode['args'].replace('"', r'\"')))]
            command = command + ["--ctor", r"""'{\"Args\": %s}'""" % (str(args.replace('"', r'\"')))]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
        if "orderers" in context.chaincode:
            command = command + ["--orderer", '{}:7050'.format(orderer)]
        if "user" in context.chaincode:
            command = command + ["--username", context.chaincode["user"]]
        if context.chaincode.get("policy", None) is not None:
            command = command + ["--policy", context.chaincode["policy"].replace('"', r'\"')]

        command.append('"')
        output = context.composition.docker_exec(setup+command, ['peer0.org1.example.com'])
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1"):
        # channelId, targs and user are optional parameters with defaults set if they are not included
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        args = chaincode.get('args', '[]').replace('"', r'\"')
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = self.get_env_vars(context, peer, user=user)
        command = ["peer", "chaincode", "invoke",
                   "--name", chaincode['name'],
                   "--ctor", r"""'{\"Args\": %s}'""" % (args),
                   "--channelID", channelId]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
        if targs:
            #to escape " so that targs are compatible with cli command
            targs = targs.replace('"', r'\"')
            command = command + ["--transient", targs]

        command = command + ["--orderer", '{0}:7050'.format(orderer)]
        command.append('"')
        output = context.composition.docker_exec(setup+command, [peer])
        print("Invoke[{0}]: {1}".format(" ".join(setup+command), str(output)))
        output = self.retry(context, output, peer, setup, command)
        return output

    def query_chaincode(self, context, chaincode, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1"):
        # channelId, targs and user are optional parameters with defaults set if they are not included
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        args = chaincode.get('args', '[]').replace('"', r'\"')
        setup = self.get_env_vars(context, peer, user=user)
        command = ["peer", "chaincode", "query",
                   "--name", chaincode['name'],
                   "--ctor", r"""'{\"Args\": %s}'""" % (str(args)), # This should work for rich queries as well
                   "--channelID", channelId]
        if targs:
            #to escape " so that targs are compatible with cli command
            targs = targs.replace('"', r'\"')
            command = command +["--transient", targs]

        command.append('"')
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
