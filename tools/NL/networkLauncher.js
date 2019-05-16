const exec = require('child_process').execSync;
const fs = require('fs');
const path = require('path');
const writeYaml = require('write-yaml');
const winston = require('winston');
const yaml = require('js-yaml')
/*const logger = new (winston.Logger)({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            prettyPrint: true,
            colorize: true
        })
    ],
    exitOnError: false
});*/
let argv = require('yargs')
    .options({
        mode: {
            demand: false,
            description: 'Mode to be used and supported options are up, down, restart, addorg, addpeer',
            alias: 'm',
            default: 'up',
            type: 'string'
        },
        input: {
            demand: true,
            description: 'Network spec input file path',
            alias: 'i',
            type: 'string'
        },
        kubeconfig: {
            demand: false,
            description: 'Kube config file path',
            alias: 'k',
            type: 'string'
        }
    })
    .help()
    .argv;

let networkSpec = yaml.safeLoad(fs.readFileSync(argv.input, 'utf8'));
async function networkLauncher(argv){
    try {
        if (argv.mode == "up") {
            await genCrypto(networkSpec);
            await genConfigtx(networkSpec);
            await genNetwork(networkSpec);
            await genConnProfile(networkSpec);
        } else if(argv.mode == "down"){
            //TODO
        } else if(argv.mode == "restart"){
            //TODO
        } else if(argv.mode == "addpeer"){
            //TODO
        }
    } catch(err) {
        //TODO
    }
}

async function genCrypto(networkSpec){
    try{
        let cryptoConfig = {}
        let ordSpecs = []
        let peerSpecs = []
        let OrdererOrgs = []
        let PeerOrgs = []

        for(var i=0; i<networkSpec.orderer_organizations.length; i++){
            ordSpecs = []
            for(var j=0; j<networkSpec.orderer_organizations[i].num_orderers; j++){
                ordSpecs.push({
                    "Hostname": "orderer"+j+"-"+networkSpec.orderer_organizations[i].name
                })
            }
            OrdererOrgs.push({
                "Name": networkSpec.orderer_organizations[i].name,
                "Domain": networkSpec.orderer_organizations[i].name,
                "EnableNodeOUs": true,
                "Specs": ordSpecs
            })
        }

        for(var k=0; k<networkSpec.peer_organizations.length; k++){
            peerSpecs = []
            for(var l=0; l<networkSpec.peer_organizations[k].num_peers; l++){
                peerSpecs.push({
                    "Hostname": "peer"+l+"-"+networkSpec.peer_organizations[k].name
                })
            }
            PeerOrgs.push({
                "Name": networkSpec.peer_organizations[k].name,
                "Domain": networkSpec.peer_organizations[k].name,
                "EnableNodeOUs": true,
                "Specs": peerSpecs
            })
        }

        cryptoConfig = {
            "OrdererOrgs": OrdererOrgs,
            "PeerOrgs": PeerOrgs
        }

        writeYaml.sync(path.join(__dirname, './crypto-config.yaml'), cryptoConfig);
        await exec('cryptogen generate --config=./crypto-config.yaml --output='+networkSpec.certs_location+'/crypto-config')
    } catch(err) {
        //TODO
    }
}

async function genConfigtx(networkSpec){
    try{
        //TODO
    } catch(err) {
        //TODO
    }
}

async function genNetwork(networkSpec){
    try{
        //TODO
    } catch(err) {
        //TODO
    }
}

async function genConnProf(networkSpec){
    try{
        //TODO
    } catch(err) {
        //TODO
    }
}

networkLauncher(argv);