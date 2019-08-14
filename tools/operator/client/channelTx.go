package client

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/utils"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//GenerateChannelTransaction - to generate channel transactions
func GenerateChannelTransaction(input networkspec.Config, configtxPath string) error {

	outputPath := utils.ChannelArtifactsDir(input.ArtifactsLocation)
	configtxgen := Configtxgen{Config: configtxPath, OutputPath: outputPath}

	for i := 0; i < input.NumChannels; i++ {
		channelName := fmt.Sprintf("testorgschannel%d", i)
		_, err := ExecuteCommand("configtxgen", configtxgen.ChanTxArgs(channelName), true)
		if err != nil {
			return err
		}

		for j := 0; j < len(input.PeerOrganizations); j++ {
			_, err := ExecuteCommand("configtxgen", configtxgen.AnchorPeersUpdateTxArgs(channelName, input.PeerOrganizations[j].Name), true)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
