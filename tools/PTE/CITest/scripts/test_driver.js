#!/usr/bin/env node

const shell = require('shelljs');
const fs = require('fs')
const fse = require('fs-extra')
let path = require('path')
let util=require('util')
let writeFile = util.promisify(fs.writeFile)
const argv = require('yargs').argv
async function installNodeModules(PrecfgDir) {
    try {
        let dir = path.join(__dirname, '../Logs', PrecfgDir)
        if (!fs.existsSync(dir)) {
            fse.mkdirpSync(dir);
        }
        let logPath = path.join(dir, 'installNodeModules.log')
        shell.exec('./test_setup.sh > ' + logPath + ' 2>&1')
        await timeout(2000)
        return "success"
    } catch (err) {
        return "error"
    }
}

async function createNetwork(PrecfgDir) {
    try {
        let result
        let testPath = path.join(__dirname, '../', PrecfgDir, "test_nl.sh")
        let dir = path.join(__dirname, '../Logs', PrecfgDir)
        if (!fs.existsSync(dir)) {
            fse.mkdirpSync(dir);
        }
        let logPath = path.join(dir, 'createNetwork.log')
        if (fs.existsSync(testPath)) {
            result = shell.exec(testPath + ' > ' + logPath + ' 2>&1')
        } else {
            result = shell.exec('./test_nl.sh > ' + logPath + ' 2>&1')
        }
        if (result.code !== 0) { throw Error }
        await timeout(15000)
        return "success"
    } catch (err) {
        return "error"
    }
}

async function createNJoinChannel(PrecfgDir,AnchorPeerUpdate) {
    try {
        let result
        let dir = path.join(__dirname, '../Logs', PrecfgDir)
        if (!fs.existsSync(dir)) {
            fse.mkdirpSync(dir);
        }
        let logPath = path.join(dir, 'createJoinChannel.log')
        result = shell.exec('./test_channel.sh ' + PrecfgDir + ' '+AnchorPeerUpdate+ ' > ' + logPath + ' 2>&1')
        if (result.code !== 0) { throw Error }
        await timeout(60000)
        return "success"
    } catch (err) {
        shell.exec('./test_down.sh')
        return "error"
    }
}

async function installNInstantiateCC(cc, PrecfgDir) {
    try {
        let result
        let dir = path.join(__dirname, '../Logs', PrecfgDir)
        if (!fs.existsSync(dir)) {
            fse.mkdirpSync(dir);
        }
        let logPath = path.join(dir, 'installInstantiateCC.log')
        let upgrade = PrecfgDir.split('/')
        if (upgrade === 'upgrade') {
            result = shell.exec('./test_chaincode.sh ' + cc + " " + PrecfgDir + " doupgrade" + ' > ' + logPath + ' 2>&1')
        } else {
            result = shell.exec('./test_chaincode.sh ' + cc + " " + PrecfgDir + ' > ' + logPath + ' 2>&1')
        }
        if (result.code !== 0) { throw Error }
        await timeout(15000)
        return "success"
    } catch (err) {
        shell.exec('./test_down.sh')
        return "error"
    }
}

async function ledgerSyncUp(PrecfgDir, TStart) {
    let result
    let dir = path.join(__dirname, '../Logs', PrecfgDir)
    if (!fs.existsSync(dir)) {
        fse.mkdirpSync(dir);
    }
    let logPath = path.join(dir, 'ledgerSyncUp.log')
    try {
        result = shell.exec('./test_pte.sh FAB-query-TLS ' + TStart + ' > ' + logPath + ' 2>&1')
        if (result.code !== 0) { throw Error }
        await timeout(10000)
        return "success"
    } catch (err) {
        shell.exec('./test_down.sh')
        return "error"
    }
}

async function executeTests(PrecfgDir, tests, TStart) {
    let result=""
    PrecfgDir=PrecfgDir?PrecfgDir:"FAB-test"
    let dir = path.join(__dirname, '../Logs', PrecfgDir)
    if (!fs.existsSync(dir)) {
        fse.mkdirpSync(dir);
    }
    let logPath = path.join(dir, 'executeTests.log')
    try {
        for (let i of tests) {
            result = shell.exec('./test_pte.sh ' + i + " " + TStart + ' > ' + logPath + ' 2>&1')
            if (result.code !== 0) { throw Error }
        }
        await timeout(10000)
        return "success"
    } catch (err) {
        shell.exec('./test_down.sh')
        return "error"
    }
}

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateConfig(key, value) {
    let rawdata = JSON.parse(fs.readFileSync('config.json'));
    rawdata[key] = value;
    let data = JSON.stringify(rawdata, null, 2);
    fs.writeFileSync('config.json', data);
}

function testDriverHelp() {
    console.log(`Usage: 
    node test_driver.js [opt] [values] && npm test
        -e: install sdk packages, default=no
        -n: create network, default=no
        -m: directory where test_nl.sh, preconfig, chaincode to be used to create network, default=scripts
        -p: preconfigure creation/join channels, default=no
        -s: synchup peer ledgers, recommended when network brought up, default=no
        -c: chaincode to be installed and instantiated [all|<chaincode>], default=no
        -u: chaincode to be installed and upgraded [all|<chaincode>], default=no
        -t [value1 value2 value3 ...]: test cases to be executed
        -b [value]: test cases starting time
        -a update anchor peer, default=no
      
    available test cases:
        FAB-query-TLS: 4 processes X 1000 queries, TLS
        FAB-3983-i-TLS: FAB-3983, longrun: 4 processes X 60 hours invokes, constant mode, 1k payload, TLS
        FAB-4162-i-TLS: FAB-4162, longrun: 4 processes X 60 hours mix mode, vary 1k-2k payload, TLS
        FAB-4229-i-TLS: FAB-4229, longrun: 8 processes X 36 hours mix mode, vary 1k-2k payload, TLS
        FAB-3989-4i-TLS: FAB-3989, stress: 4 processes X 1000 invokes, constant mode, 1k payload, TLS
        FAB-3989-4q-TLS: FAB-3989, stress: 4 processes X 1000 queries, constant mode, 1k payload, TLS
        FAB-3989-8i-TLS: FAB-3989, stress: 8 processes X 1000 invokes, constant mode, 1k payload, TLS
        FAB-3989-8q-TLS: FAB-3989, stress: 8 processes X 1000 queries, constant mode, 1k payload, TLS
        marbles-i-TLS: marbles chaincode: 4 processes X 1000 invokes, constant mode, TLS
        marbles-q-TLS: marbles chaincode: 4 processes X 1000 queries, constant mode, TLS
        robust-i-TLS: robustness: 4 processes X invokes, constant mode, 1k payload, TLS
        FAB-3833-2i: 2 processes X 10000 invokes, TLS, couchDB
        FAB-3810-2q: 2 processes X 10000 queries, TLS, couchDB
        FAB-3832-4i: 4 processes X 10000 invokes, TLS, couchDB
        FAB-3834-4q: 4 processes X 10000 queries, TLS, couchDB
        FAB-3808-2i: 2 processes X 10000 invokes, TLS
        FAB-3811-2q: 2 processes X 10000 queries, TLS
        FAB-3807-4i: 4 processes X 10000 invokes, TLS
        FAB-3834-4q: 4 processes X 10000 queries, TLS
      
    example: 
     node test_driver.js -n -m FAB-3808-2i -p -c samplecc -t FAB-3808-2i && npm test # create a network, create/join channels, install/instantiate samplecc chaincode using setting in FAB-3808-2i, and execute test case FAB-3808-2i
     node test_driver.js -n -p -c all -t FAB-3989-4i-TLS,FAB-3989-4q-TLS && npm test # create a network, create/join channel and install/instantiate all chaincodes using default setting and execute two test cases
     node test_driver.js -n -p -c samplecc && npm test # create a network, create/join channels, install/instantiate chaincode samplecc using default setting
     node test_driver.js -t FAB-3811-2q,FAB-3808-2i && npm test # execute test cases (FAB-3811-2q and FAB-3808-2i)
     node test_driver.js -m FAB-8252/upgrade -u marbles02 && npm test # upgrade chaincode marbles02 using setting in FAB-8252/upgrade directory`
    )
}

async function test(args) {
    try{
    if(!args.bail){
    shell.exec('rm -rf tap_output')
    let arguments = ["e","n","m","p","s","c","u",'t','b',"a"]
    let keys = Object.keys(args).slice(1,Object.keys(args).length-1)
    if (args.h || args.help || Object.keys(args).length === 2) {
        testDriverHelp()
    } else if(keys.every(val => arguments.includes(val))){
        await writeFile('config.json','{}')
        for (let i = 0; i < keys.length; i++) {
            switch (keys[i]) {
                case "n":
                    args.n = "create"
                    break
                case "e":
                    args.e = "setup"
                    break
                case "p":
                    args.p = "create"
                    break
                case "s":
                    args.s = "synchup"
                    break
                case "t":
                    args.t = args[keys[i]].split(',')
                    break;
                case "a":
                    args.a = true
                    break;
            }
            await updateConfig(keys[i], args[keys[i]]);
        }
     }
    }
   }catch(err){
       console.log("Error :",err)
   }
}

test(argv)


module.exports = {
    installNodeModules: installNodeModules,
    createNetwork: createNetwork,
    createNJoinChannel: createNJoinChannel,
    installNInstantiateCC: installNInstantiateCC,
    ledgerSyncUp: ledgerSyncUp,
    executeTests: executeTests
}