// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package networkspec

type Config struct {
	ArtifactsLocation    string                 `yaml:"artifactsLocation,omitempty"`
	OrdererOrganizations []OrdererOrganizations `yaml:"ordererOrganizations,omitempty"`
	PeerOrganizations    []PeerOrganizations    `yaml:"peerOrganizations,omitempty"`
	Orderer              struct {
		OrdererType string `yaml:"ordererType,omitempty"`
	} `yaml:"orderer,omitempty"`
	NumChannels             int    `yaml:"numChannels,omitempty"`
	TLS                     string `yaml:"tls,omitempty"`
	EnableNodeOUs           bool   `yaml:"enableNodeOUs,omitempty"`
	OrdererCapabilities     string `yaml:"ordererCapabilities,omitempty"`
	ChannelCapabilities     string `yaml:"channelCapabilities,omitempty"`
	ApplicationCapabilities string `yaml:"applicationCapabilities,omitempty"`
	K8s                     struct {
		DataPersistence string `yaml:"dataPersistence,omitempty"`
		ServiceType     string `yaml:"serviceType,omitempty"`
	} `yaml:"k8s,omitempty"`
}

type OrdererOrganizations struct {
	Name        string `yaml:"name,omitempty"`
	MSPID       string `yaml:"mspId,omitempty"`
	NumOrderers int    `yaml:"numOderers,omitempty"`
	NumCA       int    `yaml:"numCa,omitempty"`
}

type KafkaConfig struct {
	NumKafka             int `yaml:"numKafka,omitempty"`
	NumKafkaReplications int `yaml:"numKafkaReplications,omitempty"`
	NumZookeepers        int `yaml:"numZookeepers,omitempty"`
}

type PeerOrganizations struct {
	Name     string `yaml:"name,omitempty"`
	MSPID    string `yaml:"mspId,omitempty"`
	NumPeers int    `yaml:"numPeers,omitempty"`
	NumCA    int    `yaml:"numCa,omitempty"`
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
		Verify bool `yaml:"verify"`
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
