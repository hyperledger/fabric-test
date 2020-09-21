package inputStructs

//Config --
type Config struct {
	OrdererSystemChannel  string                  `yaml:"ordererSystemChannel,omitempty"`
	Organizations         []Organization          `yaml:"organizations,omitempty"`
	CreateChannel         []Channel               `yaml:"createChannel,omitempty"`
	AnchorPeerUpdate      []Channel               `yaml:"anchorPeerUpdate,omitempty"`
	JoinChannel           []Channel               `yaml:"joinChannel,omitempty"`
	JoinChannelBySnapshot []JoinChannelBySnapshot `yaml:"joinChannelBySnapshot,omitempty"`
	SnapshotChannel       []Snapshot              `yaml:"snapshotChannel,omitempty"`
	InstallCC             []InstallCC             `yaml:"installChaincode,omitempty"`
	InstantiateCC         []InstantiateCC         `yaml:"instantiateChaincode,omitempty"`
	UpgradeCC             []InstantiateCC         `yaml:"upgradeChaincode,omitempty"`
	Invoke                []InvokeQuery           `yaml:"invokes,omitempty"`
	Query                 []InvokeQuery           `yaml:"queries,omitempty"`
	CommandOptions        []CommandOptions        `yaml:"command,omitempty"`
}

//Channel --
type Channel struct {
	ChannelTxPath    string `yaml:"channelTxPath,omitempty"`
	ChannelName      string `yaml:"channelName,omitempty"`
	Organizations    string `yaml:"organizations,omitempty"`
	ChannelPrefix    string `yaml:"channelPrefix,omitempty"`
	AnchorPeerTxPath string `yaml:"anchorPeerUpdateTxPath,omitempty"`
	NumChannels      int    `yaml:"numChannels,omitempty"`
	TargetPeers      string `yaml:"targetPeers,omitempty"`
	SnapshotPath     string `yaml:"snapshotPath,omitempty"`
}

//Organization --
type Organization struct {
	Name            string `yaml:"name,omitempty"`
	ConnProfilePath string `yaml:"connProfilePath,omitempty"`
}

type Snapshot struct {
	ChannelName   string `yaml:"channelName,omitempty"`
	Organizations string `yaml:"organizations,omitempty"`
	BlockNumber   []int  `yaml:"blockNumber,omitempty"`
	TargetPeers   string `yaml:"targetPeers,omitempty"`
}

type JoinChannelBySnapshot struct {
	ChannelName   string `yaml:"channelName,omitempty"`
	Organizations string `yaml:"organizations,omitempty"`
	TargetPeers   string `yaml:"targetPeers,omitempty"`
	SnapshotPath  string `yaml:"snapshotPath,omitempty"`
	ChannelPrefix string `yaml:"channelPrefix,omitempty"`
	NumChannels   int    `yaml:"numChannels,omitempty"`
}

//InstallCC --
type InstallCC struct {
	SDK              string `yaml:"sdk,omitempty"`
	ChainCodeName    string `yaml:"name,omitempty"`
	ChainCodeVersion string `yaml:"version,omitempty"`
	ChainCodePath    string `yaml:"path,omitempty"`
	Organizations    string `yaml:"organizations,omitempty"`
	Language         string `yaml:"language,omitempty"`
	MetadataPath     string `yaml:"metadataPath,omitempty"`
	TargetPeers      string `yaml:"targetPeers,omitempty"`
}

//InstantiateCC --
type InstantiateCC struct {
	SDK               string         `yaml:"sdk,omitempty"`
	ChannelName       string         `yaml:"channelName,omitempty"`
	ChainCodeName     string         `yaml:"name,omitempty"`
	ChainCodeVersion  string         `yaml:"version,omitempty"`
	Organizations     string         `yaml:"organizations,omitempty"`
	CCFcn             string         `yaml:"fcn,omitempty"`
	CCFcnArgs         string         `yaml:"args,omitempty"`
	EndorsementPolicy string         `yaml:"endorsementPolicy,omitempty"`
	ChannelPrefix     string         `yaml:"channelPrefix,omitempty"`
	NumChannels       int            `yaml:"numChannels,omitempty"`
	CollectionPath    string         `yaml:"collectionPath,omitempty"`
	TimeOutOpt        TimeOutOptions `yaml:"timeoutOpt,omitempty"`
	Sequence          string         `yaml:"sequence,omitempty"`
	TargetPeers       string         `yaml:"targetPeers,omitempty"`
}

//TimeOutOptions --
type TimeOutOptions struct {
	PreConfig string `yaml:"preConfig,omitempty"`
	Request   string `yaml:"request,omitempty"`
}

//InvokeQuery --
type InvokeQuery struct {
	ChannelName      string               `yaml:"channelName,omitempty"`
	ChaincodeName    string               `yaml:"name,omitempty"`
	TargetPeers      string               `yaml:"targetPeers,omitempty"`
	NProcPerOrg      int                  `yaml:"nProcPerOrg,omitempty"`
	NRequest         int                  `yaml:"nRequest,omitempty"`
	RunDuration      int                  `yaml:"runDur,omitempty"`
	Organizations    string               `yaml:"organizations,omitempty"`
	TxnOptions       []TransactionOptions `yaml:"txnOpt,omitempty"`
	QueryCheck       int                  `yaml:"queryCheck,omitempty"`
	EventOptions     EventOptions         `yaml:"eventOpt,omitempty"`
	CCOptions        CCOptions            `yaml:"ccOpt,omitempty"`
	DiscoveryOptions DiscoveryOptions     `yaml:"discoveryOpt,omitempty"`
	ListOptions      map[string][]string  `yaml:"listOpt,omitempty"`
	Fcn              string               `yaml:"fcn,omitempty"`
	Args             string               `yaml:"args,omitempty"`
	TimeOutOpt       TimeOutOptions       `yaml:"timeoutOpt,omitempty"`
	PeerFailOver     bool                 `yaml:"peerFailover,omitempty"`
	OrdererFailOver  bool                 `yaml:"ordererFailover,omitempty"`
	PeerOpt          PeerOptions          `yaml:"peerOptions,omitempty"`
	OrdererOpt       OrdererOptions       `yaml:"ordererOptions,omitempty"`
	SnapshotOpt      SnapshotOptions      `yaml:"snapshotOptions,omitempty"`
}

//TransactionOptions --
type TransactionOptions struct {
	Mode    string  `yaml:"mode,omitempty"`
	Options Options `yaml:"options,omitempty"`
}

type SnapshotOptions struct {
	Enabled        bool   `yaml:"enabled,omitempty"`
	Height         []int  `yaml:"height,omitempty"`
	QueryFrequency int    `yaml:"queryFrequency,omitempty"`
	SnapshotPeer   string `yaml:"snapshotPeer,omitempty"`
}

//Options  --
type Options struct {
	ConstFreq  int `yaml:"constFreq,omitempty"`
	DevFreq    int `yaml:"devFreq,omitempty"`
	MixFreq    int `yaml:"mixFreq,omitempty"`
	BurstFreq0 int `yaml:"burstFreq0,omitempty"`
	BurstDur0  int `yaml:"burstDur0,omitempty"`
	BurstFreq1 int `yaml:"burstFreq1,omitempty"`
	BurstDur1  int `yaml:"burstDur1,omitempty"`
}

//EventOptions --
type EventOptions struct {
	Type     string `yaml:"type,omitempty"`
	Listener string `yaml:"listener,omitempty"`
	TimeOut  int    `yaml:"timeout,omitempty"`
}

//CCOptions --
type CCOptions struct {
	CCType      string `yaml:"ccType,omitempty"`
	KeyIdx      []int  `yaml:"keyIdx,omitempty"`
	KeyPayload  []int  `yaml:"keyPayload,omitempty"`
	KeyStart    int    `yaml:"keyStart,omitempty"`
	PayLoadMin  int    `yaml:"payLoadMin,omitempty"`
	PayLoadMax  int    `yaml:"payLoadMax,omitempty"`
	PayLoadType string `yaml:"payLoadType,omitempty"`
}

//DiscoveryOptions --
type DiscoveryOptions struct {
	Localhost bool `yaml:"localHost,omitempty"`
	InitFreq  int  `yaml:"initFreq,omitempty"`
}

type PeerOptions struct {
	Method string `yaml:"method,omitempty"`
	List   string `yaml:"list,omitempty"`
}

type OrdererOptions struct {
	Method    string `yaml:"method,omitempty"`
	NOrderers int    `yaml:"nOrderers,omitempty"`
}

//CommandOptions --
type CommandOptions struct {
	Name string   `yaml:"name,omitempty"`
	Args []string `yaml:"args,omitempty"`
}
