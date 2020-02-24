package operations

import (
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//DoCommandAction --
func DoCommandAction(config inputStructs.Config) error {

	var err error
	for index := 0; index < len(config.CommandOptions); index++ {
		args := config.CommandOptions[index].Args
		name := config.CommandOptions[index].Name
		_, err = networkclient.ExecuteCommand(name, args, true)
		if err != nil {
			return err
		}
	}
	return nil
}
