/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as FabricCAServices from 'fabric-ca-client';
import { Wallets, X509Identity } from 'fabric-network';
import * as fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { BaseComponent, CA, Channel, DB, Orderer, Org, Peer, Profile } from '../interfaces/interfaces';
import { Docker } from '../utils/docker';
import { Logger } from '../utils/logger';

const logger = Logger.getLogger('./src/network/network.ts');

export interface NetworkDetails {
    resourceFolder: string;
    tag: string;
}

export interface NetworkConfiguration {
    organisations: Org[];
    orderers: Orderer[];
    profiles: Map<string, Profile>;
}

const networkResources = path.resolve(__dirname, '../../resources/networks');
const networkComposeFile = 'docker-compose/docker-compose.yaml';
const cliComposeFile = path.join(networkResources, 'shared', 'docker-compose/docker-compose-cli.yaml');

// export const DEFINED_NETWORKS = fs.readdirSync(networkResources).filter((name) => name !== 'shared' && name !== 'scripts');
export const DEFINED_NETWORKS = ['three-org'];

export class Network {
    private name: string;
    private details: NetworkDetails;
    private config: NetworkConfiguration;
    private channels: Map<string, Channel>;

    public constructor(type: string) {
        if (!DEFINED_NETWORKS.some((name) => name === type)) {
            throw new Error(`Network "${type}" not found`);
        }

        this.name = type;
        this.details = {
            resourceFolder: path.join(networkResources, this.name),
            tag: '@' + this.name.replace(/([-][a-z])/g, (group) => group.toUpperCase().replace('-', '')),
        };

        this.channels = new Map<string, Channel>();
    }

    public async setupConfig() {
        this.config = {
            orderers: await this.parseOrderers(),
            organisations: await this.parseOrgs(),
            profiles: await this.parseProfiles(),
        };
    }

    public async build() {
        if (!this.config) {
            await this.setupConfig();
        }

        await this.teardownExisting();
        await this.createOrgsNetworkInteractionFiles();
        this.configureEnvVars();
        await this.generateCrypto();
        await Docker.composeUp(path.join(networkResources, this.name, networkComposeFile), this.name);
        await this.enrollAdmins();
    }

    public async teardown() {
        await this.teardownNetwork(this.name);
        await this.cleanupChaincode();
    }

    public async addChannel(channel: Channel) {
        this.channels.set(channel.name, channel);
    }

    public getProfile(profile: string): Profile {
        if (!this.config.profiles.has(profile)) {
            throw new Error(`Profile "${profile}" not found`);
        }

        return this.config.profiles.get(profile);
    }

    public getDefaultOrderer(): Orderer {
        return this.config.orderers[0];
    }

    public getChannel(channel: string): Channel {
        if (!this.channels.has(channel)) {
            throw new Error(`Channel "${channel}" not found`);
        }

        return this.channels.get(channel);
    }

    public getOrganisations(): Org[] {
        return this.config.organisations;
    }

    public getOrganisation(orgName: string): Org {
        for (const org of this.config.organisations) {
            if (org.name === orgName) {
                return org;
            }
        }

        throw new Error(`Org "${orgName}" not found`);
    }

    private async createOrgsNetworkInteractionFiles() {
        for (const org of this.config.organisations) {
            await this.createCcp(org);
            await this.createWallet(org.name);
        }
    }

    private async enrollAdmins() {
        for (const org of this.config.organisations) {
            const orgCa = org.cas[0];
            const rootCert = await fs.readFile(orgCa.trustedRootCert);

            const ca = new FabricCAServices(
                `https://localhost:${orgCa.externalPort}`, { trustedRoots: rootCert, verify: false }, orgCa.name,
            );

            const wallet = org.wallet;
            const admin = await wallet.get('admin');

            if (admin) {
                continue;
            }

            const enrollment = await ca.enroll({enrollmentID: 'admin', enrollmentSecret: 'adminpw'});

            const identity: X509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: org.mspid,
                type: 'X.509',
            };

            await wallet.put('admin', identity);
        }
    }

    private async parseOrgs(): Promise<Org[]> {
        logger.debug('Parsing orgs');

        const rawCryptoConfig = fs.readFileSync(path.join(this.details.resourceFolder, 'crypto-material/crypto-config.yaml'), 'utf8');
        const cryptoConfig = yaml.safeLoad(rawCryptoConfig);

        const organisations: Org[] = [];

        for (const org of cryptoConfig.PeerOrgs) {
            const orgIface: Org = {
                cas: this.parseCAs(org.Name),
                ccp: this.getCcpPath(org.Name),
                cli: orgToSmall(org.Name) + '_cli',
                db: this.parseDB(org.Name),
                mspid: org.Name + 'MSP',
                name: org.Name,
                peers: this.parsePeers(org.Name),
                wallet: await Wallets.newFileSystemWallet(this.getWalletPath(org.Name)),
            };

            logger.debug(`Parsed org ${org.Name}`, orgIface);

            organisations.push(orgIface);
        }

        return organisations;
    }

    private async parseProfiles(): Promise<Map<string, Profile>> {
        logger.debug('Parsing profiles');

        const rawConfigTx = fs.readFileSync(path.join(this.details.resourceFolder, 'crypto-material/configtx.yaml'), 'utf8');
        const configTx = yaml.safeLoad(rawConfigTx);

        const profiles = new Map();
        for (const profileName in configTx.Profiles) {
            if (configTx.Profiles.hasOwnProperty(profileName)) {
                const organisations: Org[] = [];

                for (const org of configTx.Profiles[profileName].Application.Organizations) {
                    const name = org.Name.split('MSP')[0];
                    const orgIface: Org = {
                        cas: this.parseCAs(name),
                        ccp: this.getCcpPath(name),
                        cli: orgToSmall(name) + '_cli',
                        db: this.parseDB(name),
                        mspid: org.Name,
                        name,
                        peers: this.parsePeers(name),
                        wallet: await Wallets.newFileSystemWallet(this.getWalletPath(name)),
                    };

                    organisations.push(orgIface);
                }

                profiles.set(profileName, {
                    organisations,
                });
            }
        }

        return profiles;
    }

    private getWalletPath(org: string): string {
        return path.join(this.details.resourceFolder, 'wallets', org);
    }

    private async createWallet(org: string) {
        logger.debug(`Creating wallet for ${org}`);
        await fs.mkdirp(this.getWalletPath(org));

        logger.debug('Created wallet', this.getWalletPath(org));
    }

    private async createCcp(org: Org) {
        logger.debug(`Creating connection profile for ${org.name}`);

        const ccpPath = this.getCcpPath(org.name);

        if (!(await fs.pathExists(ccpPath))) {
            const rawTmpl = (await fs.readFile(path.join(networkResources, 'shared', 'connection-profiles/connection_profile.hbr'))).toString();
            const tmpl = Handlebars.compile(rawTmpl);

            const orgClone = JSON.parse(JSON.stringify(org));
            orgClone.smallName = orgToSmall(org.name);
            orgClone.orderers = [this.getDefaultOrderer()];
            orgClone.cryptoConfigPath = path.join(this.details.resourceFolder, 'crypto-material/crypto-config');

            await fs.ensureFile(ccpPath);
            await fs.writeFile(ccpPath, tmpl(orgClone));
        }

        logger.debug('Created connection profile', ccpPath);

        return ccpPath;
    }

    private getCcpPath(org: string): string {
        const ccpFolder = path.join(this.details.resourceFolder, 'connection-profiles');
        const ccpPath = path.join(ccpFolder, `${org}-connection-profile.json`);

        return ccpPath;
    }

    private parseOrderers(): Orderer[] {
        logger.debug('Parsing network orderers');

        const rawDockerCompose = fs.readFileSync(path.join(this.details.resourceFolder, 'docker-compose/docker-compose.yaml'), 'utf8');
        const dockerCompose = yaml.safeLoad(rawDockerCompose);

        const orderers: Orderer[] = [];

        for (const serviceName in dockerCompose.services) {
            if (dockerCompose.services.hasOwnProperty(serviceName)) {
                const service = dockerCompose.services[serviceName];
                if (service.hasOwnProperty('extends') && service.extends.hasOwnProperty('service') && service.extends.service === 'orderer') {
                    orderers.push({
                        externalPort: service.ports[0].split(':')[1],
                        name: serviceName,
                        port: service.ports[0].split(':')[0],
                    });
                }
            }
        }

        logger.debug('Parsed orderers', orderers);

        return orderers;
    }

    private parseComponent(org: string, type: 'peer' | 'ca' | 'db'): BaseComponent[] {
        const rawDockerCompose = fs.readFileSync(path.join(this.details.resourceFolder, 'docker-compose/docker-compose.yaml'), 'utf8');
        const dockerCompose = yaml.safeLoad(rawDockerCompose);

        const components: BaseComponent[] = [];

        let identifier;

        switch (type) {
            case 'peer': identifier = 'peer[0-9]'; break;
            case 'ca': identifier = 'tlsca'; break;
            case 'db': identifier = '(couch|level)db'; break;
            default: throw new Error('Invalid type ' + type);
        }

        for (const serviceName in dockerCompose.services) {
            if (dockerCompose.services.hasOwnProperty(serviceName)) {
                const service = dockerCompose.services[serviceName];
                if (service.hasOwnProperty('extends') && service.extends.hasOwnProperty('service') && (service.extends.service as string).endsWith(type)) {
                    const pattern = `${identifier}\\.${orgToSmall(org)}\\.com`;
                    const regex = new RegExp(pattern);

                    if (regex.test(serviceName)) {
                        components.push({
                            externalPort: parseInt(service.ports[0].split(':')[0], 10),
                            name: serviceName,
                            port: parseInt(service.ports[0].split(':')[1], 10),
                        });
                    }
                }
            }
        }
        return components;
    }

    private parsePeers(org: string): Peer[] {
        logger.debug(`Parsing peers for ${org}`);
        const peers = this.parseComponent(org, 'peer');

        peers.forEach((peer) => {
            (peer as Peer).eventPort = peer.port + 2;
            (peer as Peer).externalEventPort = peer.externalPort + 2;
        });

        logger.debug(`Parsed peers for ${org}`, peers);
        return peers as Peer[];
    }

    private parseCAs(org: string): CA[] {
        logger.debug(`Parsing CAs for ${org}`);
        const cas = this.parseComponent(org, 'ca');
        cas.forEach((ca) => {
            (ca as CA).trustedRootCert = path.join(this.details.resourceFolder, `crypto-material/crypto-config/peerOrganizations/${orgToSmall(org)}.com/tlsca/${ca.name}-cert.pem`);
        });

        logger.debug(`Parsed CAs For ${org}`, cas);
        return cas as CA[];
    }

    private parseDB(org: string): DB {
        logger.debug(`Parsing DB for ${org}`);
        const dbs = this.parseComponent(org, 'db');

        if (dbs.length !== 1) {
            return null;
        }

        const db = dbs[0];
        (db as DB).type = db.name.startsWith('couch') ? 'couch' : 'level';

        logger.debug(`Parsed DB for ${org}`, db);

        return db as DB;
    }

    private async teardownExisting() {
        logger.debug('Finding existing networks');
        const upNetworks = await Docker.projectsUp(...DEFINED_NETWORKS);
        for (const network of upNetworks) {
            logger.debug(`Removing existing network ${network}`);
            await this.teardownNetwork(network);
        }

        await this.cleanupChaincode();
    }

    private async teardownNetwork(network: string) {
        logger.debug(`Tearing down network ${network}`);

        await Docker.composeDown(path.join(networkResources, network, networkComposeFile), network);
        await this.cleanupCrypto(network);
        await fs.remove(path.join(this.details.resourceFolder, 'wallets'));
        await fs.remove(path.join(this.details.resourceFolder, 'connection-profiles'));
    }

    private configureEnvVars() {
        process.env.FABRIC_IMG_TAG = ':2.0.0-beta';
        process.env.FABRIC_CA_IMG_TAG = ':1.4.4';
        process.env.FABRIC_COUCHDB_TAG = ':0.4.18';
        process.env.FABRIC_DEBUG = 'info';
        process.env.NETWORK_FOLDER = this.details.resourceFolder;

        logger.debug(`Configured environment variables:
            FABRIC_IMG_TAG: ${process.env.FABRIC_IMG_TAG}
            FABRIC_COUCHDB_TAG: ${process.env.FABRIC_COUCHDB_TAG}
            FABRIC_DEBUG: ${process.env.FABRIC_DEBUG}
            NETWORK_FOLDER: ${process.env.NETWORK_FOLDER}`,
        );
    }

    private async generateCrypto() {
        logger.debug('Generating crypto materials');

        await Docker.composeUp(cliComposeFile);

        await Docker.exec('cli', 'cryptogen generate --config=/etc/hyperledger/config/crypto-config.yaml --output /etc/hyperledger/config/crypto-config');
        await Docker.exec('cli', 'configtxgen -profile Genesis -outputBlock /etc/hyperledger/config/genesis.block -channelID genesis');
        await Docker.exec('cli', 'cp /etc/hyperledger/fabric/core.yaml /etc/hyperledger/config');
        await Docker.exec('cli', 'sh /etc/hyperledger/tools/rename_sk.sh');

        await Docker.composeDown(cliComposeFile, null, true);
    }

    private async cleanupCrypto(network: string) {
        logger.debug('Removing crypto materials');

        process.env.NETWORK_FOLDER = path.join(networkResources, network);

        await Docker.composeUp(cliComposeFile);
        await Docker.exec('cli', `bash -c 'cd /etc/hyperledger/config; rm -rf crypto-config; rm -f *.tx; rm -f core.yaml; rm -f *.block; rm -f $(ls | grep -e \'.*_anchors.tx\')'`);
        await Docker.composeDown(cliComposeFile, null, true);
    }

    private async cleanupChaincode() {
        logger.debug('Cleaning up any lingering chaincode');
        await Docker.removeContainers('dev-peer');
        await Docker.removeImages('dev-peer');
    }
}

function orgToSmall(orgName: string) {
    if (orgName.toUpperCase() === orgName) {
        return orgName.toLowerCase();
    }

    return orgName.replace(/(?:^|\.?)([A-Z])/g, (x, y: string) => '-' + y.toLowerCase()).replace(/^-/, '');
}
