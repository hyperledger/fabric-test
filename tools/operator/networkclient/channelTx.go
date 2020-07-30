package networkclient

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/fabricconfiguration"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

//GenerateChannelTransaction - to generate channel transactions
func GenerateChannelTransaction(config networkspec.Config, configtxPath string) error {

	artifactsLocation := paths.ChannelArtifactsDir(config.ArtifactsLocation)
	var outputPath string
	for i := 0; i < config.NumChannels; i++ {
		channelName := fmt.Sprintf("testorgschannel%d", i)
		outputPath = paths.JoinPath(artifactsLocation, fmt.Sprintf("%s.tx", channelName))
		configFilesPath := paths.ConfigFilesDir(false)
		configtxgen := fabricconfiguration.Configtxgen{ConfigPath: configFilesPath, OutputChannelCreateTx: outputPath, Profile: "testorgschannel", ChannelID: channelName}
		err := fabricconfiguration.CreateConfigtx(&configtxgen, config)
		if err != nil {
			return err
		}

		for j := 0; j < len(config.PeerOrganizations); j++ {
			outputPath = paths.JoinPath(artifactsLocation, fmt.Sprintf("%s%sanchor.tx", channelName, config.PeerOrganizations[j].Name))
			cryptoConfigPath := paths.CryptoConfigDir(config.ArtifactsLocation)
			configtxgen := fabricconfiguration.Configtxgen{
				OutputAnchorPeersUpdate: outputPath,
				Profile:                 "testorgschannel",
				ChannelID:               channelName,
				OrgName:                 config.PeerOrganizations[j].Name,
				ArtifactsLocation:       cryptoConfigPath,
			}
			err := fabricconfiguration.CreateConfigtx(&configtxgen, config)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
