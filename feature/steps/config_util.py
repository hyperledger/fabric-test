#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#


import subprocess
import os
import sys
from shutil import copyfile
import uuid

ORDERER_TYPES = ["solo",
                 "kafka",
                 "solo-msp"]

PROFILE_TYPES = {"solo": "SampleInsecureSolo",
                 "kafka": "SampleInsecureKafka",
                 "solo-msp": "SampleSingleMSPSolo"}

CHANNEL_PROFILE = "SysTestChannel"

ORDERER_STR = '''
OrdererOrgs:
  - Name: ExampleCom
    Domain: example.com
    Specs: '''

ORDERER_HOST = '''
      - Hostname: orderer{count} '''

PEER_ORG_STR = '''
  - Name: {name}
    Domain: {domain}
    EnableNodeOUs: {ouEnable}
    Template:
      Count: {numPeers}
    Users:
      Count: {numUsers}
'''

def updateEnviron(context):
    updated_env = os.environ.copy()
    if hasattr(context, "composition"):
        updated_env.update(context.composition.getEnv())
    return updated_env

def makeProjectConfigDir(context):
    # Save all the files to a specific directory for the test
    if not hasattr(context, "projectName") and not hasattr(context, "composition"):
        projectName = str(uuid.uuid1()).replace('-','')
        context.projectName = projectName
    elif hasattr(context, "composition"):
        projectName = context.composition.projectName
    else:
        projectName = context.projectName

    testConfigs = "configs/%s" % projectName
    if not os.path.isdir(testConfigs):
        os.mkdir(testConfigs)
    return testConfigs

def buildCryptoFile(context, numOrgs, numPeers, numOrderers, numUsers, orgName=None, ouEnable=False):
    testConfigs = makeProjectConfigDir(context)

    # Orderer Stanza
    ordererHostStr = ""
    for count in range(int(numOrderers)):
        ordererHostStr += ORDERER_HOST.format(count=count)
    ordererStr = ORDERER_STR + ordererHostStr

    # Peer Stanza
    peerStanzas = ""
    for count in range(int(numOrgs)):
        name = "Org{0}ExampleCom".format(count+1)
        domain = "org{0}.example.com".format(count+1)
        if orgName is not None:
            name = orgName.title().replace('.', '')
            domain = orgName
        peerStanzas += PEER_ORG_STR.format(name=name, domain=domain, numPeers=numPeers, numUsers=numUsers, ouEnable=ouEnable)
    peerStr = "PeerOrgs:" + peerStanzas

    cryptoStr = ordererStr + "\n\n" + peerStr
    with open("{0}/crypto.yaml".format(testConfigs), "w") as fd:
        fd.write(cryptoStr)

def setupConfigs(context, channelID):
    testConfigs = makeProjectConfigDir(context)
    print("testConfigs: {0}".format(testConfigs))

    configFile = "configtx.yaml"
    if os.path.isfile("configs/%s.yaml" % channelID):
        configFile = "%s.yaml" % channelID

    copyfile("configs/%s" % configFile, "%s/configtx.yaml" % testConfigs)

    # Copy config to orderer org structures
    for orgDir in os.listdir("./{0}/ordererOrganizations".format(testConfigs)):
        copyfile("{0}/configtx.yaml".format(testConfigs),
                 "{0}/ordererOrganizations/{1}/msp/config.yaml".format(testConfigs,
                                                                       orgDir))
    # Copy config to peer org structures
    for orgDir in os.listdir("./{0}/peerOrganizations".format(testConfigs)):
        copyfile("{0}/configtx.yaml".format(testConfigs),
                 "{0}/peerOrganizations/{1}/msp/config.yaml".format(testConfigs,
                                                                    orgDir))
        copyfile("{0}/configtx.yaml".format(testConfigs),
                 "{0}/peerOrganizations/{1}/users/Admin@{1}/msp/config.yaml".format(testConfigs,
                                                                                    orgDir))

def inspectOrdererConfig(context, filename):
    testConfigs = makeProjectConfigDir(context)
    updated_env = updateEnviron(context)
    try:
        command = ["configtxgen", "-inspectBlock", filename]
        return subprocess.check_output(command, cwd=testConfigs, env=updated_env)
    except:
        print("Unable to inspect orderer config data: {0}".format(sys.exc_info()[1]))

def inspectChannelConfig(context, filename):
    testConfigs = makeProjectConfigDir(context)
    updated_env = updateEnviron(context)
    try:
        command = ["configtxgen", "-inspectChannelCreateTx", filename]
        return subprocess.check_output(command, cwd=testConfigs, env=updated_env)
    except:
        print("Unable to inspect channel config data: {0}".format(sys.exc_info()[1]))

def generateConfig(context, channelID, profile, ordererProfile, block="orderer.block"):
    setupConfigs(context, channelID)
    generateOrdererConfig(context, channelID, ordererProfile, block)
    generateChannelConfig(channelID, profile, context)
    generateChannelAnchorConfig(channelID, profile, context)

def generateOrdererConfig(context, channelID, ordererProfile, block):
    testConfigs = makeProjectConfigDir(context)
    updated_env = updateEnviron(context)
    try:
        command = ["configtxgen", "-profile", ordererProfile,
                   "-outputBlock", block,
                   "-channelID", channelID]
        subprocess.check_call(command, cwd=testConfigs, env=updated_env)
    except:
        print("Unable to generate orderer config data: {0}".format(sys.exc_info()[1]))

def generateChannelConfig(channelID, profile, context):
    testConfigs = makeProjectConfigDir(context)
    updated_env = updateEnviron(context)
    try:
        command = ["configtxgen", "-profile", profile,
                   "-outputCreateChannelTx", "%s.tx" % channelID,
                   "-channelID", channelID]
        subprocess.check_call(command, cwd=testConfigs, env=updated_env)
    except:
        print("Unable to generate channel config data: {0}".format(sys.exc_info()[1]))

def generateChannelAnchorConfig(channelID, profile, context):
    testConfigs = makeProjectConfigDir(context)
    updated_env = updateEnviron(context)
    for org in os.listdir("./{0}/peerOrganizations".format(testConfigs)):
        try:
            command = ["configtxgen", "-profile", profile,
                       "-outputAnchorPeersUpdate", "{0}{1}Anchor.tx".format(org, channelID),
                       "-channelID", channelID,
                       "-asOrg", org.title().replace('.', '')]
            subprocess.check_call(command, cwd=testConfigs, env=updated_env)
        except:
            print("Unable to generate channel anchor config data: {0}".format(sys.exc_info()[1]))

def generateCrypto(context, cryptoLoc="./configs/crypto.yaml"):
    testConfigs = makeProjectConfigDir(context)
    updated_env = updateEnviron(context)
    try:
        subprocess.check_call(["cryptogen", "generate",
                               '--output={0}'.format(testConfigs),
                               '--config={0}'.format(cryptoLoc)],
                              env=updated_env)
    except:
        print("Unable to generate crypto material: {0}".format(sys.exc_info()[1]))

def traverse_orderer(projectname, numOrderers, tlsExist):
    # orderer stanza
    opath = 'configs/' +projectname+ '/ordererOrganizations/example.com/'
    capath = opath + 'ca/'
    caCertificates(capath)

    msppath = opath + 'msp/'
    rolebasedCertificate(msppath)

    for count in range(int(numOrderers)):
        ordererpath = opath + 'orderers/' + "orderer" +str(count)+".example.com/"
        mspandtlsCheck(ordererpath, tlsExist)

    userpath = opath + 'users/Admin@example.com/'
    mspandtlsCheck(userpath, tlsExist)

def traverse_peer(projectname, numOrgs, numPeers, numUsers, tlsExist, orgName=None):
    # Peer stanza
    pppath = 'configs/' +projectname+ '/peerOrganizations/'
    for orgNum in range(int(numOrgs)):
        if orgName is None:
            orgName = "org" + str(orgNum) + ".example.com"
        for peerNum in range(int(numPeers)):
            orgpath = orgName + "/"
            ppath = pppath + orgpath
            peerpath = ppath +"peers/"+"peer"+str(peerNum)+ "."+ orgpath

            mspandtlsCheck(peerpath, tlsExist)

            capath = ppath + 'ca/'
            caCertificates(capath)

            msppath = ppath + 'msp/'
            rolebasedCertificate(msppath)
            keystoreCheck(msppath)

            userAdminpath = ppath +"users/"+"Admin@"+orgpath
            mspandtlsCheck(userAdminpath, tlsExist)

            for count in range(int(numUsers)):
                userpath = ppath + "users/"+"User"+str(count)+"@"+orgpath
                mspandtlsCheck(userpath, tlsExist)

def generateCryptoDir(context, numOrgs, numPeers, numOrderers, numUsers, tlsExist=True, orgName=None):
    projectname = context.projectName
    traverse_peer(projectname, numOrgs, numPeers, numUsers, tlsExist, orgName)
    traverse_orderer(projectname, numOrderers, tlsExist)

def mspandtlsCheck(path, tlsExist):
    msppath = path + 'msp/'
    rolebasedCertificate(msppath)
    keystoreCheck(msppath)

    if not tlsExist:
       tlspath = path + 'tls/'
       tlsCertificates(tlspath)

def fileExistWithExtension(path, message, fileExt=''):
    for root, dirnames, filenames in os.walk(path):
        assert len(filenames) > 0, "{0}: len: {1}".format(message, len(filenames))
        fileCount = [filename.endswith(fileExt) for filename in filenames]
        assert fileCount.count(True) >= 1

def rolebasedCertificate(path):
    adminpath = path + "admincerts/"
    fileExistWithExtension(adminpath, "There is not .pem cert in {0}.".format(adminpath), '.pem')

    capath = path + "cacerts/"
    fileExistWithExtension(capath, "There is not .pem cert in {0}.".format(capath), '.pem')

    signcertspath = path + "signcerts/"
    fileExistWithExtension(signcertspath, "There is not .pem cert in {0}.".format(signcertspath), '.pem')

    tlscertspath = path + "tlscerts/"
    fileExistWithExtension(tlscertspath, "There is not .pem cert in {0}.".format(tlscertspath), '.pem')

def caCertificates(path):
    # There are no ca directories containing pem files
    fileExistWithExtension(path, "There are missing files in {0}.".format(path), '_sk')
    fileExistWithExtension(path, "There is not .pem cert in {0}.".format(path), '.pem')

def tlsCertificates(path):
    for root, dirnames, filenames in os.walk(path):
        assert len(filenames) == 3, "There are missing certificates in the {0} dir".format(path)
        for filename in filenames:
            assert filename.endswith(('.crt','.key')), "The files in the {0} directory are incorrect".format(path)

def keystoreCheck(path):
    keystorepath = path + "keystore/"
    fileExistWithExtension(keystorepath, "There are missing files in {0}.".format(keystorepath), '')
