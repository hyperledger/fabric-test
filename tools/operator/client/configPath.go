package client

import (
	"fmt"
	"log"
	"os"

	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

//CreateConfigPath - to check if the configtx.yaml exists and generates one if not exists
func CreateConfigPath() {

	configPath := "./configFiles"
	_, err := os.Stat(fmt.Sprintf("%v/configtx.yaml", configPath))
	if os.IsNotExist(err) {
		yttPath := "./launcher/ytt"
		_, err = os.Stat(yttPath)
		if os.IsNotExist(err) {
			utils.DownloadYtt()
			err = ExecuteCommand("./ytt", "-f", "./templates/configtx.yaml", "-f", "configtx.yaml", "--output", configPath)
			if err != nil {
				log.Fatalf("failed to create configtx.yaml, err=%v", err)
			}
		} else {
			err = ExecuteCommand(yttPath, "-f", "./templates/configtx.yaml", "-f", "configtx.yaml", "--output", configPath)
			if err != nil {
				log.Fatalf("failed to create configtx.yaml, err=%v", err)
			}
		}
	}
}
