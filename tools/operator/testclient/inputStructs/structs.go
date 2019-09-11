package inputStructs

//Config --
type Config struct {
	TLS              string          `yaml:"tls,omitempty"`
	Organizations    []Organization  `yaml:"organizations,omitempty"`
	CreateChannel    []Channel       `yaml:"createChannel,omitempty"`
	AnchorPeerUpdate []Channel       `yaml:"anchorPeerUpdate,omitempty"`
	JoinChannel      []Channel       `yaml:"joinChannel,omitempty"`
	InstallCC        []InstallCC     `yaml:"installChaincode,omitempty"`
	InstantiateCC    []InstantiateCC `yaml:"instantiateChaincode,omitempty"`
	UpgradeCC        []InstantiateCC `yaml:"upgradeChaincode,omitempty"`
	Invoke           []InvokeQuery   `yaml:"invokes,omitempty"`
	Query            []InvokeQuery   `yaml:"queries,omitempty"`
}

//Channel --
type Channel struct {
	ChannelTxPath    string `yaml:"channelTxPath,omitempty"`
	ChannelName      string `yaml:"channelName,omitempty"`
	Organizations    string `yaml:"organizations,omitempty"`
	ChannelPrefix    string `yaml:"channelPrefix,omitempty"`
	AnchorPeerTxPath string `yaml:"anchorPeerUpdateTxPath,omitempty"`
	NumChannels      int    `yaml:"numChannels,omitempty"`
}

//Organization --
type Organization struct {
	Name            string `yaml:"name,omitempty"`
	ConnProfilePath string `yaml:"connProfilePath,omitempty"`
}

//InstallCC --
type InstallCC struct {
	ChainCodeName    string `yaml:"chaincodeName,omitempty"`
	ChainCodeVersion string `yaml:"ccVersion,omitempty"`
	ChainCodePath    string `yaml:"chaincodePath,omitempty"`
	Organizations    string `yaml:"organizations,omitempty"`
	Language         string `yaml:"language,omitempty"`
	MetadataPath     string `yaml:"metadataPath,omitempty"`
}

//InstantiateCC --
type InstantiateCC struct {
	ChannelName       string         `yaml:"channelName,omitempty"`
	ChainCodeName     string         `yaml:"chaincodeName,omitempty"`
	ChainCodeVersion  string         `yaml:"ccVersion,omitempty"`
	Organizations     string         `yaml:"organizations,omitempty"`
	CCFcnArgs         string         `yaml:"args,omitempty"`
	EndorsementPolicy string         `yaml:"endorsementPolicy,omitempty"`
	ChannelPrefix     string         `yaml:"channelPrefix,omitempty"`
	NumChannels       int            `yaml:"numChannels,omitempty"`
	CollectionPath    string         `yaml:"collectionPath,omitempty"`
	TimeOutOpt        TimeOutOptions `yaml:"timeoutOpt,omitempty"`
}

//TimeOutOptions --
type TimeOutOptions struct {
	PreConfig string `yaml:"preConfig,omitempty"`
	Request   string `yaml:"request,omitempty"`
}

//InvokeQuery --
type InvokeQuery struct {
	ChannelName   string               `yaml:"channelName,omitempty"`
	TargetPeers   string               `yaml:"targetPeers,omitempty"`
	NProcPerOrg   int                  `yaml:"nProcPerOrg,omitempty"`
	NRequest      int                  `yaml:"nRequest,omitempty"`
	RunDuration   int                  `yaml:"runDur,omitempty"`
	Organizations string               `yaml:"organizations,omitempty"`
	TxnOptions    []TransactionOptions `yaml:"txnOpt,omitempty"`
	QueryCheck    int                  `yaml:"queryCheck,omitempty"`
	EventOptions  EventOptions         `yaml:"eventOpt,omitempty"`
	CCOptions     CCOptions            `yaml:"ccOpt,omitempty"`
	MoveArgs      string               `yaml:"moveArgs,omitempty"`
}

//TransactionOptions --
type TransactionOptions struct {
	Mode    string  `yaml:"mode,omitempty"`
	Options Options `yaml:"options,omitempty"`
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
	CCType     string `yaml:"ccType,omitempty"`
	KeyStart   int    `yaml:"keyStart,omitempty"`
	PayLoadMin int    `yaml:"payLoadMin,omitempty"`
	PayLoadMax int    `yaml:"payLoadMax,omitempty"`
}
