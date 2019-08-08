package client

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

//CreateConfigPath - to check if the configtx.yaml exists and generates one if not exists
func CreateConfigPath() error{

	var err error
	configPath := "./configFiles"
	_, err = os.Stat(fmt.Sprintf("%s/configtx.yaml", configPath))
	if os.IsNotExist(err) {
		yttPath := "./launcher/ytt"
		_, err = os.Stat(yttPath)
		if os.IsNotExist(err) {
			err = utils.DownloadYtt()
			if err != nil{
				return err
			}
			err = ExecuteCommand("./ytt", "-f", "./templates/configtx.yaml", "-f", "configtx.yaml", "--output", configPath)
			if err != nil {
				return err
			}
		} else {
			err = ExecuteCommand(yttPath, "-f", "./templates/configtx.yaml", "-f", "configtx.yaml", "--output", configPath)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
