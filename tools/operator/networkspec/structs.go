// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package networkspec

import (
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
	Orderer                  struct {
		OrdererType string `yaml:"ordererType,omitempty"`
	} `yaml:"orderer,omitempty"`
	NumChannels             int    `yaml:"numChannels,omitempty"`
	TLS                     string `yaml:"tls,omitempty"`
	Metrics                 bool   `yaml:"metrics,omitempty"`
	GossipEnable            bool   `yaml:"gossipEnable,omitempty"`
	EnableNodeOUs           bool   `yaml:"enableNodeOUs,omitempty"`
	OrdererCapabilities     string `yaml:"ordererCapabilities,omitempty"`
	ChannelCapabilities     string `yaml:"channelCapabilities,omitempty"`
	ApplicationCapabilities string `yaml:"applicationCapabilities,omitempty"`
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
	NumOrderers int    `yaml:"numOderers,omitempty"`
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
