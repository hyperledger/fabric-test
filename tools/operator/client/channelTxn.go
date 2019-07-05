package client

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//GenerateChannelTransaction - to generate channel transactions
func GenerateChannelTransaction(input networkspec.Config, channels []string, configtxPath string) error {

	path := filepath.Join(input.ArtifactsLocation, "channel-artifacts")
	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		_ = os.Mkdir(path, 0755)
	}

	for i := 0; i < input.NumChannels; i++ {
		channelName := fmt.Sprintf("testorgschannel%v", i)
		err := ExecuteCommand("configtxgen", "-profile", "testorgschannel", "-channelID", channelName, "-outputCreateChannelTx", fmt.Sprintf("%v/%v.tx", path, channelName), fmt.Sprintf("-configPath=./%v", configtxPath))
		if err != nil {
			return err
		}

		for j := 0; j < len(input.PeerOrganizations); j++ {
			err := ExecuteCommand("configtxgen", "-profile", "testorgschannel", "-outputAnchorPeersUpdate", fmt.Sprintf("%v/%v%vanchor.tx", path, channelName, input.PeerOrganizations[j].MSPID), "-asOrg", fmt.Sprintf("%v", input.PeerOrganizations[j].Name), "-channelID", channelName, fmt.Sprintf("-configPath=./%v", configtxPath))
			if err != nil {
				return err
			}
		}
	}

	return nil
}
