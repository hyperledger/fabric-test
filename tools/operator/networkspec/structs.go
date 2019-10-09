// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package networkspec

type Config struct {
	ArtifactsLocation    string                 `yaml:"artifacts_location,omitempty"`
	OrdererOrganizations []OrdererOrganizations `yaml:"orderer_organizations,omitempty"`
	PeerOrganizations    []PeerOrganizations    `yaml:"peer_organizations,omitempty"`
	Orderer              struct {
		OrdererType string `yaml:"orderertype,omitempty"`
	} `yaml:"orderer,omitempty"`
	NumChannels   int    `yaml:"num_channels,omitempty"`
	TLS           string `yaml:"tls,omitempty"`
	EnableNodeOUs bool   `yaml:"enableNodeOUs,omitempty"`
	K8s           struct {
		DataPersistence string `yaml:"data_persistence,omitempty"`
		ServiceType     string `yaml:"service_type,omitempty"`
	} `yaml:"k8s,omitempty"`
}

type OrdererOrganizations struct {
	Name        string `yaml:"name,omitempty"`
	MSPID       string `yaml:"msp_id,omitempty"`
	NumOrderers int    `yaml:"num_orderers,omitempty"`
	NumCA       int    `yaml:"num_ca,omitempty"`
}

type KafkaConfig struct {
	NumKafka             int `yaml:"num_kafka,omitempty"`
	NumKafkaReplications int `yaml:"num_kafka_replications,omitempty"`
	NumZookeepers        int `yaml:"num_zookeepers,omitempty"`
}

type PeerOrganizations struct {
	Name     string `yaml:"name,omitempty"`
	MSPID    string `yaml:"msp_id,omitempty"`
	NumPeers int    `yaml:"num_peers,omitempty"`
	NumCA    int    `yaml:"num_ca,omitempty"`
}

type MSP struct {
	AdminPem   string `json:"admin_pem"`
	CAPem      string `json:"ca_pem"`
	TLSPem     string `json:"tls_pem"`
	Pem        string `json:"pem"`
	PrivateKey string `json:"private_key"`
}

type TLS struct {
	CACert     string `json:"ca_cert"`
	ServerCert string `json:"server_cert"`
	ServerKey  string `json:"server_key"`
}

type CA struct {
	Pem        string `json:"pem"`
	PrivateKey string `json:"private_key"`
}

type Component struct {
	Msp   MSP `json:"msp"`
	TLS   TLS `json:"tls"`
	CA    CA  `json:"ca"`
	TLSCa CA  `json:"tlsca"`
}

type Orderer struct {
	MSPID       string `yaml:"mspid"`
	URL         string `yaml:"url"`
	GrpcOptions struct {
		SslTarget string `yaml:"ssl-target-name-override"`
	} `yaml:"grpcOptions"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
	AdminCert  string `yaml:"admin_cert"`
	PrivateKey string `yaml:"priv"`
}

type Peer struct {
	URL         string `yaml:"url"`
	GrpcOptions struct {
		SslTarget string `yaml:"ssl-target-name-override"`
	} `yaml:"grpcOptions"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
}

type CertificateAuthority struct {
	URL        string `yaml:"url"`
	CAName     string `yaml:"caName"`
	TLSCACerts struct {
		Pem string `yaml:"pem"`
	} `yaml:"tlsCACerts"`
	HTTPOptions struct {
		Verify bool `yaml:'verify'`
	} `yaml:"httpOptions"`
	Registrar struct {
		EnrollID     string `yaml:"enrollId"`
		EnrollSecret string `yaml:"enrollSecret"`
	} `yaml:"registrar"`
}

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

type Channel struct {
	Orderers   []string `yaml:"orderers"`
	Peers      []string `yaml:"peers"`
	Chaincodes []string `yaml:"chaincodes"`
}

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

type ConnectionProfile struct {
	Client        Client                          `yaml:"client"`
	Channels      map[string]Channel              `yaml:"channels"`
	Orderers      map[string]Orderer              `yaml:"orderers"`
	Peers         map[string]Peer                 `yaml:"peers"`
	CA            map[string]CertificateAuthority `yaml:"certificateAuthorities"`
	Organizations map[string]Organization         `yaml:"organizations"`
}
