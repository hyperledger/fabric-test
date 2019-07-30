/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var fs = require('fs-extra');
var hfc = require('fabric-client');
var FabricCAServices = require('fabric-ca-client');
var jsrsa = require('jsrsasign');
var os = require('os');
var path = require('path');
var yaml = require('js-yaml');
var util = require('util');
var winston = require('winston');

var KEYUTIL = jsrsa.KEYUTIL;


var copService = require('fabric-ca-client/lib/FabricCAServices.js');
var User = require('fabric-common/lib/User.js');
//var Constants = require('./constants.js');

// var logger = require('fabric-common/lib/Utils.js').getLogger('PTE util');

var PTEid = parseInt(process.argv[5]);
var loggerMsg='PTE ' + PTEid + ' util';
var logger = new PTELogger({"prefix":loggerMsg, "level":"info"});


module.exports.CHAINCODE_PATH = 'github.com/example_cc';
module.exports.CHAINCODE_UPGRADE_PATH = 'github.com/example_cc1';
module.exports.CHAINCODE_MARBLES_PATH = 'github.com/marbles_cc';
module.exports.END2END = {
    channel: 'mychannel',
    chaincodeId: 'end2end',
    chaincodeVersion: 'v0'
};


// directory for file based KeyValueStore
module.exports.KVS = '/tmp/hfc-test-kvs';
module.exports.storePathForOrg = function(networkid, org) {
    return module.exports.KVS + '_' + networkid + '_' + org;
};

// temporarily set $GOPATH to the test fixture folder
module.exports.setupChaincodeDeploy = function() {
    process.env.GOPATH = path.join(__dirname, '../fixtures');
};

// specifically set the values to defaults because they may have been overridden when
// running in the overall test bucket ('gulp test')
module.exports.resetDefaults = function() {
    global.hfc.config = undefined;
    require('nconf').reset();
};

module.exports.cleanupDir = function(keyValStorePath) {
    var absPath = path.resolve(process.cwd(), keyValStorePath);
    var exists = module.exports.existsSync(absPath);
    if (exists) {
        fs.removeSync(absPath);
    }
};

module.exports.getUniqueVersion = function(prefix) {
    if (!prefix) prefix = 'v';
    return prefix + Date.now();
};

// utility function to check if directory or file exists
// uses entire / absolute path from root
module.exports.existsSync = function(absolutePath /*string*/) {
    try  {
        var stat = fs.statSync(absolutePath);
        if (stat.isDirectory() || stat.isFile()) {
            return true;
        } else
            return false;
    }
    catch (e) {
        return false;
    }
};

module.exports.readFile = readFile;

var tlsOptions = {
    trustedRoots: [],
    verify: false
};


// is an object empty?
function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
             return false;
    }

    return true;

}

// get Connection Profile property counts
function getConnProfilePropCnt(cpf, prop) {

    if ( cpf === null ) {
       logger.error('[getConnProfilePropCnt] the connection profile is invalid: null');
       return 0;
    }

    if ( ! cpf.hasOwnProperty(prop) ) {
       logger.error('[getConnProfilePropCnt] prop (%s) is not found in connectino profile', prop);
       return 0;
    }

    if ( true === isEmpty(cpf[prop]) ) {
       logger.error('[getConnProfilePropCnt] prop (%s) is empty in connectino profile', prop);
       return 0;
    }

    let cnt = Object.getOwnPropertyNames(cpf[prop]).length;
    logger.info('[getConnProfilePropCnt] prop (%s) cnt: %d', prop, cnt);

    return cnt;

}
module.exports.getConnProfilePropCntSubmitter=function(cpf, key) {
    return getConnProfilePropCnt(cpf, key);
}

// find Connection Profile for an org
function findOrgConnProfile(fileList, orgname) {
    logger.info('[findOrgConnProfile] orgname(%s), input File list: ', orgname, fileList);
    for (i=0; i<fileList.length; i++) {
        var cpf = fileList[i];
        var temp = readConfigFile(cpf, 'test-network');
        if ( temp['organizations'] && temp['organizations'][orgname] ) {
            logger.info('[findOrgConnProfile] orgname(%s) found File: ', orgname, cpf);
            return temp;
        }
    }
    return null;
}

module.exports.findOrgConnProfileSubmitter=function(fileList, orgname) {
    return findOrgConnProfile(fileList, orgname);
}

// set pointer to the keyreq in the input File
// if key is missing or invalid, set the pointer to the beginning of the File
function readConfigFile(inFile, keyreq) {
    var temp;
    var file_ext = path.extname(inFile);
    logger.info('[readConfigFile] input File: ', inFile);
    if ((/(yml|yaml)$/i).test(file_ext)) {
        temp = yaml.safeLoad(fs.readFileSync(inFile, 'utf8'));
    } else {
        temp = JSON.parse(fs.readFileSync(inFile));
    }

    if ( temp[keyreq] ) {
        logger.info('[readConfigFile] set pointer to %s[%s] ', inFile, keyreq);
        return temp[keyreq];
    } else {
        logger.info('[readConfigFile] set pointer to %s', inFile);
        return temp;
    }

}

module.exports.readConfigFileSubmitter=function(inFile, keyreq) {
    return readConfigFile(inFile, keyreq);
}


// find org CA
function findOrgCA(inPtr, org) {
    var cpOrgs = inPtr['organizations'];
    if ( 0 === getConnProfilePropCnt(inPtr, 'certificateAuthorities') ) {
        logger.info('[findOrgCA] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    var cpCAs = inPtr['certificateAuthorities'];
    var orgCA;
    if ( cpOrgs[org].hasOwnProperty('certificateAuthorities') ) {
        orgCA=cpOrgs[org].certificateAuthorities[0];
    } else {
        orgCA=Object.getOwnPropertyNames(cpCAs)[0];
    }
    return orgCA;

}

// get enroll ID
function getOrgEnrollId(inPtr, org) {
    var cpOrgs = inPtr['organizations'];
    if ( 0 === getConnProfilePropCnt(inPtr, 'certificateAuthorities') ) {
        logger.info('[getOrgEnrollId] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    var cpCAs = inPtr['certificateAuthorities'];
    var orgCA = findOrgCA(inPtr, org);

    if ( cpCAs[orgCA].hasOwnProperty('registrar') && cpCAs[orgCA].registrar.hasOwnProperty('enrollId') ) {
        return cpCAs[orgCA].registrar.enrollId;
    } else {
        return 'admin';
    }

}
module.exports.getOrgEnrollIdSubmitter=function(inPtr, org) {
    return getOrgEnrollId(inPtr, org);
}

// get enroll secret
function getOrgEnrollSecret(inPtr, org) {
    var cpOrgs = inPtr['organizations'];
    if ( 0 === getConnProfilePropCnt(inPtr, 'certificateAuthorities') ) {
        logger.info('[getOrgEnrollSecret] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    var cpCAs = inPtr['certificateAuthorities'];
    var orgCA = findOrgCA(inPtr, org);

    if ( cpCAs[orgCA].hasOwnProperty('registrar') && cpCAs[orgCA].registrar.hasOwnProperty('enrollSecret') ) {
        return cpCAs[orgCA].registrar.enrollSecret;
    } else {
        return 'adminpw';
    }
}
module.exports.getOrgEnrollSecretSubmitter=function(inPtr, org) {
    return getOrgEnrollSecret(inPtr, org);
}

function getGoPath(inPtr) {

    var goPath;
    if ( typeof(inPtr.gopath) === 'undefined' ) {
        goPath = '';
    } else if ( inPtr.gopath == 'GOPATH' ) {
        goPath = process.env['GOPATH'];
    } else {
        goPath = inPtr.gopath;
    }
    return goPath;
}
module.exports.getGoPathSubmitter=function(inPtr) {
    return getGoPath(inPtr);
}

function getMember(username, password, client, nid, userOrg, cpf) {
    var cpOrgs = cpf['organizations'];
    if ( 0 === getConnProfilePropCnt(cpf, 'certificateAuthorities') ) {
        logger.info('[getMember] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    var cpCAs = cpf['certificateAuthorities'];
    var orgCA = findOrgCA(cpf, userOrg);

    var caUrl = cpCAs[orgCA].url;
    logger.info('[getMember] getMember, name: org %s ca url: %s', userOrg, caUrl);

    logger.info('[getMember] getMember, name: '+username+', client.getUserContext('+username+', true)');

	return client.getUserContext(username, true)
	.then((user) => {
		return new Promise((resolve, reject) => {
			if (user && user.isEnrolled()) {
				logger.info('[getMember] Successfully loaded member from persistence');
				return resolve(user);
			}

			var member = new User(username);
			var cryptoSuite = client.getCryptoSuite();
                        if (!cryptoSuite) {
			    cryptoSuite = hfc.newCryptoSuite();
			    if (userOrg) {
				cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: module.exports.storePathForOrg(nid, cpOrgs[userOrg].name)}));
				client.setCryptoSuite(cryptoSuite);
			    }
			}
			member.setCryptoSuite(cryptoSuite);

			// need to enroll it with CA server
			var orgCA=cpOrgs[userOrg].certificateAuthorities[0];
			var cop = new copService(caUrl, tlsOptions, cpCAs[orgCA].caName, cryptoSuite);

			return cop.enroll({
				enrollmentID: username,
				enrollmentSecret: password
			}).then((enrollment) => {
				logger.info('[getMember] Successfully enrolled user \'' + username + '\'');

				return member.setEnrollment(enrollment.key, enrollment.certificate, cpOrgs[userOrg].mspid);
			}).then(() => {
                                var skipPersistence = false;
                                if (!client.getStateStore()) {
                                    skipPersistence = true;
                                }
				return client.setUserContext(member, skipPersistence);
			}).then(() => {
				return resolve(member);
			}).catch((err) => {
                logger.error('[getMember] Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
                process.exit(1);
			});
		});
        }).catch((err)=>{
            logger.error(err)
            process.exit(1);
        });
}

function getAdmin(client, nid, userOrg, cpf) {

        var cpOrgs = cpf['organizations'];
        var keyPath;
        var keyPEM;
        var certPath;
        var certPEM;

        if (typeof cpOrgs[userOrg].admin_cert !== 'undefined') {
            logger.info('[getAdmin] %s admin_cert defined', userOrg);
            keyPEM = cpOrgs[userOrg].priv;
            certPEM = cpOrgs[userOrg].admin_cert;
        } else if ((typeof cpOrgs[userOrg].adminPrivateKey !== 'undefined') &&
                   (typeof cpOrgs[userOrg].signedCert !== 'undefined')) {
            var goPath = getGoPath(cpf);
            logger.info('[getAdmin] %s adminPrivateKey and signedCert defined', userOrg);
            if ( typeof cpOrgs[userOrg].adminPrivateKey.path !== 'undefined') {
                keyPath = path.resolve(goPath, cpOrgs[userOrg].adminPrivateKey.path, 'keystore');
                keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
                logger.info('[getAdmin] keyPath: %s', keyPath);
            } else if (typeof cpOrgs[userOrg].adminPrivateKey.pem !== 'undefined') {
                keyPEM = cpOrgs[userOrg].adminPrivateKey.pem;
            } else {
                logger.error('[getAdmin] error: adminPrivateKey invalid');
                return null;
            }
            if ( typeof cpOrgs[userOrg].signedCert.path !== 'undefined') {
                certPath =  path.resolve(goPath, cpOrgs[userOrg].signedCert.path, 'signcerts');
                certPEM = Buffer.from(readAllFiles(certPath)[0]).toString();
                logger.info('[getAdmin] certPath: %s', certPath);
            } else if (typeof cpOrgs[userOrg].signedCert.pem !== 'undefined') {
                certPEM = cpOrgs[userOrg].signedCert.pem;
            } else {
                logger.error('[getAdmin] error: signedCert invalid');
                return null;
            }
        } else if (typeof cpOrgs[userOrg].adminPath !== 'undefined') {
            var goPath = getGoPath(cpf);
            logger.info('[getAdmin] %s adminPath defined', userOrg);
            keyPath =  path.resolve(goPath, cpOrgs[userOrg].adminPath, 'keystore');
            keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
            certPath = path.resolve(goPath, cpOrgs[userOrg].adminPath, 'signcerts');
            certPEM = readAllFiles(certPath)[0];
            logger.debug('[getAdmin] keyPath: %s', keyPath);
            logger.debug('[getAdmin] certPath: %s', certPath);
        }

        var cryptoSuite = hfc.newCryptoSuite();
        if (userOrg) {
            cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: module.exports.storePathForOrg(nid, cpOrgs[userOrg].name)}));
            client.setCryptoSuite(cryptoSuite);
        }

        return Promise.resolve(client.createUser({
            username: 'peer'+userOrg+'Admin',
            mspid: cpOrgs[userOrg].mspid,
            cryptoContent: {
                privateKeyPEM: keyPEM.toString(),
                signedCertPEM: certPEM.toString()
            }
        }));
}

function getOrdererAdmin(client, userOrg, cpf) {

        var cpOrgs = cpf['organizations'];
        if ( getConnProfilePropCnt(cpf, 'orderers') === 0 ) {
            logger.error('[getOrdererAdmin] org(%s): no orderer is found in the connection profile', userOrg);
            process.exit(1);
        }
        var cpOrderers = cpf['orderers'];

        var keyPath;
        var keyPEM;
        var certPath;
        var certPEM;
        var ordererID;

        // get ordererID
        if ( typeof cpOrgs[userOrg].ordererID !== 'undefined' ) {
            ordererID = cpOrgs[userOrg].ordererID;
        } else {
            ordererID = Object.getOwnPropertyNames(cpOrderers)[0];
        }
        logger.info('[getOrdererAdmin] orderer ID= %s', ordererID);

        if ((typeof cpOrderers.admin_cert !== 'undefined') &&
            (typeof cpOrderers.priv !== 'undefined')) {
            logger.info('[getOrdererAdmin] %s global orderer admin_cert and priv defined', userOrg);
            keyPEM = cpOrderers.priv;
            certPEM = cpOrderers.admin_cert;
        } else if ((typeof cpOrderers[ordererID].admin_cert !== 'undefined') &&
                   (typeof cpOrderers[ordererID].priv !== 'undefined')) {
            logger.info('[getOrdererAdmin] %s local orderer admin_cert and priv defined', userOrg);
            keyPEM = cpOrderers[ordererID].priv;
            certPEM = cpOrderers[ordererID].admin_cert;
        } else if ((typeof cpOrderers[ordererID].adminPrivateKey !== 'undefined') &&
                   (typeof cpOrderers[ordererID].signedCert !== 'undefined')) {
            var goPath = getGoPath(cpf);
            logger.info('[getOrdererAdmin] %s adminPrivateKey and signedCert defined', ordererID);
            if ( typeof cpOrderers[ordererID].adminPrivateKey.path !== 'undefined') {
                keyPath = path.resolve(goPath, cpOrderers[ordererID].adminPrivateKey.path, 'keystore');
                keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
                logger.info('[getOrdererAdmin] %s keyPath: %s', ordererID, keyPath);
            } else if (typeof cpOrderers[ordererID].adminPrivateKey.pem !== 'undefined') {
                keyPEM = cpOrderers[ordererID].adminPrivateKey.pem;
            } else {
                logger.error('[getOrdererAdmin] %s error: adminPrivateKey invalid', ordererID);
                return null;
            }
            if ( typeof cpOrderers[ordererID].signedCert.path !== 'undefined') {
                certPath =  path.resolve(goPath, cpOrderers[ordererID].signedCert.path, 'signcerts');
                certPEM = Buffer.from(readAllFiles(certPath)[0]).toString();
                logger.info('[getOrdererAdmin] %s certPath: %s', ordererID, certPath);
            } else if (typeof cpOrderers[ordererID].signedCert.pem !== 'undefined') {
                certPEM = cpOrderers[ordererID].signedCert.pem;
            } else {
                logger.error('[getOrdererAdmin] %s error: signedCert invalid', ordererID);
                return null;
            }
        } else if (typeof cpOrderers.adminPath !== 'undefined') {
            var goPath = getGoPath(cpf);
            logger.info('[getOrdererAdmin] %s global orderer adminPath defined', userOrg);
            keyPath = path.resolve(goPath, cpOrderers.adminPath, 'keystore');
            keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
            certPath = path.resolve(goPath, cpOrderers.adminPath, 'signcerts');
            certPEM = readAllFiles(certPath)[0];
            logger.debug('[getOrdererAdmin] keyPath: %s', keyPath);
            logger.debug('[getOrdererAdmin] certPath: %s', certPath);
        } else if (typeof cpOrderers[ordererID].adminPath !== 'undefined') {
            var goPath = getGoPath(cpf);
            logger.info('[getOrdererAdmin] %s local orderer adminPath defined', userOrg);
            keyPath = path.resolve(goPath, cpOrderers[ordererID].adminPath, 'keystore');
            keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
            certPath = path.resolve(goPath, cpOrderers[ordererID].adminPath, 'signcerts');
            certPEM = readAllFiles(certPath)[0];
            logger.debug('[getOrdererAdmin] keyPath: %s', keyPath);
            logger.debug('[getOrdererAdmin] certPath: %s', certPath);
        }

        return Promise.resolve(client.createUser({
            username: 'ordererAdmin',
            mspid: cpOrderers[ordererID].mspid,
            cryptoContent: {
                privateKeyPEM: keyPEM.toString(),
                signedCertPEM: certPEM.toString()
            }
        }));
}

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (!!err)
                reject(new Error('Failed to read file ' + path + ' due to error: ' + err));
            else
               	resolve(data);
        });
    });
}

function readAllFiles(dir) {
    var files = fs.readdirSync(dir);
    var certs = [];
    files.forEach((file_name) => {
        let file_path = path.resolve(dir,file_name);
        logger.debug('[readAllFiles] looking at file ::'+file_path);
        let data = fs.readFileSync(file_path);
        certs.push(data);
    });
    return certs;
}

module.exports.getOrderAdminSubmitter = function(client, userOrg, cpf) {
    return getOrdererAdmin(client, userOrg, cpf);
};

module.exports.getSubmitter = function(username, secret, client, peerOrgAdmin, nid, org, cpf) {
    if (arguments.length < 2) throw new Error('"client" and "test" are both required parameters');

    var peerAdmin, userOrg;
    if (typeof peerOrgAdmin === 'boolean') {
        peerAdmin = peerOrgAdmin;
    } else {
        peerAdmin = false;
    }

    // if the 3rd argument was skipped
    if (typeof peerOrgAdmin === 'string') {
        userOrg = peerOrgAdmin;
    } else {
        if (typeof org === 'string') {
            userOrg = org;
        } else {
            userOrg = 'org1';
        }
    }

    if (peerAdmin) {
        logger.info(' >>>> getting the org admin');
        return getAdmin(client, nid, userOrg, cpf);
    } else {
        return getMember(username, secret, client, nid, userOrg, cpf);
    }
};

// set up PTE logger
function PTELogger(opts) {
    var winstonLogger = new winston.Logger({
        transports: [
            new (winston.transports.Console)({ colorize: true })
        ]
    }),
        levels = ['debug', 'info', 'warn', 'error'],
        logger = Object.assign({}, winstonLogger);

    if (opts.level) {
        if (levels.includes(opts.level)) {
            // why, oh why, does logger.level = opts.level not work?
            winstonLogger.level = opts.level;
        }
    }

    levels.forEach(function (method) {
        var func = winstonLogger[method];

        logger[method] = (function (context, tag, f) {
            return function () {
                if (arguments.length > 0) {
                    var timenow=new Date().toISOString();
                    var prefix = '[' + timenow + ' ' + tag + ']: ';
                    arguments[0] = prefix + arguments[0];
                }

                f.apply(context, arguments);
            };
        }(winstonLogger, opts.prefix, func));
    });

    return logger;
}
module.exports.PTELogger = PTELogger;

function getTLSCert(key, subkey, cpf) {

    var data;
    logger.info('[getTLSCert] key: %s, subkey: %s', key, subkey);
    if ( getConnProfilePropCnt(cpf, 'peers') === 0 ) {
        logger.error('[getTLSCert] no peers is found in the connection profile');
        process.exit(1);
    }
    if ( getConnProfilePropCnt(cpf, 'orderers') === 0 ) {
        logger.error('[getTLSCert] no orderer is found in the connection profile');
        process.exit(1);
    }
    var cpOrgs = cpf['organizations'];
    var cpOrderers = cpf['orderers'];
    var cpPeers = cpf['peers'];
    var goPath = getGoPath(cpf);

    var cpPtr;
    if ( cpPeers.hasOwnProperty(subkey) ) {
        cpPtr = cpPeers;
    } else if ( cpOrderers.hasOwnProperty(subkey) ) {
        cpPtr = cpOrderers;
    } else {
        logger.info('[getTLSCert] key: not found');
        return;
    }
    logger.info('[getTLSCert] key found: %j', cpPtr[subkey]);

    if ( typeof(cpf.tls_cert) !== 'undefined' ) {
        data = cpf.tls_cert;
    } else {
        if ( typeof(cpPtr[subkey].tlsCACerts.pem) != 'undefined' ) {
            //tlscerts is a cert
            data = cpPtr[subkey].tlsCACerts['pem'];
        } else if ( typeof(cpPtr[subkey].tlsCACerts.path) != 'undefined' ) {
            //tlscerts is a path
            var caRootsPath = path.resolve(goPath, cpPtr[subkey].tlsCACerts['path']);
            if (fs.existsSync(caRootsPath)) {
                //caRootsPath is a cert path
                data = fs.readFileSync(caRootsPath);
            } else {
                logger.info('[getTLSCert] tls_cacerts does not exist: caRootsPath: %s, key: %s, subkey: %s', caRootsPath, key, subkey);
                return null;
            }
        } else {
            logger.info('[getTLSCert] tls_cacerts does not exist: key: %s, subkey: %s', key, subkey);
            return null;
        }
    }
    return data;
}
module.exports.getTLSCert = getTLSCert;

module.exports.tlsEnroll = async function(client, orgName, cpf) {
  try {
    var cpOrgs = cpf['organizations'];
    if ( getConnProfilePropCnt(cpf, 'certificateAuthorities') === 0 ) {
        logger.error('[tlsEnroll] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    var cpCAs = cpf['certificateAuthorities'];
    var orgCA=cpOrgs[orgName].certificateAuthorities[0];
    logger.info('[tlsEnroll] CA tls enroll: %s, cpf: %s', orgName, cpf);
    return new Promise(function (resolve, reject) {
        if (!cpOrgs[orgName]) {
            throw new Error('Invalid org name: ' + orgName);
        }
        var orgCA=cpOrgs[orgName].certificateAuthorities[0];
        let fabricCAEndpoint = cpCAs[orgCA].url;
        let tlsOptions = {
            trustedRoots: [],
            verify: false
        };
        let caService = new FabricCAServices(fabricCAEndpoint, tlsOptions, cpCAs[orgCA].caName);
        logger.info('[tlsEnroll] CA tls enroll ca name: %j', cpCAs[orgCA].caName);
        let req = {
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw',
            profile: 'tls'
        };
        caService.enroll(req).then(
            function(enrollment) {
                const key = enrollment.key.toBytes();
                const cert = enrollment.certificate;
                client.setTlsClientCertAndKey(cert, key);
                logger.info('[tlsEnroll] CA tls enroll succeeded');

                return resolve(enrollment);
            },
            function(err) {
                logger.info('[tlsEnroll] CA tls enroll failed: %j', err);
                return reject(err);
            }
        );
    });
    } catch (err) {
        logger.error(err)
        process.exit(1)
    }
}

var TLSDISABLED = 0;
var TLSSERVERAUTH = 1;
var TLSCLIENTAUTH = 2;
module.exports.TLSDISABLED = TLSDISABLED;
module.exports.TLSSERVERAUTH = TLSSERVERAUTH;
module.exports.TLSCLIENTAUTH = TLSCLIENTAUTH;

module.exports.setTLS=function(txCfgPtr) {
    var TLSin=txCfgPtr.TLS.toUpperCase();
    var TLS = TLSDISABLED;        // default
    if ( (TLSin == 'SERVERAUTH') || (TLSin == 'ENABLED') ) {
        TLS = TLSSERVERAUTH;
    } else if ( TLSin == 'CLIENTAUTH' ) {
        TLS = TLSCLIENTAUTH;
    }
    logger.info('[setTLS] TLSin: %s, TLS: %d', TLSin, TLS);

    return TLS;
}

// get ordererID for transactions
module.exports.getOrdererID=function(pid, orgName, org, txCfgPtr, cpf, method) {
    var cpOrgs = cpf['organizations'];
    if ( getConnProfilePropCnt(cpf, 'orderers') === 0 ) {
        logger.error('[getOrdererID] no orderer is found in the connection profile');
        process.exit(1);
    }
    var cpOrderers = cpf['orderers'];
    var ordererID;

    if ( Object.getOwnPropertyNames(cpOrderers).length === 0 ) {
        logger.error('[org:id=%s:%d getOrdererID] no orderer found', org, pid);
        process.exit(1);
    }
    logger.info('[org:id=%s:%d getOrdererID] orderer method: %s', org, pid, method);
    // find ordererID
    if ( method == 'ROUNDROBIN' ) {
        // Round Robin
        var nProcPerOrg = parseInt(txCfgPtr.nProcPerOrg);
        var orgNameLen=orgName.length;
        var orgIdx=orgName.indexOf(org);
        var SCordList=Object.keys(cpOrderers);
        logger.info('[org:id=%s:%d getOrdererID] SC orderer list: %j', org, pid, SCordList);
        var ordLen=SCordList.length;

        var nOrderers=0;
        if ( txCfgPtr.ordererOpt && txCfgPtr.ordererOpt.nOrderers ) {
            nOrderers= parseInt(txCfgPtr.ordererOpt.nOrderers);
        }
        if ( nOrderers == 0 ) {
            nOrderers = ordLen;
        } else if ( ordLen < nOrderers ) {
            nOrderers = ordLen;
        }
        logger.info('[org:id=%s:%d getOrdererID] orderer orgNameLen %d, ordLen %d, nOrderers %d', org, pid, orgNameLen, ordLen, nOrderers);

        var ordIdx=(pid*orgNameLen+orgIdx)%nOrderers;
        ordererID=SCordList[ordIdx];
    } else {
        // default method: USERDEFINED
        if ( typeof cpOrgs[org].ordererID !== 'undefined' ) {
            ordererID = cpOrgs[org].ordererID;
        } else {
            ordererID = Object.getOwnPropertyNames(cpOrderers)[0];
        }
    }

    logger.info('[org:id=%s:%d getOrdererID] orderer assigned to the test: %s', org, pid, ordererID);

    return ordererID;
}

// get peerID for transactions
module.exports.getPeerID=function(pid, org, txCfgPtr, cpf, method) {
    var cpOrgs = cpf['organizations'];
    if ( getConnProfilePropCnt(cpf, 'peers') === 0 ) {
        logger.error('[getPeerID] no peer is found in the connection profile');
        process.exit(1);
    }
    var cpPeers = cpf['peers'];
    var peerID="UNKNOWN";

    logger.info('[org:id=%s:%d getPeerID] peer method: %s', org, pid, method);
    if ( Object.getOwnPropertyNames(cpPeers).length === 0 ) {
        logger.error('[org:id=%s:%d getPeerID] no peer found', org, pid);
        process.exit(1);
    }
    // find peerID
    if ( method == 'ROUNDROBIN' ) {
        // Round Robin
        var nProcPerOrg = parseInt(txCfgPtr.nProcPerOrg);
        var SCordList=[];
        for (let i=0; i < cpOrgs[org]['peers'].length; i++) {
            var key = cpOrgs[org]['peers'][i];
            if (cpPeers[key].url) {
                SCordList.push(key);
            }
        }
        logger.info('[org:id=%s:%d getPeerID] SC peer list: %j', org, pid, SCordList);
        logger.info('[org:id=%s:%d getPeerID] SC peer length: %j', org, pid, SCordList.length);
        var peerLen=SCordList.length;
        var peerIdx=(pid)%peerLen;
        peerID=SCordList[peerIdx];
    }

    logger.info('[org:id=%s:%d getPeerID] peer assigned to the test: %s %s', org, pid, org, peerID);

    return peerID;
}
