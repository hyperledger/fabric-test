package client

type Configtxgen struct {
	Config     string
	OutputPath string
}

func (cfg Configtxgen) Args() []string {
	return []string{
		"-profile", "testOrgsOrdererGenesis",
		"-channelID", "orderersystemchannel",
		"-outputBlock", cfg.OutputPath,
		"-configPath", cfg.Config}
}

func (cfg Configtxgen) ChanTxArgs(channelName string) []string {
	return []string{
		"-profile", "testorgschannel",
		"-channelID", channelName,
		"-outputCreateChannelTx", cfg.OutputPath,
		"-configPath", cfg.Config}
}

func (cfg Configtxgen) AnchorPeersUpdateTxArgs(channelName, orgName string) []string {
	return []string{
		"-profile", "testorgschannel",
		"-channelID", channelName,
		"-outputAnchorPeersUpdate", cfg.OutputPath,
		"-asOrg", orgName,
		"-configPath", cfg.Config}
}
