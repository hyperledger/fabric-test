package client

import (
	"fmt"
	"github.com/hyperledger/fabric-test/tools/operator/helper"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//GenerateChannelTransaction - to generate channel transactions
func GenerateChannelTransaction(input networkspec.Config, channels []string, configtxPath string) error {

	path := helper.ChannelArtifactsDir(input.ArtifactsLocation)

	for i := 0; i < input.NumChannels; i++ {
		channelName := fmt.Sprintf("testorgschannel%d", i)
		err := ExecuteCommand("configtxgen", "-profile", "testorgschannel", "-channelID", channelName, "-outputCreateChannelTx", fmt.Sprintf("%s/%s.tx", path, channelName), fmt.Sprintf("-configPath=./%s", configtxPath))
		if err != nil {
			return err
		}

		for j := 0; j < len(input.PeerOrganizations); j++ {
			err := ExecuteCommand("configtxgen", "-profile", "testorgschannel", "-outputAnchorPeersUpdate", fmt.Sprintf("%s/%s%sanchor.tx", path, channelName, input.PeerOrganizations[j].MSPID), "-asOrg", fmt.Sprintf("%s", input.PeerOrganizations[j].Name), "-channelID", channelName, fmt.Sprintf("-configPath=./%s", configtxPath))
			if err != nil {
				return err
			}
		}
	}

	return nil
}
