#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

import config_util
import json
import yaml
import os
import re
import remote_util
import shutil
import subprocess
import sys
import time
from interruptingcow import timeout
import common_util


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

    def deploy_chaincode(self, context, path, args, name, language, peer, username, seconds, channel=TEST_CHANNEL_ID, version=0, policy=None, collections=None):
        self.pre_deploy_chaincode(context, path, args, name, language, channel, version, policy)
        all_peers = self.get_peers(context)
        self.install_chaincode(context, all_peers, username)
        self.instantiate_chaincode(context, peer, username, collections)
        self.post_deploy_chaincode(context, peer, seconds)

    def pre_deploy_chaincode(self, context, path, args, name, language, channelId=TEST_CHANNEL_ID, version=0, policy=None):
        orderers = self.get_orderers(context)
        peers = self.get_peers(context)
        assert orderers != [], "There are no active orderers in this network"

        context.chaincode = {"path": path,
                             "language": language,
                             "name": name,
                             "version": str(version),
                             "args": args,
                             "orderers": orderers,
                             "channelID": channelId,
                           }
        if policy:
            context.chaincode['policy'] = policy

    def post_deploy_chaincode(self, context, peer, seconds):
        chaincode_container = "{0}-{1}-{2}-{3}".format(context.projectName,
                                                       peer,
                                                       context.chaincode['name'],
                                                       context.chaincode.get("version", 0))
        context.interface.wait_for_deploy_completion(context, chaincode_container, seconds)

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
            with timeout(max_waittime, exception=Exception):
                while org not in context.initial_leader:
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

    def find_replace_multi_ordered(self, string, dictionary):
        # sort keys by length, in reverse order
        for item in sorted(dictionary.keys(), key = len, reverse = True):
            string = re.sub(item, str(dictionary[item]), string)
        return string

    def build_tarball(self, context):
        chaincodeName = context.chaincode["name"]
        chaincodePath = context.chaincode["path"]

        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, "peer0.org1.example.com")
        cmd = ["cd $GOPATH/src;",
               "tar -czvf {0}.tar.gz {1};".format(chaincodeName, chaincodePath),
               "cp {0}.tar.gz {1}/.".format(chaincodeName, configDir)]
        cmd.append('"')
        ret = context.composition.docker_exec(setup + cmd, ["cli"])

        with open("./configs/{}/Chaincode-Package-Metadata.json".format(context.composition.projectName), "w") as fd:
            json.dump({"Type": context.chaincode["language"], "Path": chaincodePath}, fd, indent = 4)

        ret = context.composition.docker_exec(setup + ["pwd"], ["cli"])
        cmd = ["cd {0};".format(configDir),
               "tar -czvf {0}-chaincode-package.tar.gz {0}.tar.gz Chaincode-Package-Metadata.json;".format(chaincodeName)]
        cmd.append('"')
        ret = context.composition.docker_exec(setup + cmd, ["cli"])
        return "{0}/{1}-chaincode-package.tar.gz".format(configDir, chaincodeName)

    def wait_for_deploy_completion(self, context, chaincode_container, seconds):
        pass

    def package_chaincode(self, context, peer, tarfile, user="Admin"):
        return self.cli.package_chaincode(context, peer, tarfile, user=user)

    def install_chaincode(self, context, peers, user="Admin", tarball=""):
        return self.cli.install_chaincode(context, peers, user=user, tarball=tarball)

    def approve_chaincode(self, context, peers, user="Admin", upgrade=False, policy=None, collections=None, sequence=1, initRequired=True):
        return self.cli.approve_chaincode(context, peers, user=user, upgrade=upgrade, policy=policy, collections=collections, sequence=sequence, initRequired=initRequired)

    def commit_chaincode(self, context, peer, user="Admin", policy=None, collections=None, initRequired=True):
        return self.cli.commit_chaincode(context, peer, user=user, policy=policy, collections=collections, initRequired=initRequired)

    def list_chaincode(self, context, peer, user="Admin", list_type="installed"):
        return self.cli.list_chaincode(context, peer, user=user, list_type=list_type)

    def instantiate_chaincode(self, context, peer, user="Admin", collectionConfig=None):
        return self.cli.instantiate_chaincode(context, peer, user=user, collectionConfig=collectionConfig)

    def create_channel(self, context, orderer, channelId, user="Admin"):
        return self.cli.create_channel(context, orderer, channelId, user=user)

    def fetch_channel(self, context, peers, orderer, channelId=TEST_CHANNEL_ID, location=None, user="Admin", ext=""):
        return self.cli.fetch_channel(context, peers, orderer, channelId, location, user=user)

    def join_channel(self, context, peers, channelId, user="Admin"):
        return self.cli.join_channel(context, peers, channelId, user=user)

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId, targs="", user="User1", opts={}, orgs=[]):
        # targs, user and opts are optional parameters with defaults set if they are not included
        return self.cli.invoke_chaincode(context, chaincode, orderer, peer, channelId, targs, user, opts, orgs)

    def query_chaincode(self, context, chaincode, peer, channelId, targs="", user="User1", opts={}):
        # targs and user are optional parameters with defaults set if they are not included
        return self.cli.query_chaincode(context, chaincode, peer, channelId, targs, user)

    def enrollUsersFabricCA(self, context):
        return self.cli.enrollUsersFabricCA(context)

    def addIdemixIdentities(self, context, user, passwd, role, org):
        return self.cli.addIdemixIdentities(context, user, passwd, role, org)

    def enrollCAadmin(self, context, nodes):
        return self.cli.enrollCAadmin(context, nodes)


class ToolInterface(InterfaceBase):
    def __init__(self, context):
        remote_util.getNetworkDetails(context)

        # use CLI for non implemented functions
        self.cli = CLIInterface()

    def install_chaincode(self, context, peers, user="Admin", tarball=""):
        results = {}
        for peer in peers:
            peer_name = context.networkInfo["nodes"][peer]["nodeName"]
            cmd = "node v1.0_sdk_tests/app.js installcc -i {0} -v 1 -p {1}".format(context.chaincode['name'],
                                                                    peer_name)
            print(cmd)
            results[peer] = subprocess.check_call(cmd.split(), env=os.environ)
        return results

    def instantiate_chaincode(self, context, peer="peer0.org1.example.com", user="Admin", collectionConfig=None):
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

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId, targs="", user="User1", opts={}, orgs=[]):
        # targs, usesr and opts are optional parameters with defaults set if they are not included
        args = json.loads(chaincode["args"])
        peer_name = context.networkInfo["nodes"][peer]["nodeName"]
        cmd = "node v1.0_sdk_tests/app.js invoke -c {0} -i {1} -v 1 -p {2} -m {3}".format(channelId,
                                                                         chaincode["name"],
                                                                         peer_name,
                                                                         args[-1])
        print(cmd)
        return {peer: subprocess.check_call(cmd.split(), env=os.environ)}

    def query_chaincode(self, context, chaincode, peer, channelId, targs="", user="User1", opts={}):
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
        if context.remote:
            remote_util.getNetwork()
        self.networkConfigFile = self.generateNetworkConfig(context)

        # use CLI for non implemented functions
        self.cli = CLIInterface()
        self.context = context

        if language.lower() == "nodejs":
            self.initializeNode()
        elif language.lower() == "java":
            self.initializeJava()
        else:
            raise "Language {} is not supported in the test framework yet.".format(language)

    def generateNetworkConfig(self, context):
        with open("./configs/network-config.json", "r") as fd:
            networkConfig = fd.read()

        grpcType = "grpc"
        proto = "http"
        if context.tls:
            grpcType = "grpcs"
            proto = "https"
        networkConfigFile = "{0}/configs/{1}/network-config.json".format(os.path.abspath('.'),
                                                                         context.projectName)

        with open("{1}/configs/{0}/ordererOrganizations/example.com/ca/ca.example.com-cert.pem".format(context.projectName, os.path.abspath('.')), "r") as fd:
              certs = fd.read().replace("\n", "\\r\\n")

        for org in ["org1.example.com", "org2.example.com"]:
            with open("{2}/configs/{0}/peerOrganizations/{1}/ca/ca.{1}-cert.pem".format(context.projectName, org, os.path.abspath('.')), "r") as fd:
                  certs += fd.read().replace("\n", "\\r\\n")

        with open(networkConfigFile, "w+") as fd:
            structure = {"config": "{0}/configs/{1}".format(os.path.abspath('.'),
                                                            context.projectName),
                         "tls": common_util.convertBoolean(context.tls),
                         "grpcType": grpcType,
                         "proto": proto,
                         "cacerts": certs,
                         "networkId": context.projectName}
            updated = json.loads(networkConfig % (structure))
            fd.write(json.dumps(updated, indent=2))
        return networkConfigFile

    def initializeNode(self):
        self.__class__ = NodeSDKInterface
        self.inputFile = "commandInputs.json"

    def initializeJava(self):
        self.__class__ = JavaSDKInterface
        whichJava = subprocess.check_output(["which java"],
                                            env=os.environ,
                                            shell=True)
        print("***{}***".format(whichJava.strip()))
        javaVers = subprocess.check_output(["java -version"],
                                            env=os.environ,
                                            shell=True)
        print("***{}***".format(javaVers))
        javaVers = subprocess.check_output(["ls -ltr "],
                                           env=os.environ,
                                           shell=True)
        print("***{}***".format(javaVers))

    def reformat_chaincode(self, chaincode, channelId):
        reformatted = yaml.safe_load(chaincode.get('args', '[]'))
        function = reformatted.pop(0)
        chaincode['fcn'] = str(function)
        chaincode['args'] = reformatted
        chaincode['channelId'] = str(channelId)
        return chaincode

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1", opts={}, orgs=[]):
        # channelId, targs and user are optional parameters with defaults set if they are not included
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        result = self.invoke_func(chaincode, channelId, user, org, [peer], orderer, opts)
        print("Invoke: {}".format(result))
        return {peer: result}

    def query_chaincode(self, context, chaincode, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1", opts={}):
        # targs and user are optional parameters with defaults set if they are not included
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        print("Class:", self.__class__)
        result = self.query_func(chaincode, channelId, user, org, [peer], opts)
        print("Query Result: {}".format(result))
        return {peer: result}

    def wait_for_deploy_completion(self, context, chaincode_container, seconds):
        if context.remote:
            time.sleep(30)

        try:
            containers = subprocess.check_output(["docker ps -a"], shell=True)
            with timeout(seconds, exception=Exception):
                while chaincode_container not in containers:
                    containers = subprocess.check_output(["docker ps -a"], shell=True)
                    time.sleep(1)
        finally:
            assert chaincode_container in containers, "The expected chaincode container {0} is not running\n{1}".format(chaincode_container, containers)

        # Allow time for chaincode initialization to complete
        time.sleep(5)

    def approve_chaincode(self, context, peers, user="Admin", upgrade=False, policy=None, collections=None, sequence=1, initRequired=True):
        raise Exception("The code for this has not been implemented for the SDKs yet. Please update in the fabric-test/feature/sdk directory.")

    def commit_chaincode(self, context, peer, user="Admin", policy=None, collections=None, initRequired=True):
        raise Exception("The code for this has not been implemented for the SDKs yet. Please update in the fabric-test/feature/sdk directory.")


class NodeSDKInterface(SDKInterface):
    def invoke_func(self, chaincode, channelId, user, org, peers, orderer, opts):
        reformatted = self.reformat_chaincode(chaincode, channelId)
        print("Chaincode", chaincode)
        orgName = org.title().replace('.', '')

        jsonArgs = {"user": user, "org": org, "orgName": orgName, "chaincode":reformatted, "peers": peers, "orderer": orderer, "networkConfigFile": self.networkConfigFile, "opts": opts}
        with open(self.inputFile, "w") as fd:
            json.dump(jsonArgs, fd)
        cmd = "node ./sdk/node/invoke.js invoke ../../{0}".format(self.inputFile)
        print("cmd: {0}".format(cmd))
        return subprocess.check_call(cmd, shell=True)

    def query_func(self, chaincode, channelId, user, org, peers, opts):
        print("Chaincode", chaincode)
        reformatted = self.reformat_chaincode(chaincode, channelId)
        orgName = org.title().replace('.', '')

        jsonArgs = {"user": user, "org": org, "orgName": orgName, "chaincode": reformatted, "peers": peers, "networkConfigFile": self.networkConfigFile, "opts": opts}

        with open(self.inputFile, "w") as fd:
            json.dump(jsonArgs, fd)
        cmd = "node ./sdk/node/query.js query ../../{0}".format(self.inputFile)

        print("cmd: {0}".format(cmd))
        response = subprocess.check_output(cmd, shell=True)
        regex = "\{.*response.*:\"(.*?)\"\}"
        match = re.findall(regex, response, re.MULTILINE | re.DOTALL)
        assert match, "No matching response within query result {}".format(response)
        return match[0]

class JavaSDKInterface(SDKInterface):
    def invoke_func(self, chaincode, channelId, user, org, peers, orderer, opts):
        print("Chaincode", chaincode)
        result = {}
        reformatted = self.reformat_chaincode(chaincode, channelId)
        passInfo = self.context.users.get(user, None)
        if passInfo is None:
            if "Admin" in user:
                password = "adminpw"
            elif "User" in user:
                password = "{}pw".format(user.lower())
        else:
            password = passInfo["password"]
        for peer in peers:
            inputs = {'peer': peer,
                      'org': org,
                      'orgName': org.title().replace('.', ''),
                      'user': user,
                      'password': password,
                      'orderer': orderer,
                      'config': "{0}/configs/{1}".format(os.path.abspath('.'), self.context.projectName),
                      #'cacert': "./configs/{0}/peerOrganizations/{1}/ca/ca.{1}-cert.pem".format(self.context.projectName, org),
                      'cacert': "{1}/configs/{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem".format(self.context.projectName, os.path.abspath('.')),
                      'srvcert': "./configs/{0}/peerOrganizations/{1}/peers/peer0.{1}/tls/server.crt".format(self.context.projectName, org),
                      'channel': channelId,
                      'name': chaincode.get("name", "mycc"),
                      'func': reformatted["fcn"],
                      'args': str(reformatted["args"]).replace(" ", ""),
                      }
            invoke_inputs = '-n {peer} -i 127.0.0.1 -p 7051 -r {org} -c {config} -a {cacert} -s {srvcert} -d {orderer} -h {channel} -m {name} -f {func} -g {args} -u {user} -w {password}'.format(**inputs)
            invoke_call = 'java -jar {0}/sdk/java/peer-javasdk.jar -o invoke {1}'.format(os.path.abspath('.'), invoke_inputs)
            print("Invoke command::", invoke_call)
            result[peer] = subprocess.check_output(invoke_call, shell=True)
        return result

    def query_func(self, chaincode, channelId, user, org, peers, opts):
        print("Chaincode", chaincode)

        result = {}
        reformatted = self.reformat_chaincode(chaincode, channelId)
        passInfo = self.context.users.get(user, None)
        if passInfo is None:
            if "Admin" in user:
                password = "adminpw"
            elif "User" in user:
                password = "{}pw".format(user.lower())
        else:
            password = passInfo["password"]
        for peer in peers:
            inputs = {'peer': peer,
                      'org': org,
                      'orgName': org.title().replace('.', ''),
                      'user': user,
                      'password': password,
                      'orderer': "orderer0.example.com",
                      'config': "{0}/configs/{1}".format(os.path.abspath('.'), self.context.projectName),
                      'cacert': "{1}/configs/{0}/ordererOrganizations/example.com/ca/tls-cert.pem".format(self.context.projectName, os.path.abspath('.')),
                      'srvcert': "{2}/configs/{0}/peerOrganizations/{1}/peers/peer0.{1}/tls/server.crt".format(self.context.projectName, org, os.path.abspath('.')),
                      'channel': channelId,
                      'name': chaincode.get("name", "mycc"),
                      'func': reformatted["fcn"],
                      'args': reformatted["args"],
                      }
            print("Inputs", inputs)
            query_inputs = '-n {peer} -i 127.0.0.1 -p 7051 -r {org} -c {config} -a {cacert} -s {srvcert} -d {orderer} -h {channel} -m {name} -f {func} -g {args} -u {user} -w {password}'.format(**inputs)
            query_call = 'java -jar {0}/sdk/java/peer-javasdk.jar -o query {1}'.format(os.path.abspath('.'), query_inputs)
            print("Query command::", query_call)
            answer = subprocess.check_output(query_call, shell=True)
            print("answer:", answer.split("\n")[-3:])
            result[peer] = "\n".join(answer.split("\n")[-2:])
        # Only return the last bit of the query response
        return "\n".join(answer.split("\n")[-2:])


class CLIInterface(InterfaceBase):

    def get_env_vars(self, context, peer="peer0.org1.example.com", user="Admin", includeAll=True):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = ["sh", "-c",
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

    def package_chaincode(self, context, peer, tarfile, user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = {}
        setup = self.get_env_vars(context, peer, user=user)
        cmd = ["peer", "chaincode", "package",
                     "{0}/{1}".format(configDir, tarfile),
                     "--lang", context.chaincode["language"],
                     "--path", context.chaincode["path"]]
        if context.newlifecycle:
            cmd = ["peer", "lifecycle", "chaincode", "package",
                     "{0}/{1}".format(configDir, tarfile),
                     "--label", context.chaincode["name"],
                     "--lang", context.chaincode["language"],
                     "--path", context.chaincode["path"]]
        cmd.append('"')
        return context.composition.docker_exec(setup + cmd, ['cli'])

    def approve_chaincode(self, context, peers, user="Admin", upgrade=False, policy=None, collections=None, sequence=1, initRequired=True):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = {}

        # set policy
        if policy is None:
            policy = context.chaincode.get('policy', None)
        else:
            context.chaincode['policy'] = policy

        # set collections
        if collections:
            context.chaincode['collections'] = collections

        for peer in peers:
            pat = r"Committed chaincode definition for chaincode '(?P<name>.*)' on channel '(?P<channel>.*)':\nVersion: (?P<vers>.*), Sequence: (?P<seq>\d*), Endorsement Plugin: (?P<escc>.*), Validation Plugin: (?P<vscc>.*)\n"
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, user=user)

            # Initial deploy starts at 1
            context.sequence = sequence
            if upgrade:
                res = self.list_chaincode(context, peer, user, "querycommitted")
                committed = re.match(pat, res[peer])
                assert committed is not None, "There was no definition returned for the chaincode '{0}'".format(context.chaincode['name'])
                # set context.sequence to received context.sequence number +1
                print(committed.groupdict())
                context.sequence = int(committed.groupdict()['seq']) + 1

            peer_addresses = [peer, peer.replace("peer0", "peer1")]
            if peer_addresses[1] in peers:
                peers.remove(peer.replace("peer0", "peer1"))

            pat = r"(?P<label>.*):(?P<hash>.*)"
            pkgMatch = re.match(pat, context.packageId.get(org, "0:0"))
            hashVal= pkgMatch.groupdict()['hash']

            command = ["peer", "lifecycle", "chaincode", "approveformyorg",
                       "--package-id", "{0}:{1}".format(context.chaincode['name'], hashVal),
                       "--channelID", str(context.chaincode.get('channelID', self.TEST_CHANNEL_ID)),
                       "--name", context.chaincode['name'],
                       "--version", str(context.chaincode.get('version', 0)),
                       "--peerAddresses", "{0}:7051".format(peer_addresses[0]),
                       "--peerAddresses", "{0}:7051".format(peer_addresses[1]),
                       "--sequence", str(context.sequence),
                       "--orderer", 'orderer0.example.com:7050',
                       ]
            if initRequired:
                command = command + ["--init-required"]
            if policy is not None:
                command = command + ["--signature-policy", policy.replace('"', r'\"')]
            if collections:
                command = command + ["--collections-config", collections]
            command.append('"')

            output.update(context.composition.docker_exec(setup + command, [peer]))
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def commit_chaincode(self, context, peer, user="Admin", policy=None, collections=None, initRequired=True):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = {}
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        setup = self.get_env_vars(context, peer, user=user)

        if policy is None:
            policy = context.chaincode.get('policy', None)

        peer_addresses = [peer, peer.replace("org1", "org2")]

        command = ["peer", "lifecycle", "chaincode", "commit",
                   "--name", context.chaincode['name'],
                   "--channelID", str(context.chaincode.get('channelID', self.TEST_CHANNEL_ID)),
                   "--version", str(context.chaincode.get('version', 0)),
                   "--sequence", str(context.sequence),
                   "--peerAddresses", "{0}:7051".format(peer_addresses[0]),
                   "--peerAddresses", "{0}:7051".format(peer_addresses[1]),
                   ]
        if initRequired:
            command = command + ["--init-required"]
        if "orderers" in context.chaincode:
            command = command + ["--orderer", 'orderer0.example.com:7050']
        if policy is not None:
            command = command + ["--signature-policy", policy.replace('"', r'\"')]
        if collections:
            command = command + ["--collections-config", collections]
        command.append('"')

        output, err = context.composition.docker_exec(setup + command, [peer], returnError=True)
        print("Error: ", err)
        print("[{0}]: {1}".format(" ".join(setup + command), output))

        return output

    def list_chaincode(self, context, peer, user="Admin", list_type="installed"):
        setup = self.get_env_vars(context, peer, user=user)
        command = ["peer", "chaincode", "list",
                   "--channelID", str(context.chaincode.get('channelID', self.TEST_CHANNEL_ID)),
                   ]
        command = command + ["--{}".format(list_type)]
        if context.newlifecycle:
            command = ["peer", "lifecycle", "chaincode", list_type]
        if list_type in ("committed", "querycommitted"):
            command = command + ["--name", context.chaincode['name'],
                       "--channelID", str(context.chaincode.get('channelID', self.TEST_CHANNEL_ID)),
                       ]

        command.append('"')

        output = context.composition.docker_exec(setup + command, [peer])
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def install_chaincode(self, context, peers, user="Admin", tarball=""):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        output = {}
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, user=user)
            command = ["peer", "chaincode", "install",
                       "--name", context.chaincode['name'],
                       "--version", str(context.chaincode.get('version', 0))]
            if context.newlifecycle:
                command = ["peer", "lifecycle", "chaincode", "install",
                        "{0}/{1}".format(configDir, tarball)]
            else:
                command = command + [
                       "--lang", context.chaincode['language'],
                       "--path", context.chaincode['path']]

            if context.tls:
                command = command + ["--tls",
                                     "--cafile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/ca.crt'.format(configDir, org, user)]
                                     #'{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir)]
            if hasattr(context, "mutual_tls") and context.mutual_tls:
                command = command + ["--clientauth",
                                     "--certfile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                     "--keyfile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]
            if "orderers" in context.chaincode:
                command = command + ["--orderer", 'orderer0.example.com:7050']
            if "user" in context.chaincode:
                command = command + ["--username", context.chaincode["user"]]
            command.append('"')
            # stderr contains the result of the install not stdout
            ret, err = context.composition.docker_exec(setup+command, ['cli'], returnError=True)
            print("[{0}]: {1}".format(" ".join(setup + command), ret))
            print("Error: ", err)

            output.update({peer: ret['cli']})
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def instantiate_chaincode(self, context, peer="peer0.org1.example.com", user="Admin", collectionConfig=None):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        args = context.chaincode.get('args', '[]').replace('"', r'\"')
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
        if collectionConfig is not None:
            command = command + ["--collections-config", "/var/hyperledger/configs/{0}/{1}".format(context.projectName, collectionConfig)]
        if hasattr(context, "mutual_tls") and context.mutual_tls:
            command = command + ["--clientauth",
                                 "--certfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                 "--keyfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]
        if "orderers" in context.chaincode:
            command = command + ["--orderer", 'orderer0.example.com:7050']
        if "user" in context.chaincode:
            command = command + ["--username", context.chaincode["user"]]
        if context.chaincode.get("policy", None) is not None:
            command = command + ["--policy", context.chaincode["policy"].replace('"', r'\"')]
        command.append('"')

        output = context.composition.docker_exec(setup + command, [peer])
        print("[{0}]: {1}".format(" ".join(setup + command), output))
        return output

    def create_channel(self, context, orderer, channelId=TEST_CHANNEL_ID, user="Admin"):
        org = "org1.example.com"
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, "peer0.org1.example.com", user=user)
        # Ideally this would NOT be a 5 minute timeout, but more like a 2 minute timeout.
        seconds = 300 + common_util.convertToSeconds(context.composition.environ.get('CONFIGTX_ORDERER_BATCHTIMEOUT', '0s'))
        command = ["peer", "channel", "create",
                   "--file", "/var/hyperledger/configs/{0}/{1}.tx".format(context.composition.projectName, channelId),
                   "--channelID", channelId,
                   "--timeout", "{}s".format(seconds),
                   "--orderer", '{0}:7050'.format(orderer)]
        if context.tls:
            command = command + ["--tls",
                                 common_util.convertBoolean(context.tls),
                                 "--cafile",
                                 '{0}/peerOrganizations/{2}/users/{3}@{2}/tls/ca.crt'.format(configDir, orderer, org, user),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/{1}/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir, orderer, org, user)]
        if hasattr(context, "mutual_tls") and context.mutual_tls:
            command = command + ["--clientauth",
                                 "--certfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                 "--keyfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]

        command.append('"')

        output = context.composition.docker_exec(setup+command, ['cli'])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        if "SERVICE_UNAVAILABLE" in output['cli']:
            time.sleep(5)
            print("Received: {0}, Trying again...".format(output['cli']))
            output = context.composition.docker_exec(setup+command, ['cli'])
        assert "Error:" not in output, "Unable to successfully create channel {}".format(channelId)

        return output

    def fetch_channel(self, context, peers, orderer, channelId=TEST_CHANNEL_ID, location=None, user="Admin", ext="", block=""):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        if not location:
            location = configDir

        if not ext:
            ext = "block"

        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, includeAll=False, user=user)
            command = ["peer", "channel", "fetch", "config"]
            if block:
                command = ["peer", "channel", "fetch", block]
            command += ["{0}/{1}.{2}".format(location, channelId, ext),
                        "--channelID", channelId,
                        "--orderer", '{0}:7050'.format(orderer)]
            if context.tls:
                command = command + ["--tls",
                                     "--cafile",
                                     '{0}/ordererOrganizations/example.com/orderers/{1}/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir, orderer)]
                                     #'{0}/ordererOrganizations/example.com/orderers/{1}/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir, orderer),
#                                     "--cafile",
#                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/ca.crt'.format(configDir, org, user)]
            if hasattr(context, "mutual_tls") and context.mutual_tls:
                command = command + ["--clientauth",
                                     "--certfile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                     "--keyfile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]

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
        assert "Error: genesis block file not found open " not in output, "Unable to find the genesis block file {0}.block".format(channelId)

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
                                     '{0}/ordererOrganizations/example.com/orderers/{1}/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir, orderer),
                                     "--cafile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/ca.crt'.format(configDir, org, user)]
            if hasattr(context, "mutual_tls") and context.mutual_tls:
                command = command + ["--clientauth",
                                     "--certfile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                     "--keyfile",
                                     '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]

            command.append('"')
            output = context.composition.docker_exec(setup+command, [peer])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        return output

    def sign_channel(self, context, peers, block_filename="update.pb", user="Admin"):
        # peer channel signconfigtx -f org3_update_in_envelope.pb
        for peer in peers:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            setup = self.get_env_vars(context, peer, user=user)
            command = ["peer", "channel", "signconfigtx",
                       "--file", '{}"'.format(block_filename)]
            output = context.composition.docker_exec(setup+command, [peer])
        print("[{0}]: {1}".format(" ".join(setup+command), output))
        return output

    def upgrade_chaincode(self, context, orderer, peer, channelId=TEST_CHANNEL_ID, user="Admin"):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        setup = self.get_env_vars(context, peer, user=user)
        command = ["peer", "chaincode", "upgrade",
                   "--name", context.chaincode['name'],
                   "--version", str(context.chaincode.get('version', 1)),
                   "--channelID", str(context.chaincode.get('channelID', channelId))]
        if context.chaincode["args"]:
            command = command + ["--ctor", r"""'{\"Args\": %s}'""" % (str(context.chaincode["args"].replace('"', r'\"')))]
        if context.tls:
            command = command + ["--tls",
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir),
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/ca.crt'.format(configDir, org, user)]
        if hasattr(context, "mutual_tls") and context.mutual_tls:
            peerParts = peer.split('.')
            org = '.'.join(peerParts[1:])
            command = command + ["--clientauth",
                                 "--certfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                 "--keyfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]
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

    def invoke_chaincode(self, context, chaincode, orderer, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1", opts={}, orgs=[]):
        # channelId, targs, user and opts are optional parameters with defaults set if they are not included
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        peerParts = peer.split('.')
        org = '.'.join(peerParts[1:])
        args = chaincode.get('args', '[]').replace('"', r'\"')
        setup = self.get_env_vars(context, peer, user=user)
        command = ["peer", "chaincode", "invoke",
                   "--name", chaincode['name'],
                   "--orderer", '{0}:7050'.format(orderer),
                   "--ctor", r"""'{\"Args\": %s}'""" % (args),
                   "--waitForEvent",
                   "--channelID", channelId]
        if context.tls:
            # Bundle the certificates for use with the tls cert options. This is the list of certs that will be in a single file.
            certfiles = [
                         "./configs/{0}/peerOrganizations/{1}/peers/peer0.{1}/tls/ca.crt".format(context.composition.projectName, org),
                         "./configs/{0}/peerOrganizations/{1}/users/{2}@{1}/msp/tlscacerts/tlsca.{1}-cert.pem".format(context.composition.projectName, org, user),

                         "./configs/{0}/ordererOrganizations/example.com/orderers/{1}/tls/server.crt".format(context.composition.projectName, orderer),
                         "./configs/{0}/ordererOrganizations/example.com/ca/ca.example.com-cert.pem".format(context.composition.projectName),
                         "./configs/{0}/ordererOrganizations/example.com/orderers/{1}/tls/ca.crt".format(context.composition.projectName, orderer),
                         "./configs/{0}/ordererOrganizations/example.com/tls-cert.pem".format(context.composition.projectName),

                         "./configs/{}/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem".format(context.composition.projectName),
                         "./configs/{}/ordererOrganizations/example.com/tls-cert.pem".format(context.composition.projectName),
                         "./configs/{}/ordererOrganizations/example.com/users/Admin@example.com/msp/tlscacerts/tlsca.example.com-cert.pem".format(context.composition.projectName)]
            for cf in certfiles:
                with open(cf, "r") as c:
                    cert = c.read()
                with open("./configs/{}/certbundle.pem".format(context.composition.projectName), "a") as cb:
                    cb.write(cert)
            print("Saved certificates to ./configs/{}/certbundle.pem".format(context.composition.projectName))

            command = command + ["--tls",
                                 "--tlsRootCertFiles",
                                 "{0}/certbundle.pem".format(configDir),
                                 "--cafile",
                                 "{0}/certbundle.pem".format(configDir),
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/tlsca/tlsca.{1}-cert.pem'.format(configDir, org),
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/ca/ca.{1}-cert.pem'.format(configDir, org),
                                 "--cafile",
                                 "{0}/ordererOrganizations/example.com/users/Admin@example.com/msp/tlscacerts/tlsca.example.com-cert.pem".format(configDir),
                                 "--cafile",
                                 "{0}/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem".format(configDir),
                                 "--cafile",
                                 "{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/tls/ca.crt".format(configDir, org),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/tls-cert.pem'.format(configDir),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/ca/ca.example.com-cert.pem'.format(configDir),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir),
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/ca.crt'.format(configDir, org, user)]


        if hasattr(context, "mutual_tls") and context.mutual_tls:
            command = command + ["--clientauth",
                                 "--certfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user),
                                 "--keyfile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.key'.format(configDir, org, user)]
        if targs:
            #to escape " so that targs are compatible with cli command
            targs = targs.replace('"', r'\"')
            command = command + ["--transient", targs]

        for o in orgs:
            command = command + ["--peerAddresses", "peer0.{0}:7051".format(o)]

        if context.newlifecycle and "init" in args:
            command = command + [
                       "--isInit",
                       "--tlsRootCertFiles",
                       "{0}/peerOrganizations/{1}/peers/peer0.{1}/tls/ca.crt".format(configDir, org)]
            command.append('"')
            output, err = context.composition.docker_exec(setup + command, ["cli"], returnError=True)
            print("Error", err)
            output[peer] = output['cli']
        else:
            command.append('"')
            output = context.composition.docker_exec(setup+command, ['cli'])
            output[peer] = output['cli']
        print("Invoke[{0}]: {1}".format(" ".join(setup+command), str(output)))
        output = self.retry(context, output, peer, setup, command)
        return output

    def query_chaincode(self, context, chaincode, peer, channelId=TEST_CHANNEL_ID, targs="", user="User1", opts={}):
        # channelId, targs and user are optional parameters with defaults set if they are not included
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
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

        if context.tls:
            command = command + ["--tls",
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/tlsca/tlsca.{1}-cert.pem'.format(configDir, org),
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/ca/ca.{1}-cert.pem'.format(configDir, org),
                                 "--cafile",
                                 '{0}/ordererOrganizations/example.com/orderers/orderer0.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'.format(configDir),
                                 "--cafile",
                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/ca.crt'.format(configDir, org, user)]
#                                 "--certfile",
#                                 '{0}/peerOrganizations/{1}/users/{2}@{1}/tls/client.crt'.format(configDir, org, user)]
        command.append('"')
        #result = context.composition.docker_exec(setup+command, [peer])
        result, err = context.composition.docker_exec(setup+command, [peer], returnError=True)
        print("Query Exec command: {0}".format(" ".join(setup+command)))
        print("Error: ", err)
        result = self.retry(context, result, peer, setup, command)
        print("Query Result: {0}".format(result))
        return result

    def getCAUrl(self, context, org, userpass=None):
        proto = "http"
        if context.tls:
            proto = "https"

        caName = "ca.{}".format(org)
        for container in context.composition.containerDataList:
            if container.containerName == caName:
                local = container.ports['7054/tcp'][0]
        if userpass:
            url = "{0}://{1}@localhost:{3}".format(proto, userpass, local['HostIp'], local['HostPort'])
        else:
            url = "{0}://localhost:{2}".format(proto, local['HostIp'], local['HostPort'])
        return url

    def enrollCAadmin(self, context, nodes):
        for node in nodes:
            org = node.split(".", 1)[1]
            userpass = context.composition.getEnvFromContainer("ca.{}".format(org), 'BOOTSTRAP_USER_PASS')
            url = self.getCAUrl(context, org, userpass)

            context.composition.environ["FABRIC_CA_CLIENT_HOME"] = "./configs/{1}/peerOrganizations/{0}/ca".format(org, context.projectName)
            context.composition.environ["FABRIC_CA_CLIENT_TLS_CERTFILES"] = "ca.{0}-cert.pem".format(org, context.projectName)

            command = ["fabric-ca-client enroll --csr.hosts ca.{1},localhost -d -u {0}".format(url, org, context.projectName)]

            newEnv = os.environ.copy()
            newEnv.update(context.composition.environ)

            process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
            output, err = process.communicate()
            print("Output Enroll: {}".format(output))
            print("Err Enroll: {}".format(err))

    def registerUser(self, context, user, org, passwd, role, peer):
        url = self.getCAUrl(context, org)
        command = "fabric-ca-client register -d --id.name {0} --id.secret {2} --csr.hosts ca.{1},localhost -u {4}".format(user, org, passwd, context.projectName, url)
        if role.lower() == u'admin':
            #command += ''' --id.type admin --id.attrs "hf.registrar.roles=client,hf.registrar.attributes=*,hf.revoker=true,hf.gencrl=true,admin=true:ecert,abac.init=true:ecert" '''
            command += ''' --id.type user'''
        else:
            command += ''' --id.type user'''

        context.composition.environ["FABRIC_CA_CLIENT_HOME"] = "./configs/{1}/peerOrganizations/{0}/ca".format(org, context.projectName)
        context.composition.environ["FABRIC_CA_CLIENT_TLS_CERTFILES"] = "ca.{0}-cert.pem".format(org, context.projectName)
        newEnv = os.environ.copy()
        newEnv.update(context.composition.environ)
        process = subprocess.Popen([command], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
        output, err = process.communicate()
        print("user register: {}".format(output))
        print("user err: {}".format(err))

    def enrollUser(self, context, user, org, passwd, enrollType, peer):
        fca = 'ca.{}'.format(org)
        url = self.getCAUrl(context, org, "{0}:{1}".format(user, passwd))

        adminUser = context.composition.getEnvFromContainer(fca, "BOOTSTRAP_USER_PASS")

        context.composition.environ["FABRIC_CA_CLIENT_MSPDIR"] = "msp"
        context.composition.environ["FABRIC_CA_CLIENT_HOME"] = "./configs/{1}/peerOrganizations/{0}/users/{2}@{0}".format(org, context.projectName, user)

        commandlist = ["fabric-ca-client enroll -d --enrollment.profile tls -u {6} -M tls --csr.hosts {3},localhost,{4} --enrollment.type {5} --tls.certfiles ../../ca/ca.{2}-cert.pem".format(user, passwd, org, fca, peer, enrollType, url)]
        commandlist.append("fabric-ca-client enroll -d -u {2} --enrollment.type {1} --csr.hosts {3},localhost,{4} --tls.certfiles ../../tls-cert.pem".format(org, enrollType, url, fca, peer))

        newEnv = os.environ.copy()
        newEnv.update(context.composition.environ)
        for command in commandlist:
            process = subprocess.Popen([command], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
            output, err = process.communicate()
            print("Output: {}".format(output))
            print("Err: {}".format(err))
        for container in context.composition.containerDataList:
            if container.containerName == fca:
                local = container.ports['7054/tcp'][0]

        # Populate the certificates in the user's directory structure
        command = "fabric-ca-client certificate list -d --id {0} --store users/{0}@{1}/tls/ --caname {2} --csr.cn {2},localhost --tls.certfiles ../../tls-cert.pem -u {3}".format(user, org, fca, url)
        process = subprocess.Popen([command], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
        output, err = process.communicate()
        print("Cert Output: {}".format(output))
        #print("Err Output: {}".format(err))

    def enrollUsersFabricCA(self, context):
        configDir = "/var/hyperledger/configs/{0}".format(context.composition.projectName)
        for user in context.users.keys():
            org = context.users[user]['organization']
            passwd = context.users[user]['password']
            role = context.users[user].get('role', "user")
            enrollType = context.users[user].get('certType', "x509")
            peer = 'peer0.{}'.format(org)

            # Enroll (login) admin first
            self.enrollCAadmin(context, [peer])

            self.registerUser(context, user, org, passwd, role, peer)
            self.enrollUser(context, user, org, passwd, enrollType, peer)
            if enrollType == u'idemix':
                self.addIdemixIdentities(context, user, passwd, role, org)

            # Place the certificates in the set directory structure
            self.placeCertsInDirStruct(context, user, org, peer, role)

    def placeCertsInDirStruct(self, context, user, org, peer, role):
        fca = 'ca.{}'.format(org)

        # Ensure that the owner of all of the user directories are the same
        print("Checking file ownership: /var/hyperledger/users/{0}@{1} ...".format(user, org))
        output = context.composition.docker_exec(['stat -c "%u %g" /var/hyperledger/users/Admin@{0}'.format(org)], [peer])
        out = output[peer].strip().split(" ")
        print("Existing stat:: {}".format(out))
        output = context.composition.docker_exec(['stat -c "%u %g" /var/hyperledger/users/{0}@{1}'.format(user, org)], [peer])
        new = output[peer].strip().split(" ")
        print("New stat:: {}".format(new))
        if new[0] != out[0]:
            context.printEnvWarning = True
            output = context.composition.docker_exec(['chown -R {2}:{3} /var/hyperledger/users/{0}@{1}'.format(user, org, out[0], out[1])], [peer])

        if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp".format(user, org, context.projectName)):
            os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp".format(user, org, context.projectName))
        if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/signcerts".format(user, org, context.projectName)):
            os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/signcerts".format(user, org, context.projectName))
        if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/keystore".format(user, org, context.projectName)):
            os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/keystore".format(user, org, context.projectName))
        if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/cacerts".format(user, org, context.projectName)):
            os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/cacerts".format(user, org, context.projectName))
        if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/admincerts".format(user, org, context.projectName)):
            os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/admincerts".format(user, org, context.projectName))
        if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/tlscacerts".format(user, org, context.projectName)):
            os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/tlscacerts".format(user, org, context.projectName))

        shutil.copy("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/signcerts/cert.pem".format(user, org, context.projectName),
                    "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/client.crt".format(user, org, context.projectName))
        shutil.copy("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/signcerts/cert.pem".format(user, org, context.projectName),
                    "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/signcerts/{0}@{1}-cert.pem".format(user, org, context.projectName))
        shutil.copy("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/signcerts/cert.pem".format(user, org, context.projectName),
                    "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/admincerts/{0}@{1}-cert.pem".format(user, org, context.projectName))
        keyfile = os.listdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/keystore/".format(user, org, context.projectName))[0]
        shutil.copy("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/keystore/{3}".format(user, org, context.projectName, keyfile),
                    "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/client.key".format(user, org, context.projectName))

        shutil.copy("configs/{2}/peerOrganizations/{1}/users/Admin@{1}/tls/ca.crt".format(user, org, context.projectName),
                    "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/ca.crt".format(user, org, context.projectName))

        tlsFiles = os.listdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/tlscacerts/".format(user, org, context.projectName))
        shutil.copy("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/tls/tlscacerts/{3}".format(user, org, context.projectName, tlsFiles[0]),
                    "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/tlscacerts/tlsca.{1}-cert.pem".format(user, org, context.projectName))

        if role.lower() == u'admin':
            if not os.path.exists("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/admincerts".format(user, org, context.projectName)):
                os.mkdir("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/admincerts".format(user, org, context.projectName))
            shutil.copy("configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/signcerts/{0}@{1}-cert.pem".format(user, org, context.projectName),
                        "configs/{2}/peerOrganizations/{1}/users/{0}@{1}/msp/admincerts/{0}@{1}-cert.pem".format(user, org, context.projectName))

        url = self.getCAUrl(context, org)
        context.composition.environ["FABRIC_CA_CLIENT_HOME"] = "./configs/{1}/peerOrganizations/{0}".format(org, context.projectName)
        command = "fabric-ca-client getcacert -d -u {3} -M users/{1}@{2}/msp --tls.certfiles ca/{0}-cert.pem".format(fca, user, org, url)
        newEnv = os.environ.copy()
        newEnv.update(context.composition.environ)
        process = subprocess.Popen([command], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
        output, err = process.communicate()
        print("CACert Output: {}".format(output))
        #print("CACert Err: {}".format(err))

    def addIdemixIdentities(self, context, user, passwd, role, org):
        peer = 'peer0.{}'.format(org)
        d = {"passwd": passwd, "role": role, "org": org, "username": user, "attrib": [{"name": "hf.Revoker", "value": "true"}]}
        if role.lower() == u'admin':
            d["attrib"].append({"name": "admin", "value": "true:ecert"})

        context.composition.environ["FABRIC_CA_CLIENT_HOME"] = "./configs/{1}/peerOrganizations/{0}".format(org, context.projectName)
        commandStr = "fabric-ca-client identity add {0} --json '{\"secret\": \"passwd\", \"type\": \"user\", \"affiliation\": \"org\", \"max_enrollments\": 1, \"attrs\": attrib}' --id.name username --id.secret passwd --tls.certfiles /var/hyperledger/msp/cacerts/ca.org-cert.pem"
        command = self.find_replace_multi_ordered(commandStr, d)
        newEnv = os.environ.copy()
        newEnv.update(context.composition.environ)
        process = subprocess.Popen([command], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
        output, err = process.communicate()
        print("Idemix Output: {}".format(output))

        newEnv = os.environ.copy()
        newEnv.update(context.composition.environ)
        process = subprocess.Popen(["fabric-ca-client identity list"], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=newEnv)
        output, err = process.communicate()
        print("Ident List: {}".format(output))

    def wait_for_deploy_completion(self, context, chaincode_container, seconds):
        try:
            containers = subprocess.check_output(["docker ps -a"], shell=True)
            with timeout(seconds, exception=Exception):
                while chaincode_container not in containers:
                    containers = subprocess.check_output(["docker ps -a"], shell=True)
                    time.sleep(1)
        finally:
            assert chaincode_container in containers, "The expected chaincode container {0} is not running\n{1}".format(chaincode_container, containers)

        # Allow time for chaincode initialization to complete
        time.sleep(5)

    def retry(self, context, output, peer, setup, command):
        count = 0
        while count < 3:
            count += 1
            if "been successfully instantiated and try again" in output[peer]:
                time.sleep(5)
                print("Received: {0}, Trying again({1})...".format(output[peer], count))
                output = context.composition.docker_exec(setup+command, [peer])
        return output
