package networkclient

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-test/tools/operator/paths"
	ytt "github.com/hyperledger/fabric-test/tools/operator/ytt-helper"
)

//CreateConfigTxYaml - to check if the configtx.yaml exists and generates one if not exists
func CreateConfigTxYaml() error {

	var err error
	configFilesDir := paths.ConfigFilesDir(false)
	configtxTemplatePath := paths.TemplateFilePath("configtx")
	inputFilePath := paths.TemplateFilePath("input")
	configtxPath := paths.ConfigFilePath("configtx")
	if _, err = os.Stat(configtxPath); !os.IsNotExist(err) {
		return nil
	}
	yttPath := fmt.Sprintf("%s/ytt", paths.YTTPath())
	input := []string{configtxTemplatePath}
	yttObject := ytt.YTT{InputPath: inputFilePath, OutputPath: configFilesDir}
	if _, err = os.Stat(yttPath); os.IsNotExist(err) {
		err = yttObject.DownloadYtt()
		if err != nil {
			return err
		}
	}
	_, err = ExecuteCommand(yttPath, yttObject.Args(input), true)
	if err != nil {
		return err
	}
	return nil
}
