package client

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

//GenerateChannelTransaction - to generate channel transactions
func GenerateChannelTransaction(config networkspec.Config, configtxPath string) error {

	artifactsLocation := paths.ChannelArtifactsDir(config.ArtifactsLocation)
	configtxgen := Configtxgen{Config: configtxPath}
	var outputPath string
	for i := 0; i < config.NumChannels; i++ {
		channelName := fmt.Sprintf("testorgschannel%d", i)
		outputPath = paths.JoinPath(artifactsLocation, fmt.Sprintf("%s.tx", channelName))
		configtxgen.OutputPath = outputPath
		_, err := ExecuteCommand("configtxgen", configtxgen.ChanTxArgs(channelName), true)
		if err != nil {
			return err
		}

		for j := 0; j < len(config.PeerOrganizations); j++ {
			outputPath = paths.JoinPath(artifactsLocation, fmt.Sprintf("%s%sanchor.tx", channelName, config.PeerOrganizations[j].MSPID))
			configtxgen.OutputPath = outputPath
			_, err := ExecuteCommand("configtxgen", configtxgen.AnchorPeersUpdateTxArgs(channelName, config.PeerOrganizations[j].Name), true)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
