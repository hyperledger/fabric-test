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

let fs = require('fs');
let path = require('path');
let yaml = require('js-yaml');
let winston = require('winston');

let loggerMsg = `PTE util`;
let logger = new PTELogger({ "prefix": loggerMsg, "level": "info" });


/**
 * utility function to check if a directory or file exists
 * uses entire / absolute path from root
 *
 * @param {string} absolutePath The path to be verify
 * @returns {bool}
 **/
function existsSync(absolutePath) {
    try {
        let stat = fs.statSync(absolutePath);
        if (stat.isDirectory() || stat.isFile()) {
            return true;
        } else
            return false;
    }
    catch (err) {
        return false;
    }
}

/**
 * utility function to verify if an object is empty
 *
 * @param {string} obj The object to be verify
 * @returns {promise<void>}
 **/
function isEmpty(obj) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

/**
 * get the transaction configuration Object from the user input file
 *
 * @param {string} uiFile The user input file of the transaction configuration
 * @returns {object} The transaction configuration object
 **/
function getTxnCfgObj(uiFile) {
    let txnCfgObj;
    let txCfgTmp;
    let uiContent;
    if (uiFile.endsWith(".json") || uiFile.endsWith(".yaml") || uiFile.endsWith(".yml")) {
        uiContent = readConfigFile(uiFile);
        logger.debug('[getTxnCfgObj] input uiContent[%s]: %j', uiFile, uiContent);

        if (typeof (uiContent.txnCfgObj) === 'undefined') {
            txCfgTmp = uiFile;
        } else {
            txCfgTmp = uiContent.txnCfgObj;
        }
        txnCfgObj = readConfigFile(txCfgTmp);
    }
    else {
        txnCfgObj = JSON.parse(uiFile);
    }

    return txnCfgObj;
}

/**
 * get the total number of peers in orgs listed in orgList
 *
 * @param {string} cpList The connection profile list
 * @param {string} orgList The org list to be counted
 * @returns {number} The total number of peers
 **/
function getTotalPeersNum(cpList, orgList) {
    let totalPeers = 0;
    for (let i = 0; i< orgList.length; i++ ) {
        let org = orgList[i]
        let cpf = findOrgConnProfile(cpList, org);
        if ( cpf === null ) {
            logger.info('[getTargetPeerList] cannot find org(%s) in any connection profile)', org);
            continue;
        }
        totalPeers = totalPeers + cpf['organizations'][org]['peers'].length;
    }
    logger.info('[getTotalPeersNum] find peer number: %d ', totalPeers);
    return totalPeers;
}

/**
 * get connection profiles from a directory
 *
 * @param {string} cpPath The path of the directory of connection profiles
 * @returns {array} The connection profile list
 **/
function getConnProfileList(cpPath) {

    if (!fs.existsSync(cpPath)) {
        let currentDirectory = __dirname
        let homeDirectory = currentDirectory.split("/github.com")[0]
        cpPath = path.join(homeDirectory, cpPath)
    }

    let cpList = [];
    if ((/(yml|yaml|json)$/i).test(cpPath)) {
        cpList.push(cpPath)
    } else {
        fs.readdirSync(cpPath).forEach(file => {
            logger.debug('[getConnProfileList] file', file);
            let file_ext = path.extname(file);
            if ((/(yml|yaml|json)$/i).test(file_ext)) {
                let cpf = path.join(cpPath, file);
                cpList.push(cpf);
            }
        });
    }
    logger.debug('[getConnProfileList] file:', cpList);

    return cpList;
}

/**
 * get the count of a property (such as peer or orderer or org etc) in a connection profile
 *
 * @param {string} cpf The connection profile
 * @param {string} prop The property to be counted
 * @returns {number} The number of the property in the connection profile
 **/
function getConnProfilePropCnt(cpf, prop) {

    if (cpf === null) {
        logger.error('[getConnProfilePropCnt] the connection profile is invalid: null');
        return 0;
    }

    if (!cpf.hasOwnProperty(prop)) {
        logger.error('[getConnProfilePropCnt] prop (%s) is not found in connection profile', prop);
        return 0;
    }

    if (true === isEmpty(cpf[prop])) {
        logger.error('[getConnProfilePropCnt] prop (%s) is empty in connection profile', prop);
        return 0;
    }

    let cnt = Object.getOwnPropertyNames(cpf[prop]).length;
    logger.debug('[getConnProfilePropCnt] prop (%s) cnt: %d', prop, cnt);

    return cnt;

}

/**
 * find the Connection Profile that contains an org
 *
 * @param {string} fileList The connection profile list
 * @param {string} orgName The org to be found
 * @returns {string} The connection profile that contains the org, return null if not found
 **/
function findOrgConnProfile(fileList, orgName) {
    logger.debug('[findOrgConnProfile] orgName(%s), input File list: ', orgName, fileList);
    for (i = 0; i < fileList.length; i++) {
        let cpf = fileList[i];
        let temp = readConfigFile(cpf, 'test-network');
        if (temp['organizations'] && temp['organizations'][orgName]) {
            logger.debug('[findOrgConnProfile] orgName(%s) found File: ', orgName, cpf);
            // sanity check if the connection profile contains any orderer and peer
            if ( 0 === getConnProfilePropCnt(temp, 'orderers') ) {
                logger.info('[findOrgConnProfile] no orderer found in the connection profile(%s) that contains orgName(%s): ', temp, orgName);
            }
            if ( 0 === getConnProfilePropCnt(temp, 'peers') ) {
                logger.error('[findOrgConnProfile] no peer found in the connection profile(%s) that contains orgName(%s): ', temp, orgName);
                return null;
            }
            return temp;
        }
    }

    return null;
}

/**
 * find all org from Connection Profiles
 *
 * @param {array} fileList The connection profile list
 * @returns {array} The List contains all org in the given connection profiles
 **/
function findAllOrgFromConnProfile(fileList) {
    let orgList = [];
    for (i = 0; i < fileList.length; i++) {
        let cpf = fileList[i];
        let temp = readConfigFile(cpf, 'test-network');
        if (temp['organizations']) {
            for (let org in temp['organizations']) {
                if ( !(orgList.indexOf(org) > -1) ) {
                     orgList.push(org);
                }
            }
        }
    }
    logger.debug('[findAllOrgFromConnProfile] org list:', orgList);

    return orgList;
}

/**
 * find target peers according to the targetPeerType
 *
 * @param {array} cpList The connection profile list
 * @param {array} orgList The org list
 * @param {string} targetPeerType The target peer type: ANCHORPEER or ALLPEERS or LIST
 * @returns {array} The List of target peers
 **/
function getTargetPeerList(cpList, orgList, targetPeerType) {
    logger.info('[getTargetPeerList] targetPeerType: %s', targetPeerType);
    let targetPeers = [];
    if ( targetPeerType  === 'ANCHORPEER' || targetPeerType  === 'ALLPEERS' ) {
        for (let i = 0; i< orgList.length; i++ ) {
            let org = orgList[i]
            let cpf = findOrgConnProfile(cpList, org);
            if ( cpf === null ) {
                logger.info('[getTargetPeerList] cannot find org(%s) in any connection profile)', org);
                continue;
            }
            let cpOrg = cpf['organizations'];
            for ( let j=0; j<cpOrg[org]['peers'].length; j++ ) {
                let peer = cpOrg[org]['peers'][j];
                targetPeers.push(peer);
                if ( targetPeerType  === 'ANCHORPEER' ) {
                    break;
                }
            }
        }
    } else if ( targetPeerType  === 'LIST' ) {
        for (let i = 0; i< Object.keys(orgList).length; i++ ) {
            let org = Object.keys(orgList)[i];
            let cpf = findOrgConnProfile(cpList, org);
            if ( cpf === null ) {
                logger.info('[getTargetPeerList] cannot find org(%s) in any connection profile)', org);
                continue;
            }
            for ( let j=0; j<orgList[org].length; j++ ) {
                let peer = orgList[org][j];
                targetPeers.push(peer);
            }
        }
    } else {
        logger.error('[getTargetPeerList] invalid targetPeerType: %s ', targetPeerType);
        return null;
    }
    logger.info('[getTargetPeerList] find peers: %j ', targetPeers);

    return targetPeers;
}

/**
 * get target peers
 *
 * @param {string} tgtPeerType The target peer type: ANCHORPEER or ALLPEERS or LIST
 * @param {array} cpList The connection profile list
 * @param {array} orgOrList The org list or user provided list
 * @returns {array} The List of target peers
 **/
function getTargetPeers(tgtPeerType, cpList, orgOrList) {
    let tgtPeers = [];
    if (tgtPeerType == 'ORGANCHOR') {
        tgtPeers = getTargetPeerList(cpList, orgOrList, 'ANCHORPEER')
        if ( tgtPeers ) {
            logger.info('[getTargetPeers] tgtPeers: %j', tgtPeers)
        }
    } else if (tgtPeerType == 'ALLANCHORS') {
        let orgList = [];
        orgList = findAllOrgFromConnProfile(cpList);
        tgtPeers = getTargetPeerList(cpList, orgList, 'ANCHORPEER')
        if ( tgtPeers ) {
            logger.info('[getTargetPeers] tgtPeers: %j', tgtPeers)
        }
    } else if (tgtPeerType == 'ORGPEERS') {
        tgtPeers = getTargetPeerList(cpList, orgOrList, 'ALLPEERS')
        if ( tgtPeers ) {
            logger.info('[getTargetPeers] tgtPeers: %j', tgtPeers)
        }
    } else if (tgtPeerType == 'ALLPEERS') {
        let orgList = [];
        orgList = findAllOrgFromConnProfile(cpList);
        tgtPeers = getTargetPeerList(cpList, orgList, 'ALLPEERS')
        if ( tgtPeers ) {
            logger.info('[getTargetPeers] tgtPeers: %j', tgtPeers)
        }
    } else if (tgtPeerType == 'LIST') {
        tgtPeers = getTargetPeerList(cpList, orgOrList, 'LIST')
        if ( tgtPeers ) {
            logger.info('[getTargetPeers] tgtPeers: %j', tgtPeers)
        }
    }

    return tgtPeers;
}

/**
 * set the object points to the key in the input file
 * if key is missing or invalid, set the object to the input file
 *
 * @param {string} inFile The input file
 * @param {string} key The key in the input file
 * @returns {object} The object of the key
 **/
function readConfigFile(inFile, key) {
    let temp;
    let file_ext = path.extname(inFile);
    logger.debug('[readConfigFile] input File: ', inFile);
    if ((/(yml|yaml)$/i).test(file_ext)) {
        temp = yaml.safeLoad(fs.readFileSync(inFile, 'utf8'));
    } else {
        temp = JSON.parse(fs.readFileSync(inFile));
    }

    if (temp[key]) {
        logger.debug('[readConfigFile] set pointer to %s[%s] ', inFile, key);
        return temp[key];
    } else {
        logger.debug('[readConfigFile] set pointer to %s', inFile);
        return temp;
    }

}

/**
 * find the CA of an org in a connection profile
 *
 * @param {string} cpf The connection profile
 * @param {string} org The org
 * @returns {string} The CA
 **/
function findOrgCA(cpf, org) {
    let cpOrgs = cpf['organizations'];
    if (0 === getConnProfilePropCnt(cpf, 'certificateAuthorities')) {
        logger.error('[findOrgCA] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    let cpCAs = cpf['certificateAuthorities'];
    let orgCA;
    if (cpOrgs[org].hasOwnProperty('certificateAuthorities')) {
        orgCA = cpOrgs[org].certificateAuthorities[0];
    } else {
        orgCA = Object.getOwnPropertyNames(cpCAs)[0];
    }

    return orgCA;
}

/**
 * get enroll ID of an org in a connection profile
 *
 * @param {string} cpf The connection profile
 * @param {string} org The org
 * @returns {string} The enroll ID
 **/
function getOrgEnrollId(cpf, org) {
    if (0 === getConnProfilePropCnt(cpf, 'certificateAuthorities')) {
        logger.error('[getOrgEnrollId] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    let cpCAs = cpf['certificateAuthorities'];
    let orgCA = findOrgCA(cpf, org);

    if (cpCAs[orgCA].hasOwnProperty('registrar') && cpCAs[orgCA].registrar.hasOwnProperty('enrollId')) {
        return cpCAs[orgCA].registrar.enrollId;
    } else {
        return 'admin';
    }

}

/**
 * get enroll secret of an org in a connection profile
 *
 * @param {string} cpf The connection profile
 * @param {string} org The org
 * @returns {string} The enroll secret
 **/
function getOrgEnrollSecret(cpf, org) {
    if (0 === getConnProfilePropCnt(cpf, 'certificateAuthorities')) {
        logger.error('[getOrgEnrollSecret] no certificateAuthority is found in the connection profile');
        process.exit(1);
    }
    let cpCAs = cpf['certificateAuthorities'];
    let orgCA = findOrgCA(cpf, org);

    if (cpCAs[orgCA].hasOwnProperty('registrar') && cpCAs[orgCA].registrar.hasOwnProperty('enrollSecret')) {
        return cpCAs[orgCA].registrar.enrollSecret;
    } else {
        return 'adminpw';
    }
}

/**
 * get timeoutOpt from user input transaction configuration object
 *
 * @param {string} txnCfgObj The object of transaction configuration
 * @returns {object} The object that contains timeoutOpt: reqTimeout, grpcTimeout
 **/
function getTimeoutOpt(txnCfgObj) {
    let reqTimeout = 45000;        // default 45 sec
    let grpcTimeout = 3000;        // default 3 sec
    if ((typeof (txnCfgObj.timeoutOpt) !== 'undefined')) {
        timeoutOpt = txnCfgObj.timeoutOpt;
        if ((typeof (timeoutOpt.request) !== 'undefined')) {
            reqTimeout = parseInt(timeoutOpt.request);
        }
        if ((typeof (timeoutOpt.grpcTimeout) !== 'undefined')) {
            grpcTimeout = parseInt(timeoutOpt.grpcTimeout);
        }
    }
    logger.info('[getTimeoutOpt] reqTimeout: %d, grpcTimeout: %d', reqTimeout, grpcTimeout);

    return {reqTimeout, grpcTimeout};

}

/**
 * fetch the value follows the given pattern in a string
 *
 * @param {string} pattern The pattern of interest
 * @param {string} str The string to be searched for the pattern
 * @returns {string} The value followed the pattern
 **/
function getValFromString(pattern, str) {

    if (!str.includes(pattern)) {
        logger.info('[getValFromString] %s is not found in string (%s)', pattern, str);
        return null;
    }

    let strTmp = str.split(pattern);
    let val = strTmp[1].trim().split(' ')[0];

    return val;
}

/**
 * set up PTE logger
 *
 * @param {string} opts The log options
 * @returns {string} The logger
 **/
function PTELogger(opts) {
    let winstonLogger = new winston.Logger({
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
        let func = winstonLogger[method];

        logger[method] = (function (context, tag, f) {
            return function () {
                if (arguments.length > 0) {
                    let timenow = new Date().toISOString();
                    let prefix = `[${timenow} ${tag}] `;
                    arguments[0] = `${prefix}${arguments[0]}`;
                }

                f.apply(context, arguments);
            };
        }(winstonLogger, opts.prefix, func));
    });

    return logger;
}

module.exports.existsSync = existsSync;
module.exports.isEmpty = isEmpty;
module.exports.getTxnCfgObj = getTxnCfgObj;
module.exports.getTotalPeersNum = getTotalPeersNum;
module.exports.getConnProfileList = getConnProfileList;
module.exports.findOrgConnProfile = findOrgConnProfile;
module.exports.findAllOrgFromConnProfile = findAllOrgFromConnProfile;
module.exports.getTargetPeers = getTargetPeers;
module.exports.getOrgEnrollId = getOrgEnrollId;
module.exports.getOrgEnrollSecret = getOrgEnrollSecret;
module.exports.getTimeoutOpt = getTimeoutOpt;
module.exports.getValFromString = getValFromString;
module.exports.PTELogger = PTELogger;
