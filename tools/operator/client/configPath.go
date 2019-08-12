package client

import (
	"os"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

//CreateConfigPath - to check if the configtx.yaml exists and generates one if not exists
func CreateConfigPath() error {

	var err error
	configFilesDir := utils.ConfigFilesDir()
	configtxTemplatePath := utils.TemplateFilePath("configtx")
	inputFilePath := utils.TemplateFilePath("input")
	configtxPath := utils.ConfigFilePath("configtx")
	if _, err = os.Stat(configtxPath); !os.IsNotExist(err) {
		return nil
	} else {
		ytt := utils.YTTPath()
		input := []string{configtxTemplatePath}
		yttObject := utils.YTT{InputPath: inputFilePath, OutputPath: configFilesDir}
		if _, err = os.Stat(ytt); os.IsNotExist(err) {
			err = utils.DownloadYtt()
			if err != nil {
				return err
			}
		}
		_, err = ExecuteCommand(ytt, yttObject.Args(input), true)
		if err != nil {
			return err
		}
	}
	return nil
}