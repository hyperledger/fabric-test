import os
import json
import shutil

from compose import Composition, CompositionCallback
from bootstrap_util import CallbackHelper, getDirectory, PathType, calculate_ski_per_sdk_node, get_compose_service_by_organization, LocalMspConfig

from b3j0f.aop import weave

from OpenSSL import crypto


class ComposerCompositionCallback(CompositionCallback, CallbackHelper):
    'Responsible for setting up Composer nodes upon composition'

    def __init__(self, context, peerCompositionCallback):
        CallbackHelper.__init__(self, discriminator="composer")
        self.context = context
        # Store the other compositionCallback helpers for later usage.
        self.peerCompositionCallback = peerCompositionCallback
        Composition.RegisterCallbackInContext(self.context, self)
        # Weave advices into Directory to intercept config admins list
        self.directory = getDirectory(self.context)
        weave(target=self.directory.find_config_admins_for_org, advices=self._directory_find_config_admins_for_org_advice)

    def _directory_find_config_admins_for_org_advice(self, joinpoint):
        'This advice will add the Signer for the composer instance associated with the given organization if any'
        #TODO: This advice should be removed once the permission model is corrected in composer
        org = joinpoint.kwargs['org']
        directory = joinpoint.kwargs['self']
        config_admin_nat_and_cert_tuple_list = joinpoint.proceed()
        # Now find any composer signer certs within this organization and add them to config_admin list
        for pnt, cert in [(peerNodeTuple, cert) for peerNodeTuple, cert in directory.ordererAdminTuples.items() if
                          "composer" in peerNodeTuple.user and "signer" in peerNodeTuple.user.lower() and org.name == peerNodeTuple.organization]:
            config_admin_nat_and_cert_tuple_list.append((pnt, cert))
        return config_admin_nat_and_cert_tuple_list

    def getComposerList(self, composition):
        return [serviceName for serviceName in composition.getServiceNames() if "composer" in serviceName]

    def getComposerPath(self, project_name, compose_service, pathType=PathType.Local):
        return "{0}/{1}".format(self.getVolumePath(project_name, pathType), compose_service)

    def create_v1_metadata(self, user_name):
        metadata = {"version":1,"userName": user_name,"businessNetwork": None,"roles":["PeerAdmin","ChannelAdmin"]}
        return metadata

    def create_v1_id_card(self, node_admin_tuple, conn_profile):
        from zipfile import ZipFile
        from io import BytesIO
        user_name = node_admin_tuple.user
        user = self.directory.getUser(userName=user_name)
        in_memory = BytesIO()
        zf = ZipFile(in_memory, mode="w")
        metadata = self.create_v1_metadata(user_name=node_admin_tuple.nodeName)
        zf.writestr("metadata.json", json.dumps(metadata, separators=(',', ':')))
        zf.writestr("connection.json", json.dumps(conn_profile, separators=(',', ':')))
        cert = self.directory.findCertForNodeAdminTuple(node_admin_tuple)
        zf.writestr(os.path.join("credentials","certificate"), crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
        zf.writestr(os.path.join("credentials","privateKey"), crypto.dump_privatekey(crypto.FILETYPE_PEM, user.pKey))
        zf.close()
        in_memory.seek(0)
        return in_memory.read()

    def create_v1_conn_profile(self, profile_name, channel, description, key_val_store_path, orderer_compose_services, peer_compose_services, msp_id, timeout=300):
        connection_profile = {'type': 'hlfv1'}
        connection_profile['name'] = profile_name
        connection_profile['description'] = description

        orderer_list = [{"url": "grpcs://{0}:7050".format(orderer),
                         "cert": self.directory.getTrustedRootsForOrdererNetworkAsPEM(),
                         "hostnameOverride": orderer,
                         } for orderer in orderer_compose_services]
        connection_profile["orderers"] = orderer_list
        connection_profile["ca"] = {"url" : "http://peer0:7054", "name" : ""}
        peer_list = [{
            "requestURL": "grpcs://{0}:7051".format(peer),
            "eventURL": "grpcs://{0}:7053".format(peer),
            "cert": self.directory.getTrustedRootsForPeerNetworkAsPEM(),
            "hostnameOverride": peer,
        } for peer in peer_compose_services]
        connection_profile["peers"] = peer_list
        connection_profile["channel"] = "com.acme.blockchain.jdoe.channel1"
        connection_profile["mspID"] = msp_id
        connection_profile["timeout"] = "{0}".format(timeout)
        connection_profile["keyValStore"] = key_val_store_path
        return connection_profile


    def getConnectionProfile(self, ordererCertPath, peerCertPath, key_val_store_path, orderer_compose_services, peer_compose_services, msp_id):
        connectionProfile = {'type': 'hlfv1'}
        orderer_list = [{"url": "grpcs://{0}:7050".format(orderer),
                         "cert": ordererCertPath,
                         } for orderer in orderer_compose_services]
        connectionProfile["orderers"] = orderer_list
        connectionProfile["ca"] = "http://peer0:7054"
        peer_list = [{
            "requestURL": "grpcs://{0}:7051".format(peer),
            "eventURL": "grpcs://{0}:7053".format(peer),
            "cert": peerCertPath,
        } for peer in peer_compose_services]
        connectionProfile["peers"] = peer_list
        connectionProfile["channel"] = "com.acme.blockchain.jdoe.channel1"
        connectionProfile["mspID"] = msp_id
        connectionProfile["deployWaitTime"] = "300"
        connectionProfile["invokeWaitTime"] = "100"
        connectionProfile["keyValStore"] = key_val_store_path
        return {"connectionProfiles" : {"hlfabric": connectionProfile}}

    def getAdminDict(self, ski, certificate_as_pem, msp_id):
        admin = {"name": "admin",
                 "mspid": msp_id,
                 "roles": None,
                 "affiliation": "",
                 "enrollmentSecret": "password",}
        enrollment = {"signingIdentity": ski,
                      "identity": {"id": "testIdentity",
                                   "certificate": certificate_as_pem}}
        admin["enrollment"] = enrollment
        return admin

    def getTrustedRootsPaths(self, project_name, composer_service, pathType=PathType.Local):
        composerPath = self.getComposerPath(project_name=project_name, compose_service=composer_service, pathType=pathType)
        return ("{0}/{1}.pem".format(composerPath, "trusted_orderer_roots"), "{0}/{1}.pem".format(composerPath, "trusted_peer_roots"))

    def getKeyValStorePath(self, project_name, composer_service, pathType=PathType.Local):
        composerPath = self.getComposerPath(project_name=project_name, compose_service=composer_service, pathType=pathType)
        return "{0}/{1}".format(composerPath, "keyValStoreV1")

    def write_keyvalstore_files(self, cert_tuple, key_val_store_path, json_file_name):
        user = self.directory.getUser(cert_tuple.user)
        cert = self.directory.findCertForNodeAdminTuple(cert_tuple)
        ski = calculate_ski_per_sdk_node(cert.get_pubkey())
        # write out the keyValStore files
        with open("{0}/{1}-priv".format(key_val_store_path, ski),
                  "w") as f:
            f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, user.pKey))
        with open("{0}/{1}-pub".format(key_val_store_path, ski), "w") as f:
            f.write(crypto.dump_publickey(crypto.FILETYPE_PEM, cert.get_pubkey()))
        adminDict = self.getAdminDict(ski=ski, certificate_as_pem=crypto.dump_certificate(crypto.FILETYPE_PEM, cert), msp_id=cert_tuple.organization)
        with open("{0}/{1}".format(key_val_store_path, json_file_name), "w") as f:
            f.write(json.dumps(adminDict, separators=(',', ':')))

    def composing(self, composition, context):
        directory = getDirectory(context)
        ordererTrustedRootsPEM = directory.getTrustedRootsForOrdererNetworkAsPEM()
        peerTrustedRootsPEM = directory.getTrustedRootsForPeerNetworkAsPEM()
        for composer_service in self.getComposerList(composition):
            composerPath = self.getComposerPath(project_name=composition.projectName, compose_service=composer_service)
            os.makedirs(composerPath)
            (orderer_trusted_roots, peer_trusted_roots) = self.getTrustedRootsPaths(project_name=composition.projectName, composer_service=composer_service)
            with open(orderer_trusted_roots, "w") as f:
                f.write(ordererTrustedRootsPEM)
            with open(peer_trusted_roots, "w") as f:
                f.write(peerTrustedRootsPEM)
            key_val_store_path = self.getKeyValStorePath(project_name=composition.projectName, composer_service=composer_service)
            os.makedirs(key_val_store_path)

            # Find the composer signer Tuple for this composer service
            for pnt, cert in [(peerNodeTuple, cert) for peerNodeTuple, cert in directory.ordererAdminTuples.items() if
                              composer_service in peerNodeTuple.user and "signer" in peerNodeTuple.user.lower()]:
                self.write_keyvalstore_files(cert_tuple=pnt, key_val_store_path=key_val_store_path, json_file_name="admin")

                # #Write ID card info out
                # self.write_id_card("{0}-{1}".format(pnt.nodeName, composition.projectName), channel=, description,
                #                    key_val_store_path, orderer_compose_services,
                #                    peer_compose_services, msp_id, timeout=300)

                # TODO: Revisit this after David Kelsey and Composer team rework identity workflow for install/instantiate
                #Loop through all peers associated with the same organization as the user and modify the localMspConfig.admincerts adding the signer cert.
                for org_name, peer_compose_services_group in get_compose_service_by_organization(directory=directory, discriminator=self.peerCompositionCallback.discriminator):
                    if org_name == pnt.organization:
                        for _, peer_compose_service in peer_compose_services_group:
                            peer_local_msp_config_path = self.peerCompositionCallback.getLocalMspConfigPath(project_name=composition.projectName, compose_service=peer_compose_service)
                            with open('{0}/{1}/{2}.pem'.format(peer_local_msp_config_path,LocalMspConfig.admincerts.name,pnt.user),'w') as f:
                                f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))




    def decomposing(self, composition, context):
        'Will remove the orderer volume path folder for the context'
        vol_path = self.getVolumePath(project_name=composition.projectName)
        if os.path.isdir(vol_path):
            shutil.rmtree()

    def getEnv(self, composition, context, env):
        directory = getDirectory(context)
        for composer_service in self.getComposerList(composition):
            (orderer_trusted_roots, peer_trusted_roots) = self.getTrustedRootsPaths(project_name=composition.projectName, composer_service=composer_service, pathType=PathType.Container)
            keyValStorePath = self.getKeyValStorePath(project_name=composition.projectName, composer_service=composer_service, pathType=PathType.Container)
            (owning_org_name, peer_compose_services) = get_peers_for_composer_service(directory=directory,
                                                                                      composer_service=composer_service)
            connectionProfileDict = self.getConnectionProfile(ordererCertPath=orderer_trusted_roots,
                                                              peerCertPath=peer_trusted_roots,
                                                              key_val_store_path=keyValStorePath,
                                                              orderer_compose_services=['orderer0'],
                                                              peer_compose_services=peer_compose_services,
                                                              msp_id=owning_org_name)
            env["{0}_COMPOSER_CONFIG".format(composer_service.upper())] = json.dumps(connectionProfileDict, separators=(',', ':'))
            keyValStorePath = self.getKeyValStorePath(project_name=composition.projectName, composer_service=composer_service, pathType=PathType.Local)
            env["{0}_PATH_TO_HFC".format(composer_service.upper())] = keyValStorePath

def get_peers_for_composer_service(directory, composer_service):
    pnt_cert_tuple_list = [(pnt, cert) for pnt, cert in directory.ordererAdminTuples.items() if
                           composer_service in pnt.user and "signer" in pnt.user.lower()]
    assert len(pnt_cert_tuple_list) ==1, "Expected only a single cert match for composerXSigner for a given composer service"
    org_name_that_owns_composer = pnt_cert_tuple_list[0][0].organization
    peers = []
    for org_name, peer_compose_services_group in get_compose_service_by_organization(directory=directory, discriminator="peer"):
        if org_name == org_name_that_owns_composer:
            for _, peer_compose_service in peer_compose_services_group:
                peers.append(peer_compose_service)
    return (org_name_that_owns_composer, peers)
