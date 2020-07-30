// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package networkspec

import (
	"time"

	"github.com/hyperledger/fabric-protos-go/orderer/etcdraft"
	corev1 "k8s.io/api/core/v1"
)

//Config --
type Config struct {
	DockerOrg    string `yaml:"dockerOrg,omitempty"`
	DockerTag    string `yaml:"dockerTag,omitempty"`
	DockerImages struct {
		Ca      string `yaml:"ca,omitempty"`
		Peer    string `yaml:"peer,omitempty"`
		Orderer string `yaml:"orderer,omitempty"`
		Baseos  string `yaml:"baseos,omitempty"`
		Ccenv   string `yaml:"ccenv,omitempty"`
		Javaenv string `yaml:"javaenv,omitempty"`
		Nodeenv string `yaml:"nodeenv,omitempty"`
	} `yaml:"dockerImages,omitempty"`
	DBType                   string                 `yaml:"dbType,omitempty"`
	PeerFabricLoggingSpec    string                 `yaml:"peerFabricLoggingSpec,omitempty"`
	OrdererFabricLoggingSpec string                 `yaml:"ordererFabricLoggingSpec,omitempty"`
	ArtifactsLocation        string                 `yaml:"artifactsLocation,omitempty"`
	OrdererOrganizations     []OrdererOrganizations `yaml:"ordererOrganizations,omitempty"`
	PeerOrganizations        []PeerOrganizations    `yaml:"peerOrganizations,omitempty"`
	AddPeersToOrganization   []PeerOrganizations    `yaml:"addPeer,omitempty"`
	Orderer                  struct {
		OrdererType string `yaml:"ordererType,omitempty"`
		BatchSize   struct {
			MaxMessageCount   uint32 `yaml:"maxMessageCount,omitempty"`
			AbsoluteMaxBytes  string `yaml:"absoluteMaxBytes,omitempty"`
			PreferredMaxBytes string `yaml:"preferredMaxBytes,omitempty"`
		} `yaml:"batchSize,omitempty"`
		BatchTimeOut    time.Duration `yaml:"batchTimeOut,omitempty"`
		EtcdraftOptions struct {
			TickInterval         string `yaml:"tickInterval,omitempty"`
			ElectionTick         uint32 `yaml:"electionTick,omitempty"`
			HeartbeatTick        uint32 `yaml:"heartbeatTick,omitempty"`
			MaxInflightBlocks    uint32 `yaml:"maxInflightBlocks,omitempty"`
			SnapshotIntervalSize string `yaml:"snapshotIntervalSize,omitempty"`
		} `yaml:"etcdraftOptions,omitempty"`
	} `yaml:"orderer,omitempty"`
	NumChannels             int           `yaml:"numChannels,omitempty"`
	ChannelPrefix           string        `yaml:"channelPrefix,omitempty"`
	ChaincodeIDs            []ChaincodeID `yaml:"chaincodeIDs,omitempty"`
	TLS                     string        `yaml:"tls,omitempty"`
	Metrics                 bool          `yaml:"metrics,omitempty"`
	GossipEnable            bool          `yaml:"gossipEnable,omitempty"`
	EnableNodeOUs           bool          `yaml:"enableNodeOUs,omitempty"`
	OrdererCapabilities     string        `yaml:"ordererCapabilities,omitempty"`
	ChannelCapabilities     string        `yaml:"channelCapabilities,omitempty"`
	ApplicationCapabilities string        `yaml:"applicationCapabilities,omitempty"`
	K8s                     struct {
		Namespace       string                              `yaml:"namespace,omitempty"`
		DataPersistence string                              `yaml:"dataPersistence,omitempty"`
		ServiceType     string                              `yaml:"serviceType,omitempty"`
		StorageClass    string                              `yaml:"storageClass,omitempty"`
		StorageCapacity string                              `yaml:"storageCapacity,omitempty"`
		AccessMode      []corev1.PersistentVolumeAccessMode `yaml:"accessMode,omitempty"`
		Resources       struct {
			Orderers Resource `yaml:"orderers,omitempty"`
			Peers    Resource `yaml:"peers,omitempty"`
			Dind     Resource `yaml:"dind,omitempty"`
			Couchdb  Resource `yaml:"couchdb,omitempty"`
			Kafka    Resource `yaml:"kafka,omitempty"`
		} `yaml:"resources,omitempty"`
	} `yaml:"k8s,omitempty"`
}

//Resource --
type Resource struct {
	Limits struct {
		CPU    string
		Memory string
	} `yaml:"limits,omitempty"`
	Requests struct {
		CPU    string
		Memory string
	} `yaml:"requests,omitempty"`
}

//OrdererOrganizations --
type OrdererOrganizations struct {
	Name        string `yaml:"name,omitempty"`
	MSPID       string `yaml:"mspId,omitempty"`
	NumOrderers int    `yaml:"numOrderers,omitempty"`
	NumCA       int    `yaml:"numCa,omitempty"`
}

//KafkaConfig --
type KafkaConfig struct {
	NumKafka             int `yaml:"numKafka,omitempty"`
	NumKafkaReplications int `yaml:"numKafkaReplications,omitempty"`
	NumZookeepers        int `yaml:"numZookeepers,omitempty"`
}

//PeerOrganizations --
type PeerOrganizations struct {
	Name     string `yaml:"name,omitempty"`
	MSPID    string `yaml:"mspId,omitempty"`
	NumPeers int    `yaml:"numPeers,omitempty"`
	NumCA    int    `yaml:"numCa,omitempty"`
}

//Orderer --
type Orderer struct {
	MSPID       string `yaml:"mspid"`
	URL         string `yaml:"url"`
	MetricsURL  string `yaml:"metricsURL"`
	GrpcOptions struct {
		SslTarget string `yaml:"ssl-target-name-override"`
	} `yaml:"grpcOptions"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
	AdminCert  string `yaml:"admin_cert"`
	PrivateKey string `yaml:"priv"`
}

//Peer --
type Peer struct {
	URL         string `yaml:"url"`
	MetricsURL  string `yaml:"metricsURL"`
	GrpcOptions struct {
		SslTarget string `yaml:"ssl-target-name-override"`
	} `yaml:"grpcOptions"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
}

//CertificateAuthority --
type CertificateAuthority struct {
	URL        string `yaml:"url"`
	CAName     string `yaml:"caName"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
	HTTPOptions struct {
		Verify bool `yaml:"verify"`
	} `yaml:"httpOptions"`
	Registrar struct {
		EnrollID     string `yaml:"enrollId"`
		EnrollSecret string `yaml:"enrollSecret"`
	} `yaml:"registrar"`
}

//Organization --
type Organization struct {
	Name                   string   `yaml:"name"`
	MSPID                  string   `yaml:"mspid"`
	Peers                  []string `yaml:"peers"`
	CertificateAuthorities []string `yaml:"certificateAuthorities"`
	AdminPrivateKey        struct {
		Pem string `yaml:"pem"`
	} `yaml:"adminPrivateKey"`
	SignedCert struct {
		Pem string `yaml:"pem"`
	} `yaml:"signedCert"`
	AdminCert  string `yaml:"admin_cert"`
	PrivateKey string `yaml:"priv"`
}

//Channel --
type Channel struct {
	Orderers   []string `yaml:"orderers"`
	Peers      []string `yaml:"peers"`
	Chaincodes []string `yaml:"chaincodes"`
}

//Client --
type Client struct {
	Organization string `yaml:"organization"`
	Conenction   struct {
		Timeout struct {
			Peer struct {
				Endorser int `yaml:"endorser"`
				EventHub int `yaml:"eventHub"`
				EventReg int `yaml:"eventReg"`
			} `yaml:"peer"`
			Orderer int `yaml:"orderer"`
		} `yaml:"timeout"`
	} `yaml:"connection"`
}

//ConnectionProfile --
type ConnectionProfile struct {
	Client        Client                          `yaml:"client"`
	Channels      map[string]Channel              `yaml:"channels"`
	Orderers      map[string]Orderer              `yaml:"orderers"`
	Peers         map[string]Peer                 `yaml:"peers"`
	CA            map[string]CertificateAuthority `yaml:"certificateAuthorities"`
	Organizations map[string]Organization         `yaml:"organizations"`
}

//ChaincodeID --
type ChaincodeID struct {
	Id      string `yaml:"id,omitempty"`
	Version string `yaml:"version,omitempty"`
}

// Caliper related struct
//Orderer --
type CaliperOrderer struct {
	URL         string `yaml:"url"`
	GrpcOptions struct {
		SslTarget string `yaml:"ssl-target-name-override"`
	} `yaml:"grpcOptions"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
}

//Peer --
type CaliperPeer struct {
	URL         string `yaml:"url"`
	GrpcOptions struct {
		SslTarget string `yaml:"ssl-target-name-override"`
	} `yaml:"grpcOptions"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
}

//CertificateAuthority --
type CARegistrar struct {
	EnrollID     string `yaml:"enrollId"`
	EnrollSecret string `yaml:"enrollSecret"`
}

type CaliperCertificateAuthority struct {
	URL        string `yaml:"url"`
	CAName     string `yaml:"caName"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
	HTTPOptions struct {
		Verify bool `yaml:"verify"`
	} `yaml:"httpOptions"`
	Registrar []CARegistrar `yaml:"registrar"`
}

//CaliperOrganization --
type CaliperOrganization struct {
	MSPID                  string   `yaml:"mspid"`
	Peers                  []string `yaml:"peers"`
	CertificateAuthorities []string `yaml:"certificateAuthorities"`
	AdminPrivateKey        struct {
		Pem string `yaml:"pem"`
	} `yaml:"adminPrivateKey"`
	SignedCert struct {
		Pem string `yaml:"pem"`
	} `yaml:"signedCert"`
}

//CaliperChannel --
type CaliperChannelPeer struct {
	EventSource bool `yaml:"eventSource"`
}

type CaliperChannelChaincode struct {
	Id      string `yaml:"id"`
	Version string `yaml:"version"`
}

type CaliperChannel struct {
	Created    bool                          `yaml:"created"`
	Orderers   []string                      `yaml:"orderers"`
	Peers      map[string]CaliperChannelPeer `yaml:"peers"`
	Chaincodes []ChaincodeID                 `yaml:"chaincodes"`
}

// caliper --
type Caliper struct {
	Blockchain string `yaml:"blockchain"`
}

//Clients --
type CaliperClient struct {
	Client struct {
		Organization    string `yaml:"organization"`
		CredentialStore struct {
			Path        string `yaml:"path"`
			CryptoStore struct {
				Path string `yaml:"path"`
			} `yaml:"cryptoStore"`
		} `yaml:"credentialStore"`
		ClientPrivateKey struct {
			Pem string `yaml:"pem"`
		} `yaml:"clientPrivateKey"`
		ClientSignedCert struct {
			Pem string `yaml:"pem"`
		} `yaml:"clientSignedCert"`
		Conenction struct {
			Timeout struct {
				Peer struct {
					Endorser int `yaml:"endorser"`
					EventHub int `yaml:"eventHub"`
					EventReg int `yaml:"eventReg"`
				} `yaml:"peer"`
				Orderer int `yaml:"orderer"`
			} `yaml:"timeout"`
		} `yaml:"connection"`
	} `yaml:"client"`
}

//ConnectionProfile --
type CaliperConnectionProfile struct {
	Caliper       Caliper                                `yaml:"caliper"`
	Clients       map[string]CaliperClient               `yaml:"clients"`
	Channels      map[string]CaliperChannel              `yaml:"channels"`
	Orderers      map[string]CaliperOrderer              `yaml:"orderers"`
	Peers         map[string]CaliperPeer                 `yaml:"peers"`
	CA            map[string]CaliperCertificateAuthority `yaml:"certificateAuthorities"`
	Organizations map[string]CaliperOrganization         `yaml:"organizations"`
}

const (
	EtcdRaft = "etcdraft"
)

type ConfigtxProfile struct {
	Consortium   string                         `yaml:"Consortium"`
	Application  *ConfigtxApplication           `yaml:"Application"`
	Orderer      *ConfigtxOrderer               `yaml:"Orderer"`
	Consortiums  map[string]*ConfigtxConsortium `yaml:"Consortiums"`
	Capabilities map[string]bool                `yaml:"Capabilities"`
	Policies     map[string]*ConfigtxPolicy     `yaml:"Policies"`
}

type ConfigtxPolicy struct {
	Type string `yaml:"Type"`
	Rule string `yaml:"Rule"`
}

type ConfigtxConsortium struct {
	Organizations []*ConfigtxOrganization `yaml:"Organizations"`
}

type ConfigtxApplication struct {
	Organizations []*ConfigtxOrganization    `yaml:"Organizations"`
	Capabilities  map[string]bool            `yaml:"Capabilities"`
	Policies      map[string]*ConfigtxPolicy `yaml:"Policies"`
	ACLs          map[string]string          `yaml:"ACLs"`
}

type ConfigtxOrganization struct {
	Name             string                     `yaml:"Name"`
	ID               string                     `yaml:"ID"`
	MSPDir           string                     `yaml:"MSPDir"`
	MSPType          string                     `yaml:"MSPType"`
	Policies         map[string]*ConfigtxPolicy `yaml:"Policies"`
	AnchorPeers      []*ConfigtxAnchorPeer      `yaml:"AnchorPeers"`
	OrdererEndpoints []string                   `yaml:"OrdererEndpoints"`
	AdminPrincipal   string                     `yaml:"AdminPrincipal"`
	SkipAsForeign    bool
}

type ConfigtxAnchorPeer struct {
	Host string `yaml:"Host"`
	Port int    `yaml:"Port"`
}

type ConfigtxOrderer struct {
	OrdererType   string                     `yaml:"OrdererType"`
	Addresses     []string                   `yaml:"Addresses"`
	BatchTimeout  time.Duration              `yaml:"BatchTimeout"`
	BatchSize     ConfigtxBatchSize          `yaml:"BatchSize"`
	Kafka         ConfigtxKafka              `yaml:"Kafka"`
	EtcdRaft      *etcdraft.ConfigMetadata   `yaml:"EtcdRaft"`
	Organizations []*ConfigtxOrganization    `yaml:"Organizations"`
	MaxChannels   uint64                     `yaml:"MaxChannels"`
	Capabilities  map[string]bool            `yaml:"Capabilities"`
	Policies      map[string]*ConfigtxPolicy `yaml:"Policies"`
}

type ConfigtxBatchSize struct {
	MaxMessageCount   uint32 `yaml:"MaxMessageCount"`
	AbsoluteMaxBytes  uint32 `yaml:"AbsoluteMaxBytes"`
	PreferredMaxBytes uint32 `yaml:"PreferredMaxBytes"`
}

type ConfigtxKafka struct {
	Brokers []string `yaml:"Brokers"`
}
