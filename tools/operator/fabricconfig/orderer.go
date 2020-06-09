/*
Copyright IBM Corp. All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package fabricconfig

import (
	"fmt"
	"io/ioutil"
	"time"

	"gopkg.in/yaml.v2"

	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	//"github.com/hyperledger/fabric-test/tools/operator/launcher/k8s"
)

type Orderer struct {
	General    *General           `yaml:"General,omitempty"`
	FileLedger *FileLedger        `yaml:"FileLedger,omitempty"`
	Kafka      *Kafka             `yaml:"Kafka,omitempty"`
	Operations *OrdererOperations `yaml:"Operations,omitempty"`
	Metrics    *OrdererMetrics    `yaml:"Metrics,omitempty"`
	Consensus  *OrdererConsensus  `yaml:"OrdererConsensus,omitempty"`

	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type General struct {
	ListenAddress   string                 `yaml:"ListenAddress,omitempty"`
	ListenPort      int                    `yaml:"ListenPort,omitempty"`
	TLS             *OrdererTLS            `yaml:"TLS,omitempty"`
	Keepalive       *OrdererKeepalive      `yaml:"Keepalive,omitempty"`
	BootstrapMethod string                 `yaml:"BootstrapMethod,omitempty"`
	GenesisProfile  string                 `yaml:"GenesisProfile,omitempty"`
	GenesisFile     string                 `yaml:"GenesisFile,omitempty"` // will be replaced by the BootstrapFile
	BootstrapFile   string                 `yaml:"BootstrapFile,omitempty"`
	LocalMSPDir     string                 `yaml:"LocalMSPDir,omitempty"`
	LocalMSPID      string                 `yaml:"LocalMSPID,omitempty"`
	Profile         *OrdererProfile        `yaml:"Profile,omitempty"`
	BCCSP           *BCCSP                 `yaml:"BCCSP,omitempty"`
	Authentication  *OrdererAuthentication `yaml:"Authentication,omitempty"`
	Cluster         *OrdererCluster        `yaml:"Cluster,omitempty"`

	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type OrdererTLS struct {
	Enabled            bool     `yaml:"Enabled"`
	PrivateKey         string   `yaml:"PrivateKey,omitempty"`
	Certificate        string   `yaml:"Certificate,omitempty"`
	RootCAs            []string `yaml:"RootCAs,omitempty"`
	ClientAuthRequired bool     `yaml:"ClientAuthRequired"`
	ClientRootCAs      []string `yaml:"ClientRootCAs,omitempty"`
}

type OrdererSASLPlain struct {
	Enabled  bool   `yaml:"Enabled"`
	User     string `yaml:"User,omitempty"`
	Password string `yaml:"Password,omitempty"`
}

type OrdererKeepalive struct {
	ServerMinInterval time.Duration `yaml:"ServerMinInterval,omitempty"`
	ServerInterval    time.Duration `yaml:"ServerInterval,omitempty"`
	ServerTimeout     time.Duration `yaml:"ServerTimeout,omitempty"`
}

type OrdererProfile struct {
	Enabled bool   `yaml:"Enabled"`
	Address string `yaml:"Address,omitempty"`
}

type OrdererAuthentication struct {
	TimeWindow time.Duration `yaml:"TimeWindow,omitempty"`
}

type OrdererCluster struct {
	SendBufferSize    int    `yaml:"SendBufferSize,omitempty"`
	ClientCertificate string `yaml:"ClientCertificate,omitempty"`
	ClientPrivateKey  string `yaml:"ClientPrivateKey,omitempty"`
	ListenPort        int    `yaml:"ListenPort,omitempty"`
	ListenAddress     string `yaml:"ListenAddress,omitempty"`
	ServerCertificate string `yaml:"ServerCertificate,omitempty"`
	ServerPrivateKey  string `yaml:"ServerPrivateKey,omitempty"`
}

type OrdererTopic struct {
	ReplicationFactor int16
}

type FileLedger struct {
	Location string `yaml:"Location,omitempty"`
	Prefix   string `yaml:"Prefix,omitempty"`
}

type Kafka struct {
	Retry     *Retry            `yaml:"Retry,omitempty"`
	Verbose   bool              `yaml:"Verbose"`
	TLS       *OrdererTLS       `yaml:"TLS,omitempty"`
	SASLPlain *OrdererSASLPlain `yaml:"SASLPlain,omitempty"`
	Topic     *OrdererTopic     `yaml:"Topic,omitempty"`
}

type Retry struct {
	ShortInterval   time.Duration    `yaml:"ShortInterval,omitempty"`
	ShortTotal      time.Duration    `yaml:"ShortTotal,omitempty"`
	LongInterval    time.Duration    `yaml:"LongInterval,omitempty"`
	LongTotal       time.Duration    `yaml:"LongTotal,omitempty"`
	NetworkTimeouts *NetworkTimeouts `yaml:"NetworkTimeouts,omitempty"`
	Metadata        *Backoff         `yaml:"Metadata,omitempty"`
	Producer        *Backoff         `yaml:"Producer,omitempty"`
	Consumer        *Backoff         `yaml:"Consumer,omitempty"`
}

type NetworkTimeouts struct {
	DialTimeout  time.Duration `yaml:"DialTimeout,omitempty"`
	ReadTimeout  time.Duration `yaml:"ReadTimeout,omitempty"`
	WriteTimeout time.Duration `yaml:"WriteTimeout,omitempty"`
}

type Backoff struct {
	RetryBackoff time.Duration `yaml:"RetryBackoff,omitempty"`
	RetryMax     int           `yaml:"RetryMax,omitempty"`
}

type OrdererOperations struct {
	ListenAddress string      `yaml:"ListenAddress,omitempty"`
	TLS           *OrdererTLS `yaml:"TLS"`
}

type OrdererMetrics struct {
	Provider string         `yaml:"Provider"`
	Statsd   *OrdererStatsd `yaml:"Statsd,omitempty"`
}

type OrdererStatsd struct {
	Network       string        `yaml:"Network,omitempty"`
	Address       string        `yaml:"Address,omitempty"`
	WriteInterval time.Duration `yaml:"WriteInterval,omitempty"`
	Prefix        string        `yaml:"Prefix,omitempty"`
}

type OrdererConsensus struct {
	WALDir  string `yaml:"WALDir,omitempty"`
	SnapDir string `yaml:"SnapDir,omitempty"`
}

func OrdererConfig(nsConfig networkspec.Config) (Orderer, error) {

	var ordererConfig Orderer
	filePath := "./sampleconfig/orderer.yaml"
	contents, err := ioutil.ReadFile(filePath)
	if err != nil {
		return ordererConfig, err
	}
	err = yaml.Unmarshal(contents, &ordererConfig)
	if err != nil {
		return ordererConfig, err
	}
	ordererConfig.General.ListenAddress = "0.0.0.0"
	ordererConfig.General.BootstrapMethod = "file"
	ordererConfig.General.GenesisFile = "/etc/hyperledger/fabric/genesisblock/genesis.block"
	if nsConfig.TLS == "true" || nsConfig.TLS == "mutual" {
		ordererConfig.General.TLS.Enabled = true
	} else {
		ordererConfig.General.TLS.Enabled = false
	}
	ordererConfig.General.TLS.Certificate = "/etc/hyperledger/fabric/artifacts/tls/server.crt"
	ordererConfig.General.TLS.PrivateKey = "/etc/hyperledger/fabric/artifacts/tls/server.key"
	ordererConfig.General.Cluster.ClientCertificate = "/etc/hyperledger/fabric/artifacts/tls/server.crt"
	ordererConfig.General.Cluster.ClientPrivateKey = "/etc/hyperledger/fabric/artifacts/tls/server.key"
	ordererConfig.General.LocalMSPDir = "/etc/hyperledger/fabric/artifacts/msp"
	ordererConfig.FileLedger.Location = "/shared/data"
	ordererConfig.Operations.TLS.Enabled = false
	ordererConfig.Metrics.Provider = "prometheus"
	return ordererConfig, nil
}

//GenerateOrdererConfig --
func GenerateOrdererConfig(name, orgName, mspID, artifactsLocation string, port int32, metricsPort int32, ordererConfig Orderer) error {

	ordererConfig.General.LocalMSPID = mspID
	var rootCAs []string
	rootCA := fmt.Sprintf("/etc/hyperledger/fabric/artifacts/msp/tlscacerts/tlsca.%s-cert.pem", orgName)
	ordererConfig.General.TLS.RootCAs = append(rootCAs, rootCA)
	ordererConfig.General.ListenPort = int(port)
	ordererConfig.Operations.ListenAddress = fmt.Sprintf(":%d", metricsPort)
	d, err := yaml.Marshal(&ordererConfig)
	if err != nil {
		return err
	}
	cryptoConfigPath := paths.CryptoConfigDir(artifactsLocation)
	path := paths.JoinPath(cryptoConfigPath, fmt.Sprintf("ordererOrganizations/%s/orderers/%s.%s", orgName, name, orgName))
	inputPath := paths.JoinPath(path, fmt.Sprintf("orderer-%s.yaml", name))
	err = ioutil.WriteFile(inputPath, d, 0644)
	if err != nil {
		return err
	}
	return nil
}
