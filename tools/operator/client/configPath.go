package client

import (
	"fmt"
	"os"
	"github.com/hyperledger/fabric-test/tools/operator/helper"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

//CreateConfigPath - to check if the configtx.yaml exists and generates one if not exists
func CreateConfigPath() error{

	var err error
	configPath := helper.ConfigFilesDir()
	configtxPath := helper.TemplateFilePath("configtx")
	_, err = os.Stat(fmt.Sprintf("%s/configtx.yaml", configPath))
	if os.IsNotExist(err) {
		yttPath := "./launcher/ytt"
		_, err = os.Stat(yttPath)
		if os.IsNotExist(err) {
			err = utils.DownloadYtt()
			if err != nil{
				return err
			}
			err = ExecuteCommand(helper.YTTPath(), "-f", configtxPath, "-f", "configtx.yaml", "--output", configPath)
			if err != nil {
				return err
			}
		} else {
			err = ExecuteCommand(yttPath, "-f", configtxPath, "-f", "configtx.yaml", "--output", configPath)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
