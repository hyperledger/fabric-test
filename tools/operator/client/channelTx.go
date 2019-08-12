package client

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/utils"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//GenerateChannelTransaction - to generate channel transactions
func GenerateChannelTransaction(input networkspec.Config, configtxPath string) error {

	artifactsLocation := utils.ChannelArtifactsDir(input.ArtifactsLocation)
	configtxgen := Configtxgen{Config: configtxPath}
	var outputPath string
	for i := 0; i < input.NumChannels; i++ {
		channelName := fmt.Sprintf("testorgschannel%d", i)
		outputPath = utils.JoinPath(artifactsLocation, fmt.Sprintf("%s.tx", channelName))
		configtxgen.OutputPath = outputPath
		_, err := ExecuteCommand("configtxgen", configtxgen.ChanTxArgs(channelName), true)
		if err != nil {
			return err
		}

		for j := 0; j < len(input.PeerOrganizations); j++ {
			outputPath = utils.JoinPath(artifactsLocation, fmt.Sprintf("%s%sanchor.tx", channelName, input.PeerOrganizations[j].MSPID))
			configtxgen.OutputPath = outputPath
			_, err := ExecuteCommand("configtxgen", configtxgen.AnchorPeersUpdateTxArgs(channelName, input.PeerOrganizations[j].Name), true)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
