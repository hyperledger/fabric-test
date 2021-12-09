package fabricconfiguration

import (
	"crypto"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-config/configtx"
	"github.com/hyperledger/fabric-config/configtx/membership"
	"github.com/hyperledger/fabric-config/configtx/orderer"
	cb "github.com/hyperledger/fabric-protos-go/common"
	"github.com/hyperledger/fabric-protos-go/msp"
	mb "github.com/hyperledger/fabric-protos-go/msp"
	"github.com/hyperledger/fabric-protos-go/orderer/etcdraft"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric/bccsp"
	"github.com/hyperledger/fabric/bccsp/factory"
	mspConfigBuilder "github.com/hyperledger/fabric/msp"
	"github.com/hyperledger/fabric/protoutil"
	yaml "gopkg.in/yaml.v2"
)

type ConfigtxConfiguration struct {
	Profiles map[string]*networkspec.ConfigtxProfile `yaml:"Profiles"`
}

type Configtxgen struct {
	ConfigPath              string
	OutputPath              string
	Profile                 string
	ChannelID               string
	OrgName                 string
	OutputChannelCreateTx   string
	OutputAnchorPeersUpdate string
	ArtifactsLocation       string
}

type ProviderType int

func GenerateConfigtxConfiguration(profile string, networkConfig networkspec.Config) *networkspec.ConfigtxProfile {

	var configtxConfiguration ConfigtxConfiguration
	var ordererPort uint32 = 30000
	var consenters []*etcdraft.Consenter
	var ordererOrganizations []*networkspec.ConfigtxOrganization
	ordererOrgsPath := paths.OrdererOrgsDir(networkConfig.ArtifactsLocation)

	for _, org := range networkConfig.OrdererOrganizations {
		var ordererEndpoints []string
		for i := 0; i < org.NumOrderers; i++ {
			ordererName := fmt.Sprintf("orderer%d-%s", i, org.Name)
			ordererEndpoints = append(ordererEndpoints, fmt.Sprintf("%s:%d", ordererName, ordererPort))
			serverCertPath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/orderers/%s.%s/tls/server.crt", org.Name, ordererName, org.Name))
			serverCertContent, _ := readPemFile(serverCertPath)
			consenter := &etcdraft.Consenter{
				Host:          ordererName,
				Port:          ordererPort,
				ClientTlsCert: serverCertContent,
				ServerTlsCert: serverCertContent,
			}
			consenters = append(consenters, consenter)
			ordererPort++
		}
		ordererOrganization := &networkspec.ConfigtxOrganization{
			Name:   org.Name,
			ID:     org.MSPID,
			MSPDir: paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/msp/", org.Name)),
			Policies: map[string]*networkspec.ConfigtxPolicy{
				configtx.ReadersPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%[1]s.admin', '%[1]s.orderer', '%[1]s.client')", org.MSPID),
				},
				configtx.WritersPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%[1]s.admin', '%[1]s.orderer', '%[1]s.client')", org.MSPID),
				},
				configtx.AdminsPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%s.admin')", org.MSPID),
				},
			},
			OrdererEndpoints: ordererEndpoints,
		}
		ordererOrganizations = append(ordererOrganizations, ordererOrganization)
	}

	var orderer = &networkspec.ConfigtxOrderer{
		OrdererType:  networkConfig.Orderer.OrdererType,
		BatchTimeout: networkConfig.Orderer.BatchTimeOut,
		BatchSize: networkspec.ConfigtxBatchSize{
			MaxMessageCount:   networkConfig.Orderer.BatchSize.MaxMessageCount,
			AbsoluteMaxBytes:  convertToUint(networkConfig.Orderer.BatchSize.AbsoluteMaxBytes),
			PreferredMaxBytes: convertToUint(networkConfig.Orderer.BatchSize.PreferredMaxBytes),
		},
		Kafka: networkspec.ConfigtxKafka{
			Brokers: []string{},
		},
		EtcdRaft: &etcdraft.ConfigMetadata{
			Consenters: consenters,
			Options: &etcdraft.Options{
				TickInterval:         networkConfig.Orderer.EtcdraftOptions.TickInterval,
				ElectionTick:         networkConfig.Orderer.EtcdraftOptions.ElectionTick,
				HeartbeatTick:        networkConfig.Orderer.EtcdraftOptions.HeartbeatTick,
				MaxInflightBlocks:    networkConfig.Orderer.EtcdraftOptions.MaxInflightBlocks,
				SnapshotIntervalSize: convertToUint(networkConfig.Orderer.EtcdraftOptions.SnapshotIntervalSize),
			},
		},
		Capabilities: map[string]bool{
			networkConfig.OrdererCapabilities: true,
		},
		Organizations: ordererOrganizations,
		Policies: map[string]*networkspec.ConfigtxPolicy{
			configtx.ReadersPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Readers",
			},
			configtx.WritersPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Writers",
			},
			configtx.AdminsPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Admins",
			},
			configtx.BlockValidationPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Writers",
			},
		},
	}

	var peerOrganizations []*networkspec.ConfigtxOrganization
	peerOrgsPath := paths.PeerOrgsDir(networkConfig.ArtifactsLocation)
	var peerPort uint32 = 31000
	for _, org := range networkConfig.PeerOrganizations {
		anchorPeers := []*networkspec.ConfigtxAnchorPeer{}
		anchorPeer := &networkspec.ConfigtxAnchorPeer{
			Host: fmt.Sprintf("peer0-%s", org.Name),
			Port: int(peerPort),
		}
		anchorPeers = append(anchorPeers, anchorPeer)
		peerOrganization := &networkspec.ConfigtxOrganization{
			Name:   org.Name,
			ID:     org.MSPID,
			MSPDir: paths.JoinPath(peerOrgsPath, fmt.Sprintf("%s/msp/", org.Name)),
			Policies: map[string]*networkspec.ConfigtxPolicy{
				configtx.ReadersPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%[1]s.admin', '%[1]s.peer', '%[1]s.client')", org.MSPID),
				},
				configtx.WritersPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%[1]s.admin', '%[1]s.client')", org.MSPID),
				},
				configtx.AdminsPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%s.admin')", org.MSPID),
				},
				configtx.EndorsementPolicyKey: {
					Type: configtx.SignaturePolicyType,
					Rule: fmt.Sprintf("OR('%s.peer')", org.MSPID),
				},
			},
			AnchorPeers: anchorPeers,
		}
		peerOrganizations = append(peerOrganizations, peerOrganization)
		peerPort = peerPort + uint32(org.NumPeers)
	}

	var application = &networkspec.ConfigtxApplication{
		Organizations: peerOrganizations,
		Capabilities: map[string]bool{
			networkConfig.ApplicationCapabilities: true,
		},
		Policies: map[string]*networkspec.ConfigtxPolicy{
			configtx.ReadersPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Readers",
			},
			configtx.WritersPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Writers",
			},
			configtx.AdminsPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Admins",
			},
			configtx.EndorsementPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Endorsement",
			},
			configtx.LifecycleEndorsementPolicyKey: {
				Type: configtx.ImplicitMetaPolicyType,
				Rule: "ANY Endorsement",
			},
		},
	}

	configtxConfiguration = ConfigtxConfiguration{
		Profiles: map[string]*networkspec.ConfigtxProfile{
			"testOrgsOrdererGenesis": {
				Consortiums: map[string]*networkspec.ConfigtxConsortium{
					"FabricConsortium": {
						Organizations: peerOrganizations,
					},
				},
				Orderer: orderer,
				Capabilities: map[string]bool{
					networkConfig.ChannelCapabilities: true,
				},
				Policies: map[string]*networkspec.ConfigtxPolicy{
					configtx.ReadersPolicyKey: {
						Type: configtx.ImplicitMetaPolicyType,
						Rule: "ANY Readers",
					},
					configtx.WritersPolicyKey: {
						Type: configtx.ImplicitMetaPolicyType,
						Rule: "ANY Writers",
					},
					configtx.AdminsPolicyKey: {
						Type: configtx.ImplicitMetaPolicyType,
						Rule: "ANY Admins",
					},
				},
			},
			"testorgschannel": {
				Consortium:  "FabricConsortium",
				Application: application,
				Orderer:     orderer,
				Capabilities: map[string]bool{
					networkConfig.ChannelCapabilities: true,
				},
				Policies: map[string]*networkspec.ConfigtxPolicy{
					configtx.ReadersPolicyKey: {
						Type: configtx.ImplicitMetaPolicyType,
						Rule: "ANY Readers",
					},
					configtx.WritersPolicyKey: {
						Type: configtx.ImplicitMetaPolicyType,
						Rule: "ANY Writers",
					},
					configtx.AdminsPolicyKey: {
						Type: configtx.ImplicitMetaPolicyType,
						Rule: "ANY Admins",
					},
				},
			},
		},
	}
	return configtxConfiguration.Profiles[profile]
}

// The ProviderType of a member relative to the member API
const (
	FABRIC ProviderType = iota

	cacerts              = "cacerts"
	admincerts           = "admincerts"
	signcerts            = "signcerts"
	keystore             = "keystore"
	intermediatecerts    = "intermediatecerts"
	crlsfolder           = "crls"
	configfilename       = "config.yaml"
	tlscacerts           = "tlscacerts"
	tlsintermediatecerts = "tlsintermediatecerts"
)

func convertToUint(size string) uint32 {

	var sizeToInt int
	size = strings.Trim(size, " MB")
	sizeToInt, _ = strconv.Atoi(size)
	return uint32(sizeToInt * 1024 * 1024)
}

func doOutputBlock(config *networkspec.ConfigtxProfile, channelID string, outputBlock string) error {

	channel, err := newChannel(config)
	if err != nil {
		return fmt.Errorf("Error constructing channel for genesis block: %s", err)
	}
	genesisBlock, err := configtx.NewSystemChannelGenesisBlock(channel, "orderersystemchannel")
	if err != nil {
		return fmt.Errorf("Error creating genesis block: %s", err)
	}
	logger.INFO("Writing genesis block")
	err = writeFile(outputBlock, protoutil.MarshalOrPanic(genesisBlock), 0640)
	if err != nil {
		return fmt.Errorf("Error writing genesis block: %s", err)
	}
	return nil
}

func doOutputChannelCreateTx(config *networkspec.ConfigtxProfile, channelID string, outputChannelCreateTx string) error {

	channel, err := newChannel(config)
	if err != nil {
		return fmt.Errorf("Error constructing channel: %s", err)
	}
	configUpdate, err := configtx.NewMarshaledCreateChannelTx(channel, channelID)
	if err != nil {
		return fmt.Errorf("Error creating config update: %s", err)
	}
	env, err := configtx.NewEnvelope(configUpdate)
	if err != nil {
		return fmt.Errorf("Error creating new envelope: %s", err)
	}
	logger.INFO("Writing new channel tx")
	err = writeFile(outputChannelCreateTx, protoutil.MarshalOrPanic(env), 0640)
	if err != nil {
		return fmt.Errorf("Error writing channel create tx: %s", err)
	}
	return nil
}

func doOutputAnchorPeersUpdate(config *networkspec.ConfigtxProfile, channelID, outputAnchorPeersUpdateTx, orgName, cryptoConfigPath string) error {

	for i, org := range config.Application.Organizations {
		if org.Name == orgName {
			mspConfig, err := getMspConfig(org.MSPDir, org.ID)
			if err != nil {
				return fmt.Errorf("Error while getMspConfig in Anchor Peer Update: %s", err)
			}
			txmsp, err := getMSPConfig(mspConfig)
			if err != nil {
				return fmt.Errorf("Error while getMSPConfig in Anchor Peer Update: %s", err)
			}
			marshaledTxMSP, err := json.Marshal(txmsp)
			if err != nil {
				return fmt.Errorf("Error while marshaling msps in Anchor Peer Update: %s", err)
			}
			bs, _ := json.Marshal(config.Application.Organizations[i].Policies)
			b := new(cb.ConfigPolicy)
			err = json.Unmarshal(bs, b)
			anchorPeerConfig := &cb.Config{
				ChannelGroup: &cb.ConfigGroup{
					Groups: map[string]*cb.ConfigGroup{
						"Application": {
							Version: 1,
							Groups: map[string]*cb.ConfigGroup{
								fmt.Sprintf("%s", org.Name): {
									ModPolicy: configtx.AdminsPolicyKey,
									Values: map[string]*cb.ConfigValue{
										configtx.MSPKey: {
											ModPolicy: configtx.AdminsPolicyKey,
											Value: marshalOrPanic(&mb.MSPConfig{
												Config: marshaledTxMSP,
											}),
										},
									},
									Policies: map[string]*cb.ConfigPolicy{
										configtx.AdminsPolicyKey: {
											ModPolicy: configtx.AdminsPolicyKey,
											Policy: &cb.Policy{
												Type: 3,
												Value: marshalOrPanic(&cb.ImplicitMetaPolicy{
													Rule:      cb.ImplicitMetaPolicy_ANY,
													SubPolicy: configtx.AdminsPolicyKey,
												}),
											},
										},
										configtx.ReadersPolicyKey: {
											ModPolicy: configtx.AdminsPolicyKey,
											Policy: &cb.Policy{
												Type: 3,
												Value: marshalOrPanic(&cb.ImplicitMetaPolicy{
													Rule:      cb.ImplicitMetaPolicy_ANY,
													SubPolicy: configtx.ReadersPolicyKey,
												}),
											},
										},
										configtx.WritersPolicyKey: {
											ModPolicy: configtx.AdminsPolicyKey,
											Policy: &cb.Policy{
												Type: 3,
												Value: marshalOrPanic(&cb.ImplicitMetaPolicy{
													Rule:      cb.ImplicitMetaPolicy_ANY,
													SubPolicy: configtx.WritersPolicyKey,
												}),
											},
										},
										configtx.EndorsementPolicyKey: {
											ModPolicy: configtx.AdminsPolicyKey,
											Policy: &cb.Policy{
												Type: 3,
												Value: marshalOrPanic(&cb.ImplicitMetaPolicy{
													Rule:      cb.ImplicitMetaPolicy_ANY,
													SubPolicy: configtx.AdminsPolicyKey,
												}),
											},
										},
									},
								},
							},
						},
					},
				},
			}
			c := configtx.New(anchorPeerConfig)
			anchorPeer := configtx.Address{
				Host: config.Application.Organizations[i].AnchorPeers[0].Host,
				Port: config.Application.Organizations[i].AnchorPeers[0].Port,
			}
			err = c.Application().Organization(org.Name).AddAnchorPeer(anchorPeer)
			if err != nil {
				return fmt.Errorf("Error while adding anchor peer in Anchor Peer Update: %s", err)
			}
			configUpdate, err := c.ComputeMarshaledUpdate(channelID)
			if err != nil {
				return fmt.Errorf("Error creating config update: %s", err)
			}

			pathToSigningIdentity := fmt.Sprintf("%[1]s/peerOrganizations/%[2]s/users/Admin@%[2]s/", cryptoConfigPath, orgName)
			pathToEnvelopeSigningIdentity := fmt.Sprintf("%[1]s/peerOrganizations/%[2]s/users/Admin@%[2]s/", cryptoConfigPath, orgName)
			signingIdentity, err := getSigningIdentity(pathToSigningIdentity)
			if err != nil {
				return fmt.Errorf("Error while signing envelope in Anchor Peer Update: %s", err)
			}
			configSignature, err := signingIdentity.CreateConfigSignature(configUpdate)
			if err != nil {
				return fmt.Errorf("Error while signing config update in Anchor Peer Update: %s", err)
			}
			env, err := configtx.NewEnvelope(configUpdate, configSignature)
			if err != nil {
				return fmt.Errorf("Error while creating envelope in Anchor Peer Update: %s", err)
			}
			envelopeSigningIdentity, err := getSigningIdentity(pathToEnvelopeSigningIdentity)
			if err != nil {
				return fmt.Errorf("Error while signing envelope in Anchor Peer Update: %s", err)
			}
			err = envelopeSigningIdentity.SignEnvelope(env)
			if err != nil {
				return fmt.Errorf("Error while signing envelope in Anchor Peer Update: %s", err)
			}
			logger.INFO("Writing new anchor peer update tx")
			err = writeFile(outputAnchorPeersUpdateTx, protoutil.MarshalOrPanic(env), 0640)
			if err != nil {
				return fmt.Errorf("Error writing channel anchor peer update tx: %s", err)
			}
		}
	}
	return nil
}

func marshalOrPanic(pb proto.Message) []byte {

	data, err := proto.Marshal(pb)
	if err != nil {
		logger.ERROR("Error while marshalling message")
	}

	return data
}

func getSigningIdentity(sigIDPath string) (configtx.SigningIdentity, error) {

	var (
		signingIdentity configtx.SigningIdentity
		certificate     *x509.Certificate
		privKey         crypto.PrivateKey
		mspID           string
		err             error
	)
	parentDir := filepath.Dir(sigIDPath)
	mspUser := filepath.Base(parentDir)
	certBytes, err := ioutil.ReadFile(filepath.Join(sigIDPath, "msp/signcerts", fmt.Sprintf("%s-cert.pem", mspUser)))
	if err != nil {
		return signingIdentity, fmt.Errorf("Error in reading certificate: %s", err)
	}
	pemBlock, _ := pem.Decode(certBytes)
	certificate, err = x509.ParseCertificate(pemBlock.Bytes)
	if pemBlock == nil {
		return signingIdentity, fmt.Errorf("no PEM data found in cert[% x]", certBytes)
	}
	privKeyBytes, err := ioutil.ReadFile(filepath.Join(sigIDPath, "msp/keystore", "priv_sk"))
	pemBlock, _ = pem.Decode(privKeyBytes)
	if pemBlock == nil {
		return signingIdentity, fmt.Errorf("no PEM data found in private key[% x]", privKeyBytes)
	}
	privKey, err = x509.ParsePKCS8PrivateKey(pemBlock.Bytes)
	if err != nil {
		return signingIdentity, fmt.Errorf("failed parsing PKCS#8 private key: %v", err)
	}
	mspID = strings.Split(mspUser, "@")[1]
	return configtx.SigningIdentity{
		Certificate: certificate,
		PrivateKey:  privKey,
		MSPID:       mspID,
	}, nil
}

func writeFile(filename string, data []byte, perm os.FileMode) error {

	dirPath := filepath.Dir(filename)
	exists, err := dirExists(dirPath)
	if err != nil {
		return err
	}
	if !exists {
		err = os.MkdirAll(dirPath, 0750)
		if err != nil {
			return err
		}
	}
	return ioutil.WriteFile(filename, data, perm)
}

func dirExists(path string) (bool, error) {

	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func newChannel(baseProfile *networkspec.ConfigtxProfile) (configtx.Channel, error) {

	var channel configtx.Channel
	// Application section
	var application configtx.Application
	if baseProfile.Application != nil {
		appOrgs, err := newOrganization(baseProfile.Application.Organizations)
		if err != nil {
			return channel, err
		}
		var appCapabilities []string
		for name := range baseProfile.Application.Capabilities {
			appCapabilities = append(appCapabilities, name)
		}
		appPolicies := newPolicies(baseProfile.Application.Policies)
		application = configtx.Application{
			Organizations: appOrgs,
			Capabilities:  appCapabilities,
			Policies:      appPolicies,
			ACLs:          baseProfile.Application.ACLs,
		}
	}

	// Orderer section
	var o configtx.Orderer
	if baseProfile.Orderer != nil {
		kafka := orderer.Kafka{
			Brokers: baseProfile.Orderer.Kafka.Brokers,
		}
		var consentors []orderer.Consenter
		if baseProfile.Orderer.OrdererType == networkspec.EtcdRaft {
			for _, consenter := range baseProfile.Orderer.EtcdRaft.Consenters {
				clientCert, err := parseCertificateFromBytes(consenter.ClientTlsCert)
				if err != nil {
					return channel, err
				}
				serverCert, err := parseCertificateFromBytes(consenter.ServerTlsCert)
				if err != nil {
					return channel, err
				}
				consentors = append(consentors, orderer.Consenter{
					Address: orderer.EtcdAddress{
						Host: consenter.Host,
						Port: int(consenter.Port),
					},
					ClientTLSCert: clientCert,
					ServerTLSCert: serverCert,
				})
			}

		}
		etcdRaft := orderer.EtcdRaft{
			Consenters: consentors,
			Options: orderer.EtcdRaftOptions{
				TickInterval:         baseProfile.Orderer.EtcdRaft.Options.TickInterval,
				ElectionTick:         baseProfile.Orderer.EtcdRaft.Options.ElectionTick,
				HeartbeatTick:        baseProfile.Orderer.EtcdRaft.Options.HeartbeatTick,
				MaxInflightBlocks:    baseProfile.Orderer.EtcdRaft.Options.MaxInflightBlocks,
				SnapshotIntervalSize: baseProfile.Orderer.EtcdRaft.Options.SnapshotIntervalSize,
			},
		}
		var ordererCapabilities []string
		for name := range baseProfile.Orderer.Capabilities {
			ordererCapabilities = append(ordererCapabilities, name)
		}

		ordererOrgs, err := newOrganization(baseProfile.Orderer.Organizations)
		if err != nil {
			return channel, err
		}

		o = configtx.Orderer{
			OrdererType:  baseProfile.Orderer.OrdererType,
			BatchTimeout: baseProfile.Orderer.BatchTimeout,
			BatchSize: orderer.BatchSize{
				MaxMessageCount:   baseProfile.Orderer.BatchSize.MaxMessageCount,
				AbsoluteMaxBytes:  baseProfile.Orderer.BatchSize.AbsoluteMaxBytes,
				PreferredMaxBytes: baseProfile.Orderer.BatchSize.PreferredMaxBytes,
			},
			Kafka:         kafka,
			EtcdRaft:      etcdRaft,
			MaxChannels:   baseProfile.Orderer.MaxChannels,
			Capabilities:  ordererCapabilities,
			Organizations: ordererOrgs,
			Policies:      newPolicies(baseProfile.Orderer.Policies),
			State:         orderer.ConsensusStateNormal,
		}
	}
	// Consortiums section
	var consortiums []configtx.Consortium
	if baseProfile.Consortiums != nil {
		for name, c := range baseProfile.Consortiums {
			organizations, err := newOrganization(c.Organizations)
			if err != nil {
				return channel, err
			}
			consortiums = append(consortiums, configtx.Consortium{
				Name:          name,
				Organizations: organizations,
			})
		}
	}
	// Capabilities section
	var channelCapabilities []string
	if baseProfile.Capabilities != nil {
		for name := range baseProfile.Capabilities {
			channelCapabilities = append(channelCapabilities, name)
		}
	}
	channel = configtx.Channel{
		Consortium:   baseProfile.Consortium,
		Application:  application,
		Orderer:      o,
		Consortiums:  consortiums,
		Capabilities: channelCapabilities,
		Policies:     newPolicies(baseProfile.Policies),
	}
	return channel, nil
}

func parseCertificateFromBytes(cert []byte) (*x509.Certificate, error) {

	pemBlock, _ := pem.Decode(cert)
	certificate, err := x509.ParseCertificate(pemBlock.Bytes)
	if err != nil {
		return &x509.Certificate{}, err
	}
	return certificate, nil
}

func newOrganization(orgs []*networkspec.ConfigtxOrganization) ([]configtx.Organization, error) {

	var txorgs []configtx.Organization
	for _, org := range orgs {
		var anchorPeers []configtx.Address
		for _, peer := range org.AnchorPeers {
			anchorPeers = append(anchorPeers, configtx.Address{
				Host: peer.Host,
				Port: peer.Port,
			})
		}
		mspConfig, err := getMspConfig(org.MSPDir, org.ID)
		if err != nil {
			return txorgs, err
		}
		txmsp, err := getMSPConfig(mspConfig)
		if err != nil {
			return txorgs, err
		}
		txorgs = append(txorgs, configtx.Organization{
			Name:             org.Name,
			MSP:              txmsp,
			Policies:         newPolicies(org.Policies),
			AnchorPeers:      anchorPeers,
			OrdererEndpoints: org.OrdererEndpoints,
		})
	}

	return txorgs, nil
}

func parseCertificateListFromBytes(certs [][]byte) ([]*x509.Certificate, error) {

	var certificateList []*x509.Certificate

	for _, cert := range certs {
		certificate, err := parseCertificateFromBytes(cert)
		if err != nil {
			return certificateList, err
		}
		certificateList = append(certificateList, certificate)
	}
	return certificateList, nil
}

func parseCRL(crls [][]byte) ([]*pkix.CertificateList, error) {

	var certificateLists []*pkix.CertificateList
	for _, crl := range crls {
		pemBlock, _ := pem.Decode(crl)
		certificateList, err := x509.ParseCRL(pemBlock.Bytes)
		if err != nil {
			return certificateLists, fmt.Errorf("parsing crl: %v", err)
		}
		certificateLists = append(certificateLists, certificateList)
	}
	return certificateLists, nil
}

func parsePrivateKeyFromBytes(priv []byte) (crypto.PrivateKey, error) {

	if len(priv) == 0 {
		return nil, nil
	}
	pemBlock, _ := pem.Decode(priv)
	privateKey, err := x509.ParsePKCS8PrivateKey(pemBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed parsing PKCS#8 private key: %v", err)
	}
	return privateKey, nil
}

func parseOUIdentifiers(identifiers []*msp.FabricOUIdentifier) ([]membership.OUIdentifier, error) {

	var fabricIdentifiers []membership.OUIdentifier
	for _, identifier := range identifiers {
		cert, err := parseCertificateFromBytes(identifier.Certificate)
		if err != nil {
			return fabricIdentifiers, err
		}
		fabricOUIdentifier := membership.OUIdentifier{
			Certificate:                  cert,
			OrganizationalUnitIdentifier: identifier.OrganizationalUnitIdentifier,
		}
		fabricIdentifiers = append(fabricIdentifiers, fabricOUIdentifier)
	}
	return fabricIdentifiers, nil
}

func getMSPConfig(config *msp.MSPConfig) (configtx.MSP, error) {

	fabricMSPConfig := &msp.FabricMSPConfig{}

	err := proto.Unmarshal(config.Config, fabricMSPConfig)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("unmarshaling fabric msp config: %v", err)
	}

	// ROOT CERTS
	rootCerts, err := parseCertificateListFromBytes(fabricMSPConfig.RootCerts)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("parsing root certs: %v", err)
	}

	// INTERMEDIATE CERTS
	intermediateCerts, err := parseCertificateListFromBytes(fabricMSPConfig.IntermediateCerts)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("parsing intermediate certs: %v", err)
	}

	// ADMIN CERTS
	adminCerts, err := parseCertificateListFromBytes(fabricMSPConfig.Admins)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("parsing admin certs: %v", err)
	}

	// REVOCATION LIST
	revocationList, err := parseCRL(fabricMSPConfig.RevocationList)
	if err != nil {
		return configtx.MSP{}, err
	}

	// OU IDENTIFIERS
	ouIdentifiers, err := parseOUIdentifiers(fabricMSPConfig.OrganizationalUnitIdentifiers)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("parsing ou identifiers: %v", err)
	}

	// TLS ROOT CERTS
	tlsRootCerts, err := parseCertificateListFromBytes(fabricMSPConfig.TlsRootCerts)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("parsing tls root certs: %v", err)
	}

	// TLS INTERMEDIATE CERTS
	tlsIntermediateCerts, err := parseCertificateListFromBytes(fabricMSPConfig.TlsIntermediateCerts)
	if err != nil {
		return configtx.MSP{}, fmt.Errorf("parsing tls intermediate certs: %v", err)
	}

	// NODE OUS
	var (
		clientOUIdentifierCert  *x509.Certificate
		peerOUIdentifierCert    *x509.Certificate
		adminOUIdentifierCert   *x509.Certificate
		ordererOUIdentifierCert *x509.Certificate
		nodeOUs                 membership.NodeOUs
	)
	if fabricMSPConfig.FabricNodeOus != nil {
		clientOUIdentifierCert, err = parseCertificateFromBytes(fabricMSPConfig.FabricNodeOus.ClientOuIdentifier.Certificate)
		if err != nil {
			return configtx.MSP{}, fmt.Errorf("parsing client ou identifier cert: %v", err)
		}

		peerOUIdentifierCert, err = parseCertificateFromBytes(fabricMSPConfig.FabricNodeOus.PeerOuIdentifier.Certificate)
		if err != nil {
			return configtx.MSP{}, fmt.Errorf("parsing peer ou identifier cert: %v", err)
		}

		adminOUIdentifierCert, err = parseCertificateFromBytes(fabricMSPConfig.FabricNodeOus.AdminOuIdentifier.Certificate)
		if err != nil {
			return configtx.MSP{}, fmt.Errorf("parsing admin ou identifier cert: %v", err)
		}

		ordererOUIdentifierCert, err = parseCertificateFromBytes(fabricMSPConfig.FabricNodeOus.OrdererOuIdentifier.Certificate)
		if err != nil {
			return configtx.MSP{}, fmt.Errorf("parsing orderer ou identifier cert: %v", err)
		}

		nodeOUs = membership.NodeOUs{
			Enable: fabricMSPConfig.FabricNodeOus.Enable,
			ClientOUIdentifier: membership.OUIdentifier{
				Certificate:                  clientOUIdentifierCert,
				OrganizationalUnitIdentifier: fabricMSPConfig.FabricNodeOus.ClientOuIdentifier.OrganizationalUnitIdentifier,
			},
			PeerOUIdentifier: membership.OUIdentifier{
				Certificate:                  peerOUIdentifierCert,
				OrganizationalUnitIdentifier: fabricMSPConfig.FabricNodeOus.PeerOuIdentifier.OrganizationalUnitIdentifier,
			},
			AdminOUIdentifier: membership.OUIdentifier{
				Certificate:                  adminOUIdentifierCert,
				OrganizationalUnitIdentifier: fabricMSPConfig.FabricNodeOus.AdminOuIdentifier.OrganizationalUnitIdentifier,
			},
			OrdererOUIdentifier: membership.OUIdentifier{
				Certificate:                  ordererOUIdentifierCert,
				OrganizationalUnitIdentifier: fabricMSPConfig.FabricNodeOus.OrdererOuIdentifier.OrganizationalUnitIdentifier,
			},
		}
	}

	return configtx.MSP{
		Name:                          fabricMSPConfig.Name,
		RootCerts:                     rootCerts,
		IntermediateCerts:             intermediateCerts,
		Admins:                        adminCerts,
		RevocationList:                revocationList,
		OrganizationalUnitIdentifiers: ouIdentifiers,
		CryptoConfig: membership.CryptoConfig{
			SignatureHashFamily:            fabricMSPConfig.CryptoConfig.SignatureHashFamily,
			IdentityIdentifierHashFunction: fabricMSPConfig.CryptoConfig.IdentityIdentifierHashFunction,
		},
		TLSRootCerts:         tlsRootCerts,
		TLSIntermediateCerts: tlsIntermediateCerts,
		NodeOUs:              nodeOUs,
	}, nil
}

func getMspConfig(dir string, ID string) (*msp.MSPConfig, error) {

	cacertDir := filepath.Join(dir, cacerts)
	admincertDir := filepath.Join(dir, admincerts)
	intermediatecertsDir := filepath.Join(dir, intermediatecerts)
	crlsDir := filepath.Join(dir, crlsfolder)
	configFile := filepath.Join(dir, configfilename)
	tlscacertDir := filepath.Join(dir, tlscacerts)
	tlsintermediatecertsDir := filepath.Join(dir, tlsintermediatecerts)

	cacerts, err := getPemMaterialFromDir(cacertDir)
	if err != nil || len(cacerts) == 0 {
		return nil, fmt.Errorf("Could not load a valid ca certificate from directory %s with error %v", cacertDir, err)
	}

	admincert, err := getPemMaterialFromDir(admincertDir)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("Could not load a valid admin certificate from directory %s with error %v", admincertDir, err)
	}

	intermediatecerts, err := getPemMaterialFromDir(intermediatecertsDir)
	if !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed loading intermediate ca certs at [%s] with error %v", intermediatecertsDir, err)
	}

	tlsCACerts, err := getPemMaterialFromDir(tlscacertDir)
	tlsIntermediateCerts := [][]byte{}
	if os.IsNotExist(err) {
	} else if err != nil {
		return nil, fmt.Errorf("failed loading TLS ca certs at [%s] with error %v", tlsintermediatecertsDir, err)
	} else if len(tlsCACerts) != 0 {
		tlsIntermediateCerts, err = getPemMaterialFromDir(tlsintermediatecertsDir)
		if os.IsNotExist(err) {
		} else if err != nil {
			return nil, fmt.Errorf("failed loading TLS intermediate ca certs at [%s] with error %v", tlsintermediatecertsDir, err)
		}
	} else {
	}
	crls, err := getPemMaterialFromDir(crlsDir)
	if os.IsNotExist(err) {
	} else if err != nil {
		return nil, fmt.Errorf("failed loading crls at [%s] with error %v", crlsDir, err)
	}
	// Load configuration file
	// if the configuration file is there then load it
	// otherwise skip it
	var ouis []*msp.FabricOUIdentifier
	var nodeOUs *msp.FabricNodeOUs
	_, err = os.Stat(configFile)
	if err == nil {
		// load the file, if there is a failure in loading it then
		// return an error
		raw, err := ioutil.ReadFile(configFile)
		if err != nil {
			return nil, fmt.Errorf("failed loading configuration file at [%s] with error %v", configFile, err)
		}
		configuration := mspConfigBuilder.Configuration{}
		err = yaml.Unmarshal(raw, &configuration)
		if err != nil {
			return nil, fmt.Errorf("failed unmarshalling configuration file at [%s] with error %v", configFile, err)
		}
		// Prepare OrganizationalUnitIdentifiers
		if len(configuration.OrganizationalUnitIdentifiers) > 0 {
			for _, ouID := range configuration.OrganizationalUnitIdentifiers {
				f := filepath.Join(dir, ouID.Certificate)
				raw, err = readFile(f)
				if err != nil {
					return nil, fmt.Errorf("failed loading OrganizationalUnit certificate at [%s] with error %v", f, err)
				}
				oui := &msp.FabricOUIdentifier{
					Certificate:                  raw,
					OrganizationalUnitIdentifier: ouID.OrganizationalUnitIdentifier,
				}
				ouis = append(ouis, oui)
			}
		}
		// Prepare NodeOUs
		if configuration.NodeOUs != nil && configuration.NodeOUs.Enable {
			nodeOUs = &msp.FabricNodeOUs{
				Enable: true,
			}
			if configuration.NodeOUs.ClientOUIdentifier != nil && len(configuration.NodeOUs.ClientOUIdentifier.OrganizationalUnitIdentifier) != 0 {
				nodeOUs.ClientOuIdentifier = &msp.FabricOUIdentifier{OrganizationalUnitIdentifier: configuration.NodeOUs.ClientOUIdentifier.OrganizationalUnitIdentifier}
			}
			if configuration.NodeOUs.PeerOUIdentifier != nil && len(configuration.NodeOUs.PeerOUIdentifier.OrganizationalUnitIdentifier) != 0 {
				nodeOUs.PeerOuIdentifier = &msp.FabricOUIdentifier{OrganizationalUnitIdentifier: configuration.NodeOUs.PeerOUIdentifier.OrganizationalUnitIdentifier}
			}
			if configuration.NodeOUs.AdminOUIdentifier != nil && len(configuration.NodeOUs.AdminOUIdentifier.OrganizationalUnitIdentifier) != 0 {
				nodeOUs.AdminOuIdentifier = &msp.FabricOUIdentifier{OrganizationalUnitIdentifier: configuration.NodeOUs.AdminOUIdentifier.OrganizationalUnitIdentifier}
			}
			if configuration.NodeOUs.OrdererOUIdentifier != nil && len(configuration.NodeOUs.OrdererOUIdentifier.OrganizationalUnitIdentifier) != 0 {
				nodeOUs.OrdererOuIdentifier = &msp.FabricOUIdentifier{OrganizationalUnitIdentifier: configuration.NodeOUs.OrdererOUIdentifier.OrganizationalUnitIdentifier}
			}
			// Read certificates, if defined
			// ClientOU
			if nodeOUs.ClientOuIdentifier != nil {
				nodeOUs.ClientOuIdentifier.Certificate = loadCertificateAt(dir, configuration.NodeOUs.ClientOUIdentifier.Certificate, "ClientOU")
			}
			// PeerOU
			if nodeOUs.PeerOuIdentifier != nil {
				nodeOUs.PeerOuIdentifier.Certificate = loadCertificateAt(dir, configuration.NodeOUs.PeerOUIdentifier.Certificate, "PeerOU")
			}
			// AdminOU
			if nodeOUs.AdminOuIdentifier != nil {
				nodeOUs.AdminOuIdentifier.Certificate = loadCertificateAt(dir, configuration.NodeOUs.AdminOUIdentifier.Certificate, "AdminOU")
			}
			// OrdererOU
			if nodeOUs.OrdererOuIdentifier != nil {
				nodeOUs.OrdererOuIdentifier.Certificate = loadCertificateAt(dir, configuration.NodeOUs.OrdererOUIdentifier.Certificate, "OrdererOU")
			}
		}
	}
	// Set FabricCryptoConfig
	cryptoConfig := &msp.FabricCryptoConfig{
		SignatureHashFamily:            bccsp.SHA2,
		IdentityIdentifierHashFunction: bccsp.SHA256,
	}
	// Compose FabricMSPConfig
	fmspconf := &msp.FabricMSPConfig{
		Admins:                        admincert,
		RootCerts:                     cacerts,
		IntermediateCerts:             intermediatecerts,
		Name:                          ID,
		OrganizationalUnitIdentifiers: ouis,
		RevocationList:                crls,
		CryptoConfig:                  cryptoConfig,
		TlsRootCerts:                  tlsCACerts,
		TlsIntermediateCerts:          tlsIntermediateCerts,
		FabricNodeOus:                 nodeOUs,
	}
	fmpsjs, _ := proto.Marshal(fmspconf)
	mspconf := &msp.MSPConfig{Config: fmpsjs, Type: int32(FABRIC)}
	return mspconf, nil
}

func loadCertificateAt(dir, certificatePath string, ouType string) []byte {

	f := filepath.Join(dir, certificatePath)
	raw, err := readFile(f)
	if err != nil {
	} else {
		return raw
	}
	return nil
}

func readFile(file string) ([]byte, error) {

	fileCont, err := ioutil.ReadFile(file)
	if err != nil {
		return nil, fmt.Errorf("could not read file %s with error %v", file, err)
	}
	return fileCont, nil
}

func readPemFile(file string) ([]byte, error) {

	bytes, err := readFile(file)
	if err != nil {
		return nil, fmt.Errorf("reading from file %s failed with error %v", file, err)
	}
	b, _ := pem.Decode(bytes)
	if b == nil {
		return nil, fmt.Errorf("no pem content for file %s", file)
	}
	return bytes, nil
}

func getPemMaterialFromDir(dir string) ([][]byte, error) {

	_, err := os.Stat(dir)
	if os.IsNotExist(err) {
		return nil, err
	}
	content := make([][]byte, 0)
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("could not read directory %s with error %v", dir, err)
	}
	for _, f := range files {
		fullName := filepath.Join(dir, f.Name())
		f, err := os.Stat(fullName)
		if err != nil {
			continue
		}
		if f.IsDir() {
			continue
		}
		item, err := readPemFile(fullName)
		if err != nil {
			continue
		}
		content = append(content, item)
	}
	return content, nil
}

func newPolicies(policies map[string]*networkspec.ConfigtxPolicy) map[string]configtx.Policy {

	txpolicies := map[string]configtx.Policy{}
	for name, policy := range policies {
		if name == "blockvalidation" {
			name = "blockValidation"
		}
		txpolicies[strings.Title(name)] = configtx.Policy{
			Type: policy.Type,
			Rule: policy.Rule,
		}
	}
	return txpolicies
}

// CreateConfigtx --
func CreateConfigtx(config *Configtxgen, networkConfig networkspec.Config) error {

	logger.INFO("Loading configuration")
	err := factory.InitFactories(nil)
	if err != nil {
		return fmt.Errorf("Error on initFactories: %v", err)
	}
	var profileConfig *networkspec.ConfigtxProfile
	if config.OutputPath != "" || config.OutputChannelCreateTx != "" || config.OutputAnchorPeersUpdate != "" {
		if config.Profile == "" {
			return fmt.Errorf("The '-profile' is required when '-outputBlock', '-outputChannelCreateTx', or '-outputAnchorPeersUpdate' is specified")
		}
		profileConfig = GenerateConfigtxConfiguration(config.Profile, networkConfig)
	}
	if config.OutputPath != "" {
		if err := doOutputBlock(profileConfig, config.ChannelID, config.OutputPath); err != nil {
			return fmt.Errorf("Error on outputBlock: %v", err)
		}
	}
	if config.OutputChannelCreateTx != "" {
		if err := doOutputChannelCreateTx(profileConfig, config.ChannelID, config.OutputChannelCreateTx); err != nil {
			return fmt.Errorf("Error on outputChannelCreateTx: %v", err)
		}
	}
	if config.OutputAnchorPeersUpdate != "" {
		if err := doOutputAnchorPeersUpdate(profileConfig, config.ChannelID, config.OutputAnchorPeersUpdate, config.OrgName, config.ArtifactsLocation); err != nil {
			return fmt.Errorf("Error on outputChannelCreateTx: %v", err)
		}
	}
	return nil
}
