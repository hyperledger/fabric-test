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

	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"

	docker "github.com/fsouza/go-dockerclient"
)

type Core struct {
	Logging    *Logging    `yaml:"logging,omitempty"`
	Peer       *Peer       `yaml:"peer,omitempty"`
	VM         *VM         `yaml:"vm,omitempty"`
	Chaincode  *Chaincode  `yaml:"chaincode,omitempty"`
	Ledger     *Ledger     `yaml:"ledger,omitempty"`
	Operations *Operations `yaml:"operations,omitempty"`
	Metrics    *Metrics    `yaml:"metrics,omitempty"`
}

type Logging struct {
	Format string `yaml:"format,omitempty"`

	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type Peer struct {
	ID                     string          `yaml:"id,omitempty"`
	NetworkID              string          `yaml:"networkId,omitempty"`
	ListenAddress          string          `yaml:"listenAddress,omitempty"`
	ChaincodeListenAddress string          `yaml:"chaincodeListenAddress,omitempty"`
	ChaincodeAddress       string          `yaml:"chaincodeAddress,omitempty"`
	Address                string          `yaml:"address,omitempty"`
	AddressAutoDetect      bool            `yaml:"addressAutoDetect"`
	Keepalive              *Keepalive      `yaml:"keepalive,omitempty"`
	Gossip                 *Gossip         `yaml:"gossip,omitempty"`
	Events                 *Events         `yaml:"events,omitempty"`
	TLS                    *TLS            `yaml:"tls,omitempty"`
	Authentication         *Authentication `yaml:"authentication,omitempty"`
	FileSystemPath         string          `yaml:"fileSystemPath,omitempty"`
	BCCSP                  *BCCSP          `yaml:"BCCSP,omitempty"`
	MSPConfigPath          string          `yaml:"mspConfigPath,omitempty"`
	LocalMSPID             string          `yaml:"localMspId,omitempty"`
	Deliveryclient         *DeliveryClient `yaml:"deliveryclient,omitempty"`
	LocalMspType           string          `yaml:"localMspType,omitempty"`
	Handlers               *Handlers       `yaml:"handlers,omitempty"`
	ValidatorPoolSize      int             `yaml:"validatorPoolSize,omitempty"`
	Discovery              *Discovery      `yaml:"discovery,omitempty"`
	Limits                 *Limits         `yaml:"limits,omitempty"`

	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type Keepalive struct {
	MinInterval    time.Duration    `yaml:"minInterval,omitempty"`
	Client         *ClientKeepalive `yaml:"client,omitempty"`
	DeliveryClient *ClientKeepalive `yaml:"deliveryClient,omitempty"`
}

type ClientKeepalive struct {
	Interval time.Duration `yaml:"interval,omitempty"`
	Timeout  time.Duration `yaml:"timeout,omitempty"`
}

type Gossip struct {
	Bootstrap                  string          `yaml:"bootstrap,omitempty"`
	UseLeaderElection          bool            `yaml:"useLeaderElection"`
	OrgLeader                  bool            `yaml:"orgLeader"`
	MembershipTrackerInterval  time.Duration   `yaml:"membershipTrackerInterval,omitempty"`
	Endpoint                   string          `yaml:"endpoint,omitempty"`
	MaxBlockCountToStore       int             `yaml:"maxBlockCountToStore,omitempty"`
	MaxPropagationBurstLatency time.Duration   `yaml:"maxPropagationBurstLatency,omitempty"`
	MaxPropagationBurstSize    int             `yaml:"maxPropagationBurstSize,omitempty"`
	PropagateIterations        int             `yaml:"propagateIterations,omitempty"`
	PropagatePeerNum           int             `yaml:"propagatePeerNum,omitempty"`
	PullInterval               time.Duration   `yaml:"pullInterval,omitempty"`
	PullPeerNum                int             `yaml:"pullPeerNum,omitempty"`
	RequestStateInfoInterval   time.Duration   `yaml:"requestStateInfoInterval,omitempty"`
	PublishStateInfoInterval   time.Duration   `yaml:"publishStateInfoInterval,omitempty"`
	StateInfoRetentionInterval time.Duration   `yaml:"stateInfoRetentionInterval,omitempty"`
	PublishCertPeriod          time.Duration   `yaml:"publishCertPeriod,omitempty"`
	DialTimeout                time.Duration   `yaml:"dialTimeout,omitempty"`
	ConnTimeout                time.Duration   `yaml:"connTimeout,omitempty"`
	RecvBuffSize               int             `yaml:"recvBuffSize,omitempty"`
	SendBuffSize               int             `yaml:"sendBuffSize,omitempty"`
	DigestWaitTime             time.Duration   `yaml:"digestWaitTime,omitempty"`
	RequestWaitTime            time.Duration   `yaml:"requestWaitTime,omitempty"`
	ResponseWaitTime           time.Duration   `yaml:"responseWaitTime,omitempty"`
	AliveTimeInterval          time.Duration   `yaml:"aliveTimeInterval,omitempty"`
	AliveExpirationTimeout     time.Duration   `yaml:"aliveExpirationTimeout,omitempty"`
	ReconnectInterval          time.Duration   `yaml:"reconnectInterval,omitempty"`
	ExternalEndpoint           string          `yaml:"externalEndpoint,omitempty"`
	Election                   *GossipElection `yaml:"election,omitempty"`
	PvtData                    *GossipPvtData  `yaml:"pvtData,omitempty"`
	State                      *GossipState    `yaml:"state,omitempty"`
}

type GossipElection struct {
	StartupGracePeriod       time.Duration `yaml:"startupGracePeriod,omitempty"`
	MembershipSampleInterval time.Duration `yaml:"membershipSampleInterval,omitempty"`
	LeaderAliveThreshold     time.Duration `yaml:"leaderAliveThreshold,omitempty"`
	LeaderElectionDuration   time.Duration `yaml:"leaderElectionDuration,omitempty"`
}

type GossipPvtData struct {
	PullRetryThreshold                         time.Duration                   `yaml:"pullRetryThreshold,omitempty"`
	TransientstoreMaxBlockRetention            int                             `yaml:"transientstoreMaxBlockRetention,omitempty"`
	PushAckTimeout                             time.Duration                   `yaml:"pushAckTimeout,omitempty"`
	BtlPullMargin                              int                             `yaml:"btlPullMargin,omitempty"`
	ReconcileBatchSize                         int                             `yaml:"reconcileBatchSize,omitempty"`
	ReconcileSleepInterval                     time.Duration                   `yaml:"reconcileSleepInterval,omitempty"`
	ReconciliationEnabled                      bool                            `yaml:"reconciliationEnabled"`
	SkipPullingInvalidTransactionsDuringCommit bool                            `yaml:"skipPullingInvalidTransactionsDuringCommit"`
	ImplicitCollDisseminationPolicy            ImplicitCollDisseminationPolicy `yaml:"implicitCollectionDisseminationPolicy"`
}

type ImplicitCollDisseminationPolicy struct {
	RequiredPeerCount int `yaml:"requiredPeerCount,omitempty"`
	// do not tag omitempty in order to override MaxPeerCount default with 0
	MaxPeerCount int `yaml:"maxPeerCount"`
}

type GossipState struct {
	Enabled         bool          `yaml:"enabled"`
	CheckInterval   time.Duration `yaml:"checkInterval,omitempty"`
	ResponseTimeout time.Duration `yaml:"responseTimeout,omitempty"`
	BatchSize       int           `yaml:"batchSize,omitempty"`
	BlockBufferSize int           `yaml:"blockBufferSize,omitempty"`
	MaxRetries      int           `yaml:"maxRetries,omitempty"`
}

type Events struct {
	Address    string        `yaml:"address,omitempty"`
	Buffersize int           `yaml:"buffersize,omitempty"`
	Timeout    time.Duration `yaml:"timeout,omitempty"`
	Timewindow time.Duration `yaml:"timewindow,omitempty"`
	Keepalive  *Keepalive    `yaml:"keepalive,omitempty"`
}

type TLS struct {
	Enabled            bool      `yaml:"enabled"`
	ClientAuthRequired bool      `yaml:"clientAuthRequired"`
	CA                 *FileRef  `yaml:"ca,omitempty"`
	Cert               *FileRef  `yaml:"cert,omitempty"`
	Key                *FileRef  `yaml:"key,omitempty"`
	RootCert           *FileRef  `yaml:"rootcert,omitempty"`
	ClientRootCAs      *FilesRef `yaml:"clientRootCAs,omitempty"`
	ClientKey          *FileRef  `yaml:"clientKey,omitempty"`
	ClientCert         *FileRef  `yaml:"clientCert,omitempty"`
}

type FileRef struct {
	File string `yaml:"file,omitempty"`
}

type FilesRef struct {
	Files []string `yaml:"files,omitempty"`
}

type Authentication struct {
	Timewindow time.Duration `yaml:"timewindow,omitempty"`
}

type BCCSP struct {
	Default string            `yaml:"Default,omitempty"`
	SW      *SoftwareProvider `yaml:"SW,omitempty"`
}

type SoftwareProvider struct {
	Hash     string `yaml:"Hash,omitempty"`
	Security int    `yaml:"Security,omitempty"`
}

type DeliveryClient struct {
	ReconnectTotalTimeThreshold time.Duration      `yaml:"reconnectTotalTimeThreshold,omitempty"`
	AddressOverrides            []*AddressOverride `yaml:"addressOverrides,omitempty"`
}

type AddressOverride struct {
	From        string `yaml:"from"`
	To          string `yaml:"to"`
	CACertsFile string `yaml:"caCertsFile"`
}

type Service struct {
	Enabled       bool   `yaml:"enabled"`
	ListenAddress string `yaml:"listenAddress,omitempty"`
}

type Handlers struct {
	AuthFilters []Handler  `yaml:"authFilters,omitempty"`
	Decorators  []Handler  `yaml:"decorators,omitempty"`
	Endorsers   HandlerMap `yaml:"endorsers,omitempty"`
	Validators  HandlerMap `yaml:"validators,omitempty"`
}

type Handler struct {
	Name    string `yaml:"name,omitempty"`
	Library string `yaml:"library,omitempty"`
}

type HandlerMap map[string]Handler

type Discovery struct {
	Enabled                      bool    `yaml:"enabled"`
	AuthCacheEnabled             bool    `yaml:"authCacheEnabled"`
	AuthCacheMaxSize             int     `yaml:"authCacheMaxSize,omitempty"`
	AuthCachePurgeRetentionRatio float64 `yaml:"authCachePurgeRetentionRatio"`
	OrgMembersAllowedAccess      bool    `yaml:"orgMembersAllowedAccess"`
}

type Limits struct {
	Concurrency *Concurrency `yaml:"concurrency,omitempty"`
}

type Concurrency struct {
	EndorserService int `yaml:"endorserService,omitempty"`
	DeliverService  int `yaml:"deliverService,omitempty"`
}

type VM struct {
	Endpoint string  `yaml:"endpoint,omitempty"`
	Docker   *Docker `yaml:"docker,omitempty"`
}

type Docker struct {
	TLS          *TLS               `yaml:"tls,omitempty"`
	AttachStdout bool               `yaml:"attachStdout"`
	HostConfig   *docker.HostConfig `yaml:"hostConfig,omitempty"`
}

type Chaincode struct {
	Builder          string            `yaml:"builder,omitempty"`
	Pull             bool              `yaml:"pull"`
	Golang           *Golang           `yaml:"golang,omitempty"`
	Java             *Java             `yaml:"java,omitempty"`
	Node             *Node             `yaml:"node,omitempty"`
	InstallTimeout   time.Duration     `yaml:"installTimeout,omitempty"`
	StartupTimeout   time.Duration     `yaml:"startupTimeout,omitempty"`
	ExecuteTimeout   time.Duration     `yaml:"executeTimeout,omitempty"`
	Mode             string            `yaml:"mode,omitempty"`
	Keepalive        int               `yaml:"keepalive,omitempty"`
	System           SystemFlags       `yaml:"system,omitempty"`
	Logging          *Logging          `yaml:"logging,omitempty"`
	ExternalBuilders []ExternalBuilder `yaml:"externalBuilders"`

	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type Golang struct {
	Runtime     string `yaml:"runtime,omitempty"`
	DynamicLink bool   `yaml:"dynamicLink"`

	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type Java struct {
	Runtime         string                 `yaml:"runtime,omitempty"`
	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type Node struct {
	Runtime         string                 `yaml:"runtime,omitempty"`
	ExtraProperties map[string]interface{} `yaml:",inline,omitempty"`
}

type ExternalBuilder struct {
	EnvironmentWhitelist []string `yaml:"environmentWhitelist,omitempty"`
	Name                 string   `yaml:"name,omitempty"`
	Path                 string   `yaml:"path,omitempty"`
}

type SystemFlags struct {
	NEWLIFECYCLE string `yaml:"_lifecycle,omitempty"`
	CSCC         string `yaml:"cscc,omitempty"`
	LSCC         string `yaml:"lscc,omitempty"`
	ESCC         string `yaml:"escc,omitempty"`
	VSCC         string `yaml:"vscc,omitempty"`
	QSCC         string `yaml:"qscc,omitempty"`
}

type Ledger struct {
	// Blockchain - not sure if it's needed
	State   *StateConfig   `yaml:"state,omitempty"`
	History *HistoryConfig `yaml:"history,omitempty"`
}

type StateConfig struct {
	StateDatabase string         `yaml:"stateDatabase,omitempty"`
	CouchDBConfig *CouchDBConfig `yaml:"couchDBConfig,omitempty"`
}

type CouchDBConfig struct {
	CouchDBAddress          string        `yaml:"couchDBAddress,omitempty"`
	Username                string        `yaml:"username,omitempty"`
	Password                string        `yaml:"password,omitempty"`
	MaxRetries              int           `yaml:"maxRetries,omitempty"`
	MaxRetriesOnStartup     int           `yaml:"maxRetriesOnStartup,omitempty"`
	RequestTimeout          time.Duration `yaml:"requestTimeout,omitempty"`
	QueryLimit              int           `yaml:"queryLimit,omitempty"`
	MaxBatchUpdateSize      int           `yaml:"maxBatchUpdateSize,omitempty"`
	WarmIndexesAfterNBlocks int           `yaml:"warmIndexesAfteNBlocks,omitempty"`
}

type HistoryConfig struct {
	EnableHistoryDatabase bool `yaml:"enableHistoryDatabase"`
}

type Operations struct {
	ListenAddress string `yaml:"listenAddress,omitempty"`
	TLS           *TLS   `yaml:"tls"`
}

type Metrics struct {
	Provider string  `yaml:"provider"`
	Statsd   *Statsd `yaml:"statsd,omitempty"`
}

type Statsd struct {
	Network       string        `yaml:"network,omitempty"`
	Address       string        `yaml:"address,omitempty"`
	WriteInterval time.Duration `yaml:"writeInterval,omitempty"`
	Prefix        string        `yaml:"prefix,omitempty"`
}

//CoreConfig --
func CoreConfig(nsConfig networkspec.Config) (Core, error) {

	var coreConfig Core
	filePath := "./sampleconfig/core.yaml"
	contents, err := ioutil.ReadFile(filePath)
	if err != nil {
		return coreConfig, err
	}
	err = yaml.Unmarshal(contents, &coreConfig)
	if err != nil {
		return coreConfig, err
	}
	coreConfig.VM.Endpoint = "localhost:2375"
	coreConfig.Peer.ChaincodeListenAddress = "0.0.0.0:7052"
	if nsConfig.GossipEnable {
		coreConfig.Peer.Gossip.State.Enabled = true
		coreConfig.Peer.Gossip.UseLeaderElection = true
		coreConfig.Peer.Gossip.OrgLeader = false
	} else {
		coreConfig.Peer.Gossip.State.Enabled = false
		coreConfig.Peer.Gossip.UseLeaderElection = false
		coreConfig.Peer.Gossip.OrgLeader = true
	}
	if nsConfig.TLS == "true" || nsConfig.TLS == "mutual" {
		coreConfig.Peer.TLS.Enabled = true
	} else {
		coreConfig.Peer.TLS.Enabled = false
	}
	coreConfig.Peer.TLS.Cert.File = "/etc/hyperledger/fabric/artifacts/tls/server.crt"
	coreConfig.Peer.TLS.Key.File = "/etc/hyperledger/fabric/artifacts/tls/server.key"
	coreConfig.Peer.ChaincodeAddress = "localhost:7052"
	ccExecuteTimeout, _ := time.ParseDuration("1500s")
	coreConfig.Chaincode.ExecuteTimeout = ccExecuteTimeout
	coreConfig.Peer.MSPConfigPath = "/etc/hyperledger/fabric/artifacts/msp"
	coreConfig.Peer.FileSystemPath = "/shared/data"
	coreConfig.Operations.TLS.Enabled = false
	coreConfig.Metrics.Provider = "prometheus"
	if nsConfig.DBType == "couchdb" {
		coreConfig.Ledger.State.StateDatabase = "CouchDB"
	}
	coreConfig.Chaincode.Builder = nl.DockerImage("ccenv", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Ccenv)
	coreConfig.Chaincode.Golang.Runtime = nl.DockerImage("baseos", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Baseos)
	coreConfig.Chaincode.Java.Runtime = nl.DockerImage("javaenv", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Javaenv)
	coreConfig.Chaincode.Node.Runtime = nl.DockerImage("nodeenv", nsConfig.DockerOrg, nsConfig.DockerTag, nsConfig.DockerImages.Nodeenv)
	return coreConfig, nil
}

//GenerateCorePeerConfig --
func GenerateCorePeerConfig(name, orgName, mspID, artifactsLocation string, port int32, metricsPort int32, coreConfig Core) error {

	coreConfig.Peer.ListenAddress = fmt.Sprintf("0.0.0.0:%d", port)
	coreConfig.Peer.TLS.RootCert.File = fmt.Sprintf("/etc/hyperledger/fabric/artifacts/msp/tlscacerts/tlsca.%s-cert.pem", orgName)
	coreConfig.Peer.ID = name
	coreConfig.Peer.Gossip.ExternalEndpoint = fmt.Sprintf("%s:%d", name, port)
	coreConfig.Peer.Address = fmt.Sprintf("%s:%d", name, port)
	coreConfig.Peer.LocalMSPID = mspID
	coreConfig.Peer.Gossip.Bootstrap = fmt.Sprintf("%s:%d", name, port)
	coreConfig.Ledger.State.CouchDBConfig.CouchDBAddress = fmt.Sprintf("couchdb-%s:5984", name)
	coreConfig.Ledger.State.CouchDBConfig.Username = "admin"
	coreConfig.Ledger.State.CouchDBConfig.Password = "adminpw"
	coreConfig.Operations.ListenAddress = fmt.Sprintf(":%d", metricsPort)
	d, err := yaml.Marshal(&coreConfig)
	if err != nil {
		return err
	}
	cryptoConfigPath := paths.CryptoConfigDir(artifactsLocation)
	path := paths.JoinPath(cryptoConfigPath, fmt.Sprintf("peerOrganizations/%s/peers/%s.%s", orgName, name, orgName))
	inputPath := paths.JoinPath(path, fmt.Sprintf("core-%s.yaml", name))
	err = ioutil.WriteFile(inputPath, d, 0644)
	if err != nil {
		return err
	}
	return nil
}
