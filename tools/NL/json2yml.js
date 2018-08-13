/*
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/


var fs = require('fs');

var cfgFile = process.argv[2];
//var cfgFile = __dirname + "/" + "network-cfg.json";
var dFile = __dirname + "/" + "docker-compose.yml";
fs.createWriteStream(dFile);

if ( process.env.GOPATH != null ) {
    console.log(' GOPATH= ', process.env.GOPATH);
    GOPATHDir=process.env.GOPATH;
}

var srcMSPDir='/opt/hyperledger/fabric/msp/crypto-config';
var MSPDir=GOPATHDir+'/src/github.com/hyperledger/fabric-test/fabric/common/tools/cryptogen/crypto-config';
var CADir='/etc/hyperledger/fabric-ca-server-config';
var CA=0;
var CDB=0;
var KAFKA=0;

var comName;
if ( process.env.comName != null ) {
    comName=process.env.comName;
} else {
    comName = 'example.com';
}
console.log(' comName= ', comName);

var ordererName;
// TLS
var TLS = 'disabled';
var TLSEnabled;
if ( process.env.TLSEnabled != null ) {
    TLSEnabled=process.env.TLSEnabled;
    if ( TLSEnabled.toUpperCase() == 'ENABLED' ) {
        TLS = 'enabled';
        console.log(' TLSEnabled= ', process.env.TLSEnabled);
    }
}
console.log('TLS: %s, TLSEnabled: %s', TLS, TLSEnabled);
// Mutual TLS
var MutualTLS = 'disabled';
var MutualTLSEnabled;
if ( process.env.MutualTLSEnabled != null ) {
    MutualTLSEnabled=process.env.MutualTLSEnabled;
    if ( MutualTLSEnabled.toUpperCase() == 'ENABLED' ) {
        MutualTLS = 'enabled';
        console.log(' MutualTLSEnabled= ', process.env.MutualTLSEnabled);
    }
}
console.log('MutualTLS: %s, MutualTLSEnabled: %s', MutualTLS, MutualTLSEnabled);

// Orderer environment var
var ord_env_name=[];
var ord_env_val=[];
if ( process.env.MSPDIR != null ) {
    console.log(' MSPDIR= ', process.env.MSPDIR);
    MSPDir=process.env.MSPDIR;
}
console.log('MSPDir: ', MSPDir);

if ( process.env.SRCMSPDIR != null ) {
    console.log(' SRCMSPDIR= ', process.env.SRCMSPDIR);
    srcMSPDir=process.env.SRCMSPDIR;
}
console.log('srcMSPDir: ', srcMSPDir);
var ordererMSPDir=srcMSPDir+'/ordererOrganizations';
var peerMSPDir=srcMSPDir+'/peerOrganizations';

if ( process.env.CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT != null ) {
    console.log(' CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT= ', process.env.CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT);
    ord_env_name.push('CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT');
    ord_env_val.push(process.env.CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT);
}
if ( process.env.CONFIGTX_ORDERER_ORDERERTYPE != null ) {
    console.log(' CONFIGTX_ORDERER_ORDERERTYPE= ', process.env.CONFIGTX_ORDERER_ORDERERTYPE);
    ord_env_name.push('CONFIGTX_ORDERER_ORDERERTYPE');
    ord_env_val.push(process.env.CONFIGTX_ORDERER_ORDERERTYPE);
    if ( process.env.CONFIGTX_ORDERER_ORDERERTYPE == 'kafka' ) {
       KAFKA=1;
    }
}
if ( process.env.CONFIGTX_ORDERER_BATCHTIMEOUT != null ) {
    console.log(' CONFIGTX_ORDERER_BATCHTIMEOUT= ', process.env.CONFIGTX_ORDERER_BATCHTIMEOUT);
    ord_env_name.push('CONFIGTX_ORDERER_BATCHTIMEOUT');
    ord_env_val.push(process.env.CONFIGTX_ORDERER_BATCHTIMEOUT);
}
if ( process.env.ORDERER_GENERAL_LOGLEVEL != null ) {
    console.log(' ORDERER_GENERAL_LOGLEVEL= ', process.env.ORDERER_GENERAL_LOGLEVEL);
    ord_env_name.push('ORDERER_GENERAL_LOGLEVEL');
    ord_env_val.push(process.env.ORDERER_GENERAL_LOGLEVEL);
}
console.log('ord_env_name: ', ord_env_name.length, ord_env_name);
console.log('ord_env_val: ', ord_env_val.length, ord_env_val);

if ( process.env.HOSTCONFIG_NETWORKMODE != null ) {
    console.log(' HOSTCONFIG_NETWORKMODE= ', process.env.HOSTCONFIG_NETWORKMODE);
    HOSTCONFIG_NETWORKMODE=process.env.HOSTCONFIG_NETWORKMODE;
}
console.log('HOSTCONFIG_NETWORKMODE: ', HOSTCONFIG_NETWORKMODE);


// Peer environment var
var peer_env_name=[];
var peer_env_val=[];
if ( process.env.CORE_LOGGING_LEVEL != null ) {
    console.log(' CORE_LOGGING_LEVEL= ', process.env.CORE_LOGGING_LEVEL);
    peer_env_name.push('CORE_LOGGING_LEVEL');
    peer_env_val.push(process.env.CORE_LOGGING_LEVEL);
}
if ( process.env.CORE_PEER_BCCSP_SW_SECURITY != null ) {
    console.log(' CORE_PEER_BCCSP_SW_SECURITY= ', process.env.CORE_PEER_BCCSP_SW_SECURITY);
    peer_env_name.push('CORE_PEER_BCCSP_SW_SECURITY');
    peer_env_val.push(process.env.CORE_PEER_BCCSP_SW_SECURITY);
}
if ( process.env.CORE_PEER_BCCSP_SW_HASH != null ) {
    console.log(' CORE_PEER_BCCSP_SW_HASH= ', process.env.CORE_PEER_BCCSP_SW_HASH);
    peer_env_name.push('CORE_PEER_BCCSP_SW_HASH');
    peer_env_val.push(process.env.CORE_PEER_BCCSP_SW_HASH);
}

console.log('peer_env_name: ', peer_env_name.length, peer_env_name);
console.log('peer_env_val: ', peer_env_val.length, peer_env_val);

//process.exit();
console.log('network cfg: ', cfgFile);
console.log('docker composer: ', dFile);

var nPeerPerOrg = parseInt(process.argv[3]);;
console.log('nPeerPerOrg: ', nPeerPerOrg);


var addOrderer = parseInt(process.argv[4]);;
console.log('number of Orderer: ', addOrderer);

var addBroker = parseInt(process.argv[5]);
console.log('number of Kafka Broker: ', addBroker);

var addReplica = parseInt(process.argv[10]);
console.log('number of Kafka Replication: ', addReplica);

var nZoo = parseInt(process.argv[6]);;
console.log('number of zookeepers: ', nZoo);

var nOrg = parseInt(process.argv[7]);;
console.log('number of orgs: ', nOrg);

var addVP = nPeerPerOrg*nOrg;
console.log('number of peer: ', addVP);

//console.log(' input argv length', process.argv.length);
var dbType = 'none';
if (process.argv.length > 8) {
   dbType = process.argv[8];
}
console.log('DB type: ', dbType);

var addCA = 0;
if (process.argv.length > 9) {
   addCA = parseInt(process.argv[9]);
}
console.log('addCA: ', addCA);

var cfgContent = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));

var top_key = Object.keys(cfgContent);

var lvl1_obj;
var lvl2_key;
var lvl2_obj;
var lvl3_key;
var tmp_name;
var tmp_port;
var caAddr;
var caPort;
var ordererAddr;
var ordererPort;
var couchdbAddr;
var couchdbPort;
var vp0Addr;
var vp0Port;
var evtAddr;
var evtPort;
var kafkaAddr;
var kafkaPort;
var tmp;
var e;

if ( addBroker > 0 ) {
   KAFKA=1;
}

if ( (dbType == 'couchdb') || (dbType == 'goleveldb') ){
   CDB=1;
}

//header 0
for ( i0=0; i0<top_key.length; i0++ ) {
    var lvl0_obj = cfgContent[top_key[i0]];
    var lvl1_key = Object.keys(lvl0_obj);
    if ( top_key[i0] == 'caAddress' ) {
         caAddr = lvl0_obj;
         console.log('ca address:', caAddr);
    } else if ( top_key[i0] == 'caPort' ) {
         caPort = parseInt(lvl0_obj);
         console.log('ca Port:', caPort);
    } else if ( top_key[i0] == 'ordererAddress' ) {
         ordererAddr = lvl0_obj;
         console.log('orderer address:', ordererAddr);
    } else if ( top_key[i0] == 'ordererPort' ) {
         ordererPort = parseInt(lvl0_obj);
         console.log('orderer Port:', ordererPort);
    } else if ( top_key[i0] == 'couchdbAddress' ) {
         couchdbAddr = lvl0_obj;
         console.log('couchdb address:', couchdbAddr);
    } else if ( top_key[i0] == 'couchdbPort' ) {
         couchdbPort = parseInt(lvl0_obj);
         console.log('couchdb Port:', couchdbPort);
    } else if ( top_key[i0] == 'vp0Address' ) {
         vp0Addr = lvl0_obj;
         console.log('peer0 address:', vp0Addr);
    } else if ( top_key[i0] == 'vp0Port' ) {
         vp0Port = parseInt(lvl0_obj);
         console.log('peer0 Port:', vp0Port);
    } else if ( top_key[i0] == 'kafkaAddress' ) {
         kafkaAddr = lvl0_obj;
         console.log('kafka address:', kafkaAddr);
    } else if ( top_key[i0] == 'kafkaPort' ) {
         kafkaPort = parseInt(lvl0_obj);
         console.log('kafka Port:', kafkaPort);
    } else if ( top_key[i0] == 'evtAddress' ) {
         evtAddr = lvl0_obj;
         console.log('event Hub address:', evtAddr);
    } else if ( top_key[i0] == 'evtPort' ) {
         evtPort = parseInt(lvl0_obj);
         console.log('event Hub Port:', evtPort);
    } else if ( top_key[i0] == 'version' ) {
         buff = top_key[i0] + ":" + " '" + lvl0_obj + "'" + "\n";
         fs.appendFileSync(dFile, buff);
    } else if ( top_key[i0] == 'networks' ) {
         buff = top_key[i0] + ":" + "\n";
         fs.appendFileSync(dFile, buff);
         buff = '    bridge:' + '\n';
         fs.appendFileSync(dFile, buff);
    } else if ( top_key[i0] == 'services' ) {
        buff = '\n';
        fs.appendFileSync(dFile, buff);
        buff = top_key[i0] + ':' + '\n';
        fs.appendFileSync(dFile, buff);
        //header 1
        for ( i=0; i<lvl1_key.length; i++ ) {
            lvl1_obj = lvl0_obj[lvl1_key[i]];
            lvl2_key = Object.keys(lvl1_obj);

            // header 2
             if (lvl1_key[i] == 'couchdb' ) {
                if (dbType == 'couchdb') {
                for ( v = 0; v < addVP; v++ ) {
                    tmp_name = lvl1_key[i] + v;
                    tmp_port = couchdbPort + v;
                    buff = '  ' + tmp_name +':' + '\n';
                    fs.appendFileSync(dFile, buff);

                    // header 3
                    for ( k=0; k<lvl2_key.length; k++ ) {
                        if ( lvl2_key[k] == 'environment' ) {
                            lvl2_obj = lvl1_obj[lvl2_key[k]];
                            lvl3_key = Object.keys(lvl2_obj);

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            for ( m=0; m< lvl3_key.length; m++ ) {
                                if ( lvl3_key[m] == 'CORE_PEER_ID' ) {
                                    buff = '  ' + '    - ' + lvl3_key[m] + '=' + tmp_name + '\n';
                                } else if ( lvl3_key[m] == 'CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS' ) {
                                    buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'couchdb'+v +':'+ couchdbPort + '\n';
                                } else {
                                    buff = '  ' + '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                                }

                                fs.appendFileSync(dFile, buff);
                            }
                        } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'command' ) || ( lvl2_key[k] == 'working_dir' )
                                    || ( lvl2_key[k] == 'restart') ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'container_name' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + tmp_name + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'ports' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            buff = '  ' + '    - ' + tmp_port + ':' + couchdbPort + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'links' ) {
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];
                            //console.log('lvl2_obj: %d ', lvl2_obj.length, lvl2_obj);

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);
                            buff = '  ' + '    - ' + 'orderer' + '\n';
                            fs.appendFileSync(dFile, buff);
                            if ( addCA == 1 ) {
                                buff = '  ' + '    - ' + 'ca' + '\n';
                                fs.appendFileSync(dFile, buff);
                            }
                            // header 4
                            for ( m=0; m< v; m++ ) {
                                buff = '  ' + '    - ' +'peer'+m + '\n';
                                fs.appendFileSync(dFile, buff);
                            }

                        } else if ( ( lvl2_key[k] == 'volumes' ) || ( lvl2_key[k] == 'depends_on' ) ){
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];
                            //console.log('lvl2_obj: %d ', lvl2_obj.length, lvl2_obj);

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            for ( m=0; m< lvl2_obj.length; m++ ) {
                                buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                                fs.appendFileSync(dFile, buff);

                            }

                        } else {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }
                    }
                    // add a blank line
                    buff = '\n';
                    fs.appendFileSync(dFile, buff);

                }
                }
             } else if (lvl1_key[i] == 'orderer' ) {
                for ( v = 0; v < addOrderer; v++ ) {
                    //tmp_name = lvl1_key[i] + v;
                    var v1 = v+1;
                    //ordererName = 'orderer1.'+comName;
                    ordererName = 'orderer'+v+'.'+comName;
                    buff = '  ' + ordererName +':' + '\n';
                    fs.appendFileSync(dFile, buff);

                    // header 3
                    for ( k=0; k<lvl2_key.length; k++ ) {
                        if ( (lvl2_key[k] == 'environment') ) {
                            lvl2_obj = lvl1_obj[lvl2_key[k]];
                            lvl3_key = Object.keys(lvl2_obj);

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                                // header 4
                                for ( m=0; m< lvl3_key.length; m++ ) {
                                    tmp = ord_env_name.indexOf( lvl3_key[m] );
                                    if ( tmp >= 0 ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + ord_env_val[tmp] + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'ORDERER_KAFKA_BROKERS' ) {
                                        if ( addBroker > 0 ) {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=[';
                                            for (n=0; n<addBroker; n++) {
                                                buff = buff + 'kafka' + n +':9092' ;
                                                if ( n < (addBroker-1) ) {
                                                     buff = buff + ',';
                                                }
                                            }
                                            buff = buff + ']' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                                    } else if ( lvl3_key[m] == 'CONFIGTX_ORDERER_ORDERERTYPE' ) {
                                            if ( addBroker > 0 ) {
                                                buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'kafka' + '\n';
                                                fs.appendFileSync(dFile, buff);
                                            } else {
                                                buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'solo' + '\n';
                                                fs.appendFileSync(dFile, buff);
                                            }
                                    } else if ( lvl3_key[m] == 'ORDERER_GENERAL_LISTENPORT' ) {
                                            tmp_port = ordererPort + v;
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + tmp_port + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'ORDERER_GENERAL_GENESISMETHOD' ) {
                                        if ( addBroker > 0 ) {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + lvl2_obj[lvl3_key[m]] + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        } else {
                                            //buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'solo' + '\n';  // TBD
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + lvl2_obj[lvl3_key[m]] + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                                    } else if ( lvl3_key[m] == 'ORDERER_GENERAL_GENESISFILE' ) {
                                            var t = v+1;
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + ordererMSPDir + '/orderer.block' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'ORDERER_GENERAL_LOCALMSPID' ) {
                                            var t = v+1;
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'OrdererOrg' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'ORDERER_GENERAL_LOCALMSPDIR' ) {
                                            var t = v+1;
                                            // This looks wrong; how would we get ordererOrg1Orderer2 ?
                                            // buff = '  ' + '    - ' + lvl3_key[m] + '=' + ordererMSPDir + '/ordererOrg' + '' +t+'/orderers/ordererOrg'+t+'orderer'+t + '\n';
                                            // For now crytogen tool only puts all orderers into one ordererOrg1 anyways, so:
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + ordererMSPDir + '/'+comName+'/orderers/'+ordererName+'/msp' + '\n';
                                            //buff = '  ' + '    - ' + lvl3_key[m] + '=' + ordererMSPDir + '/orderer'+t+'.example.com/orderers/orderer'+t+'.orderer'+t+'.example.com/msp' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    }

                                }
                                if ( TLS.toUpperCase() == 'ENABLED' ) {
                                    var v1 = v+1;
                                    var OrdTLSDir = srcMSPDir + '/ordererOrganizations/'+comName+'/orderers/'+ordererName+'/tls';

                                    buff = '  ' + '    - ORDERER_GENERAL_TLS_ENABLED=true'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    buff = '  ' + '    - ORDERER_GENERAL_TLS_PRIVATEKEY='+OrdTLSDir+'/server.key'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    buff = '  ' + '    - ORDERER_GENERAL_TLS_CERTIFICATE='+OrdTLSDir+'/server.crt'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    var OrdUserDir = srcMSPDir + '/ordererOrganizations/'+comName+'/users/Admin@'+comName+'/tls';
                                    var ordererCerts=OrdTLSDir+'/ca.crt';
                                    buff = '  ' + '    - ORDERER_GENERAL_TLS_ROOTCAS=['+ordererCerts;
                                    for (var orgid=1; orgid<=nOrg; orgid++) {
                                         var tmporg='org'+orgid+'.'+comName;
                                         var orgTLSDir = srcMSPDir + '/peerOrganizations/'+tmporg+'/peers';
                                    }
                                    buff = buff + ']'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    // mutual TLS
                                    if ( MutualTLS.toUpperCase() == 'ENABLED' ) {
                                        buff = '  ' + '    - ORDERER_GENERAL_TLS_CLIENTAUTHREQUIRED=true'+'\n';
                                        fs.appendFileSync(dFile, buff);
                                        var ordererCerts=OrdTLSDir+'/ca.crt';
                                        buff = '  ' + '    - ORDERER_GENERAL_TLS_CLIENTROOTCAS=['+ordererCerts;
                                        for (var orgid=1; orgid<=nOrg; orgid++) {
                                             var tmporg='org'+orgid+'.'+comName;
                                             var peerCA = srcMSPDir + '/peerOrganizations/'+tmporg+'/ca/ca.'+tmporg+'-cert.pem';
                                             buff = buff + ', ' + peerCA;
                                        }
                                        buff = buff + ']'+'\n';
                                        fs.appendFileSync(dFile, buff);
                                    }
                                }
                        } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'command' ) || ( lvl2_key[k] == 'working_dir' )
                                    || ( lvl2_key[k] == 'restart') ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);
                        } else if ( lvl2_key[k] == 'container_name' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + ordererName + '\n';
                            fs.appendFileSync(dFile, buff);
                        } else if ( lvl2_key[k] == 'volumes' ) {
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            for ( m=0; m< lvl2_obj.length; m++ ) {
                                buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                                fs.appendFileSync(dFile, buff);

                            }
                                buff = '  ' + '    - ' + MSPDir + ':' + srcMSPDir + '\n';
                                fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'ports' ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);
                                tmp_port = ordererPort + v;

                                buff = '  ' + '    - ' + tmp_port +':' + tmp_port + '\n' ;
                                fs.appendFileSync(dFile, buff);

                        } else if ( (lvl2_key[k] == 'depends_on') ) {
                            if ( addBroker > 0 ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                //buff = '  ' + '    - ' + 'zookeeper' + '\n' ;
                                //fs.appendFileSync(dFile, buff);
                                if ( KAFKA==1 ) {
                                    for (n=0; n<addBroker; n++) {
                                        buff = '  ' + '    - ' + 'kafka' + n + '\n' ;
                                        fs.appendFileSync(dFile, buff);
                                    }
                                }
                            }
                        } else {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }
                    }
                    // add a blank line
                    buff = '\n';
                    fs.appendFileSync(dFile, buff);

                }
             } else if (lvl1_key[i] == 'kafka' ) {
                for ( v = 0; v < addBroker; v++ ) {
                    tmp_name = lvl1_key[i] + v;
                    tmp_port = kafkaPort + v;
                    buff = '  ' + tmp_name +':' + '\n';
                    fs.appendFileSync(dFile, buff);

                    // header 3
                    for ( k=0; k<lvl2_key.length; k++ ) {
                        if ( (lvl2_key[k] == 'environment') ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                // header 4
                                for ( m=0; m< lvl3_key.length; m++ ) {
                                    if ( lvl3_key[m] == 'KAFKA_BROKER_ID' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + v + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'KAFKA_DEFAULT_REPLICATION_FACTOR' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + addReplica + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'KAFKA_ZOOKEEPER_CONNECT' ) {
                                        var zp=2181;
                                        var ktmp='zookeeper0:2181';
                                        for (l=1; l<nZoo; l++) {
                                            zp=zp+1000;
                                            ktmp=ktmp+',zookeeper'+l+':'+zp;
                                        }
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + ktmp + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'KAFKA_MIN_INSYNC_REPLICAS' ) {
                                        var nk = 1;
                                        if ( addBroker > 2 ) {
                                             nk = 2;
                                        }
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + nk + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    }

                                }
                        } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'command' ) || ( lvl2_key[k] == 'working_dir' )
                                    || ( lvl2_key[k] == 'restart') ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);
                        } else if ( lvl2_key[k] == 'container_name' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + tmp_name + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'ports' ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);
                                //tmp_port = kafkaPort + v;

                                buff = '  ' + '    - ' + tmp_port +':' + '9092' + '\n' ;
                                //buff = '  ' + '    - ' + tmp_port +':' + tmp_port + '\n' ;
                                fs.appendFileSync(dFile, buff);
                        } else if ( lvl2_key[k] == 'depends_on' ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);
                                //tmp_port = kafkaPort + v;

                                        for (l=0; l<nZoo; l++) {
                                            buff = '  ' + '    - ' + 'zookeeper'+l + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                        } else {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }
                    }
                    // add a blank line
                    buff = '\n';
                    fs.appendFileSync(dFile, buff);

                }
             } else if (lvl1_key[i] == 'zookeeper' ) {
                for ( v = 0; v < nZoo; v++ ) {
                    var zbase=2181;
                    var zport=2181+v*1000;
                    var zport1=zport+1;
                    console.log('zport:zport1=%d:%d',zport,zport1);
                    tmp_name = lvl1_key[i] + v;
                    buff = '  ' + tmp_name +':' + '\n';
                    fs.appendFileSync(dFile, buff);

                    // header 3
                    for ( k=0; k<lvl2_key.length; k++ ) {
                        if ( (lvl2_key[k] == 'environment') ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                // header 4
                                for ( m=0; m< lvl3_key.length; m++ ) {
                                    if ( lvl3_key[m] == 'ZOO_MY_ID' ) {
                                        var v1=v+1;
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + v1 + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'ZOO_PORT' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + zport + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'ZOO_SERVERS' ) {
                                        var z1=zbase+1;
                                        var z2=zbase+2;
                                        var tmp='server.1='+'zookeeper0'+':'+z1+':'+z2+':participant';
                                        for (l=1; l< nZoo; l++) {
                                            z1=z1+1000;
                                            z2=z2+1000;
                                            var l1=l+1;
                                            tmp=tmp+' server.'+l1+'='+'zookeeper'+l+':'+z1+':'+z2+':participant';
                                        }
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + tmp + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    }

                                }
                        } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'command' ) || ( lvl2_key[k] == 'working_dir' )
                                    || ( lvl2_key[k] == 'restart') ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);
                        } else if ( lvl2_key[k] == 'ports' ) {
                            // Zookeeper ports to be exposed only to other containers (e.g., Kafka)
                            buff = '  ' + '  expose:' + '\n';
                            fs.appendFileSync(dFile, buff);
                                        for (l=0; l< nZoo; l++) {
                                            var tmp = zport+l;
                                            // Zookeeper ports to be exposed only to other containers (e.g., Kafka)
                                            buff = '  ' + '    - "' + tmp + '"\n';
                                            fs.appendFileSync(dFile, buff);
                                        }

                        } else if ( lvl2_key[k] == 'container_name' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + tmp_name + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }
                    }
                    // add a blank line
                    buff = '\n';
                    fs.appendFileSync(dFile, buff);

                }
             } else if (lvl1_key[i] == 'peer' ) {
                for ( v = 0; v < addVP; v++ ) {
                    var t = Math.floor(v / nPeerPerOrg) + 1;
                    var s = (v % nPeerPerOrg);
                    var peerName = 'peer'+s+'.org'+t+'.'+comName;
                    var peer0Name = 'peer0.org'+t+'.'+comName;
                    //console.log('v: %d, peerName: %s', v, peerName);
                    tmp_name = lvl1_key[i] + v;
                    tmp_port = vp0Port + v;
                    buff = '  ' + peerName +':' + '\n';
                    fs.appendFileSync(dFile, buff);

                    // header 3
                    for ( k=0; k<lvl2_key.length; k++ ) {
                        if ( (lvl2_key[k] == 'environment') ) {
                            lvl2_obj = lvl1_obj[lvl2_key[k]];
                            lvl3_key = Object.keys(lvl2_obj);

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                                // header 4
                                for ( m=0; m< lvl3_key.length; m++ ) {
                                    tmp = peer_env_name.indexOf( lvl3_key[m] );
                                    if ( tmp >= 0 ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + peer_env_val[tmp] + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_ID' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + peerName + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_NETWORKID' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + tmp_name + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + HOSTCONFIG_NETWORKMODE +'_default' + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_GOSSIP_BOOTSTRAP' ) {
                                        if ( s != 0 ) {
                                            var k1 = vp0Port + (t-1)*nPeerPerOrg;
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + peer0Name +':'+ k1 + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                                    } else if ( lvl3_key[m] == 'CORE_LEDGER_STATE_STATEDATABASE' ) {
                                        if (dbType == 'couchdb') {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'CouchDB' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                                    } else if ( lvl3_key[m] == 'CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS' ) {
                                        if (dbType == 'couchdb') {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'couchdb'+v +':'+ couchdbPort + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                                    } else if ( lvl3_key[m] == 'CORE_PEER_GOSSIP_ORGLEADER' ) {
                                        if ( (v%nPeerPerOrg) == 0 ) {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'false' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        } else {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'false' + '\n';
                                            fs.appendFileSync(dFile, buff);
                                        }
                                    } else if ( lvl3_key[m] == 'CORE_PEER_LISTENADDRESS' ) {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + peerName +':'+ tmp_port + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_GOSSIP_ENDPOINT' ) {
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + peerName +':'+ tmp_port + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_EVENTS_ADDRESS' ) {
                                            var t1 = evtPort + v;
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + peerName +':'+ t1 + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_LOCALMSPID' ) {
                                            var t1 = Math.floor(v / nPeerPerOrg) + 1;
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + 'PeerOrg'+t1 + '\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else if ( lvl3_key[m] == 'CORE_PEER_MSPCONFIGPATH' ) {
                                            var t1 = Math.floor(v / nPeerPerOrg) + 1;
                                            var s1 = (v % nPeerPerOrg);
                                            buff = '  ' + '    - ' + lvl3_key[m] + '=' + peerMSPDir + '/org'+t1 +'.'+comName+'/peers/peer'+s1+'.org'+t1+'.'+comName+'/msp'+'\n';
                                            fs.appendFileSync(dFile, buff);
                                    } else {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    }

                                }

                                buff = '  ' + '    - CORE_PEER_ADDRESS=' + peerName +':'+ tmp_port + '\n';
                                fs.appendFileSync(dFile, buff);
                                buff = '  ' + '    - CORE_PEER_GOSSIP_EXTERNALENDPOINT='+peerName+':'+ tmp_port + '\n';
                                fs.appendFileSync(dFile, buff);

                                if ( TLS.toUpperCase() == 'ENABLED' ) {
                                    var oid = Math.floor(v / nPeerPerOrg) + 1;
                                    var pid = (v % nPeerPerOrg);
                                    var peerTLSDir = peerMSPDir+'/org'+oid +'.'+comName+'/peers/peer'+pid+'.org'+oid+'.'+comName+'/tls';
                                    var peerUserDir = peerMSPDir+'/org'+oid +'.'+comName+'/users/Admin@org'+oid+'.'+comName+'/tls';

                                    buff = '  ' + '    - CORE_PEER_TLS_ENABLED=true' + '\n';
                                    fs.appendFileSync(dFile, buff);

                                    buff = '  ' + '    - CORE_PEER_TLS_CERT_FILE='+peerTLSDir+'/server.crt'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    buff = '  ' + '    - CORE_PEER_TLS_KEY_FILE='+peerTLSDir+'/server.key'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    buff = '  ' + '    - CORE_PEER_TLS_ROOTCERT_FILE='+peerTLSDir+'/ca.crt'+'\n';
                                    fs.appendFileSync(dFile, buff);

                                    // mutual TLS
                                    if ( MutualTLS.toUpperCase() == 'ENABLED' ) {
                                        buff = '  ' + '    - CORE_PEER_TLS_CLIENTAUTHREQUIRED=true'+'\n';
                                        fs.appendFileSync(dFile, buff);

                                        buff = '  ' + '    - CORE_PEER_TLS_CLIENTROOTCAS_FILES=';
                                        for ( ordid=0; ordid<addOrderer; ordid++) {
                                            var ordererName = 'orderer'+ordid+'.'+comName;
                                            var ordererCerts = srcMSPDir + '/ordererOrganizations/'+comName+'/orderers/'+ordererName+'/tls/ca.crt';
                                            buff = buff + ordererCerts + ' ';
                                         }
                                         var tmporg='org'+oid+'.'+comName;
                                         var peerCA = srcMSPDir + '/peerOrganizations/'+tmporg+'/ca/ca.'+tmporg+'-cert.pem';
                                         for (var orgid=1; orgid<=nOrg; orgid++) {
                                             var tmporg='org'+orgid+'.'+comName;
                                             var orgTLSDir = srcMSPDir + '/peerOrganizations/'+tmporg+'/peers';
                                             var peerCA = srcMSPDir + '/peerOrganizations/'+tmporg+'/ca/ca.'+tmporg+'-cert.pem';
                                             buff = buff + ' ' + peerCA;
                                         }
                                         buff = buff + '\n';
                                         fs.appendFileSync(dFile, buff);
                                    }
                                }
                        } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'command' ) || ( lvl2_key[k] == 'working_dir' )
                                    || ( lvl2_key[k] == 'restart') ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'container_name' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + peerName + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'ports' ) {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            buff = '  ' + '    - ' + tmp_port + ':' + tmp_port + '\n';
                            fs.appendFileSync(dFile, buff);

                            var t1 = evtPort + v;
                            buff = '  ' + '    - ' + t1 + ':' + t1 + '\n';
                            fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'links' ) {
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);
                            var tmp_ord = v % addOrderer;
                            var tmp_ord_id = 'orderer'+tmp_ord;
                            buff = '  ' + '    - ' + tmp_ord_id + '\n';
                            fs.appendFileSync(dFile, buff);
                            if (dbType == 'couchdb') {
                                buff = '  ' + '    - ' + 'couchdb'+v + '\n';
                                fs.appendFileSync(dFile, buff);
                            }
                            if ( addCA == 1 ) {
                                buff = '  ' + '    - ' + 'ca' + '\n';
                                fs.appendFileSync(dFile, buff);
                            }
                            // header 4
                            for ( m=0; m< v; m++ ) {
                                buff = '  ' + '    - ' +'peer'+m + '\n';
                                fs.appendFileSync(dFile, buff);
                            }

                        } else if ( lvl2_key[k] == 'extends' ) {
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            for ( m=0; m< lvl2_obj.length; m++ ) {
                                buff = '  ' + '      ' +lvl2_obj[m] + '\n';
                                fs.appendFileSync(dFile, buff);

                            }
                        } else if ( lvl2_key[k] == 'volumes' ) {
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            for ( m=0; m< lvl2_obj.length; m++ ) {
                                buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                                fs.appendFileSync(dFile, buff);

                            }
                                buff = '  ' + '    - ' + MSPDir+':'+ srcMSPDir + '\n';
                                fs.appendFileSync(dFile, buff);

                        } else if ( lvl2_key[k] == 'depends_on'  ){
                            var lvl2_obj = lvl1_obj[lvl2_key[k]];

                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            // header 4
                            for ( m=0; m< lvl2_obj.length; m++ ) {
                                //buff = '  ' + '    - ' +lvl2_obj[m]+m + '\n';
                                var t1 = Math.floor(v / nPeerPerOrg);
                                var s1 = t1 % addOrderer;
                                var peerOrdererName = 'orderer'+s1+'.'+comName;
                                buff = '  ' + '    - ' +peerOrdererName + '\n';
                                fs.appendFileSync(dFile, buff);
                            }
                            // header 4
                            var t = Math.floor(v / nPeerPerOrg) * nPeerPerOrg;
                            for ( m=t; m< v; m++ ) {
                                var t1 = Math.floor(v / nPeerPerOrg) + 1;
                                var s1 = (m % nPeerPerOrg);
                                var peerName1 = 'peer'+s1+'.org'+t1+'.'+comName;
                                buff = '  ' + '    - ' +peerName1 + '\n';
                                fs.appendFileSync(dFile, buff);
                            }
                            // head 4: couchDB
                            if (dbType == 'couchdb') {
                                buff = '  ' + '    - ' + 'couchdb'+v + '\n';
                                fs.appendFileSync(dFile, buff);
                            }
                        } else {
                            buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                            fs.appendFileSync(dFile, buff);

                            buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }
                    }
                    // add a blank line
                    buff = '\n';
                    fs.appendFileSync(dFile, buff);

                }
             } else if (lvl1_key[i] == 'cli' ) {
                buff = '  ' + lvl1_key[i] +':' + '\n';
                fs.appendFileSync(dFile, buff);

                // header 3
                for ( k=0; k<lvl2_key.length; k++ ) {
                    if ( lvl2_key[k] == 'environment' ) {
                        lvl2_obj = lvl1_obj[lvl2_key[k]];
                        lvl3_key = Object.keys(lvl2_obj);
                        //console.log('lvl2_obj: ', lvl2_obj);
                        //console.log('lvl3_key: ', lvl3_key);

                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                        fs.appendFileSync(dFile, buff);

                    } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'command' ) || ( lvl2_key[k] == 'working_dir' )
                            || ( lvl2_key[k] == 'restart') || ( lvl2_key[k] == 'container_name') || ( lvl2_key[k] == 'tty') ) {
                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                        fs.appendFileSync(dFile, buff);

                    } else if ( lvl2_key[k] == 'links' ) {
                        var lvl2_obj = lvl1_obj[lvl2_key[k]];
                        //console.log('lvl2_obj: %d ', lvl2_obj.length, lvl2_obj);

                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                        fs.appendFileSync(dFile, buff);

                        // header 4
                            buff = '  ' + '    - ' +'orderer0:orderer0' + '\n';
                            fs.appendFileSync(dFile, buff);
                            buff = '  ' + '    - ' +'peer0:peer0' + '\n';
                            fs.appendFileSync(dFile, buff);

                    } else if ( lvl2_key[k] == 'depends_on' ) {
                        var lvl2_obj = lvl1_obj[lvl2_key[k]];
                        //console.log('lvl2_obj: %d ', lvl2_obj.length, lvl2_obj);

                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                        fs.appendFileSync(dFile, buff);

                        // header 4
                            buff = '  ' + '    - ' +'orderer0' + '\n';
                            fs.appendFileSync(dFile, buff);
                            // header 4
                            for ( m=0; m< addVP; m++ ) {
                                buff = '  ' + '    - ' +'peer'+m + '\n';
                                fs.appendFileSync(dFile, buff);
                            }

                    } else if ( lvl2_key[k] == 'ports' ){
                        var lvl2_obj = lvl1_obj[lvl2_key[k]];
                        //console.log('lvl2_obj: %d ', lvl2_obj.length, lvl2_obj);

                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                        fs.appendFileSync(dFile, buff);

                        // header 4
                        for ( m=0; m< lvl2_obj.length; m++ ) {
                            buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }

                    } else if ( lvl2_key[k] == 'volumes' ){
                        var lvl2_obj = lvl1_obj[lvl2_key[k]];
                        //console.log('lvl2_obj: %d ', lvl2_obj.length, lvl2_obj);

                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                        fs.appendFileSync(dFile, buff);

                        // header 4
                        for ( m=0; m< lvl2_obj.length; m++ ) {
                            buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                            fs.appendFileSync(dFile, buff);

                        }
                            buff = '  ' + '    - ' + MSPDir+':'+ srcMSPDir + '\n';
                            fs.appendFileSync(dFile, buff);

                    } else {
                        buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                        fs.appendFileSync(dFile, buff);

                        buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                        fs.appendFileSync(dFile, buff);

                    }
                }
                // add a blank line
                buff = '\n';
                fs.appendFileSync(dFile, buff);

             } else {
                if (lvl1_key[i] == 'ca' ) {
                    for ( v = 0; v < addCA; v++ ) {
                        tmp_name = lvl1_key[i] + v;
                        tmp_port = caPort + v;
                        //console.log('tmp_name: %s, tmp_port: %s', tmp_name, tmp_port);
                        buff = '  ' + tmp_name +':' + '\n';
                        fs.appendFileSync(dFile, buff);

                        // header 3
                        for ( k=0; k<lvl2_key.length; k++ ) {
                            if ( lvl2_key[k] == 'environment' ) {
                                lvl2_obj = lvl1_obj[lvl2_key[k]];
                                lvl3_key = Object.keys(lvl2_obj);
                                //console.log('lvl2_obj: ', lvl2_obj);
                                //console.log('lvl3_key: ', lvl3_key);

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                // header 4
                                for ( m=0; m< lvl3_key.length; m++ ) {
                                    if ( lvl3_key[m] == 'FABRIC_CA_SERVER_CA_NAME' ) {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' + lvl2_obj[lvl3_key[m]]+v + '\n';
                                        fs.appendFileSync(dFile, buff);
                                    } else {
                                        buff = '  ' + '    - ' + lvl3_key[m] + '=' +lvl2_obj[lvl3_key[m]] + '\n';
                                        fs.appendFileSync(dFile, buff);

                                    }
                                }

                                if ( TLS.toUpperCase() == 'ENABLED' ) {
                                    var v1 = v+1;
                                    buff = '  ' + '    - FABRIC_CA_SERVER_CA_CERTFILE='+CADir+'/ca.org'+v1+'.'+comName+'-cert.pem'+'\n';
                                    fs.appendFileSync(dFile, buff);
                                    buff = '  ' + '    - FABRIC_CA_SERVER_CA_KEYFILE='+CADir+'/CA_SK'+v+'\n';
                                    fs.appendFileSync(dFile, buff);
                                    buff = '  ' + '    - FABRIC_CA_SERVER_TLS_ENABLED=true' + '\n';
                                    fs.appendFileSync(dFile, buff);
                                    buff = '  ' + '    - FABRIC_CA_SERVER_TLS_CERTFILE='+CADir+'/ca.org'+v1+'.'+comName+'-cert.pem'+'\n';
                                    fs.appendFileSync(dFile, buff);
                                    buff = '  ' + '    - FABRIC_CA_SERVER_TLS_KEYFILE='+CADir+'/CA_SK'+v+'\n';
                                    fs.appendFileSync(dFile, buff);
                                }

                            } else if ( lvl2_key[k] == 'container_name' ) {
                                var t = v+1;
                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + v + '\n';
                                fs.appendFileSync(dFile, buff);

                            } else if ( lvl2_key[k] == 'command' ) {
                                var v1=v+1;
                                //var tmp = lvl1_obj[lvl2_key[k]] + ' '+CADir+"/ca.org"+v1+"."+comName+"-cert.pem --ca.keyfile " + CADir+"/CA_SK"+v+" -b admin:adminpw -d'"
                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                                //buff = '  ' + '  ' + lvl2_key[k] + ': ' + tmp + '\n';
                                fs.appendFileSync(dFile, buff);

                            } else if ( ( lvl2_key[k] == 'image' ) || ( lvl2_key[k] == 'working_dir' )
                                    || ( lvl2_key[k] == 'restart') || ( lvl2_key[k] == 'container_name') || ( lvl2_key[k] == 'tty') ) {
                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + lvl1_obj[lvl2_key[k]] + '\n';
                                fs.appendFileSync(dFile, buff);

                            } else if ( lvl2_key[k] == 'ports' ) {
                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                buff = '  ' + '    - ' + tmp_port + ':' + 7054 + '\n';
                                fs.appendFileSync(dFile, buff);
                            } else if ( lvl2_key[k] == 'volumes' ) {
                                var lvl2_obj = lvl1_obj[lvl2_key[k]];

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                // header 4
                                var t0 = v+1;
                                var t1 = 'org'+t0+'.'+comName;
                                var tmp = MSPDir+'/peerOrganizations/'+t1+'/ca/:/etc/hyperledger/fabric-ca-server-config';
                                buff = '  ' + '    - ' + tmp + '\n';
                                //buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                                fs.appendFileSync(dFile, buff);


                            } else if ( ( lvl2_key[k] == 'links' ) || ( lvl2_key[k] == 'depends_on' ) ){
                                var lvl2_obj = lvl1_obj[lvl2_key[k]];

                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                // header 4
                                for ( m=0; m< lvl2_obj.length; m++ ) {
                                    buff = '  ' + '    - ' +lvl2_obj[m] + '\n';
                                    fs.appendFileSync(dFile, buff);

                                }

                            } else {
                                buff = '  ' + '  ' + lvl2_key[k] + ': ' + '\n';
                                fs.appendFileSync(dFile, buff);

                                buff = '  ' + '    - ' + lvl1_obj[lvl2_key[k]] + '\n';
                                fs.appendFileSync(dFile, buff);

                            }
                        }
                        // add a blank line
                        buff = '\n';
                        fs.appendFileSync(dFile, buff);
                    }
                }

            }
        }
    }
}
