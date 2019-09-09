package main

import (
	"flag"
	"io/ioutil"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/operations"
	yaml "gopkg.in/yaml.v2"
)

var testInputFilePath = flag.String("i", "", "Input file for pte (Required)")
var action = flag.String("a", "", "Action to perform")

func validateArguments(testInputFilePath *string) {

	if *testInputFilePath == "" {
		logger.CRIT(nil, "Input file not provided")
	}
	if *action == "" {
		*action = "all"
	}
}

//GetInputData -- Read in the input data and parse the objects
func GetInputData(inputFilePath string) (inputStructs.Config, error) {

	var config inputStructs.Config
	yamlFile, err := ioutil.ReadFile(inputFilePath)
	if err != nil {
		logger.ERROR("Failed to read input file")
		return config, err
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		logger.ERROR("Failed to create config object")
		return config, err
	}
	return config, nil
}

func doAction(action string, config inputStructs.Config, testInputFilePath string) {

	var actions []string
	supportedActions := "create|anchorpeer|join|install|instantiate|upgrade|invoke|query"
	tls := config.TLS
	switch tls {
	case "true":
		tls = "enabled"
	case "false":
		tls = "disabled"
	case "mutual":
		tls = "clientauth"
	}
	if action == "all" {
		actions = append(actions, []string{"create", "anchorpeer", "join", "install", "instantiate"}...)
	} else {
		actions = append(actions, action)
	}
	for i := 0; i < len(actions); i++ {
		switch actions[i] {
		case "create", "join", "anchorpeer":
			var channelUIObject operations.ChannelUIObject
			err := channelUIObject.ChannelConfigs(config, tls, action)
			if err != nil {
				logger.CRIT(err, "Failed to perform ", action, "action on channels; testInputFilePath = ", testInputFilePath)
			}
		case "install":
			var installCCUIObject operations.InstallCCUIObject
			err := installCCUIObject.InstallCC(config, tls)
			if err != nil {
				logger.CRIT(err, "Failed to install chaincode; testInputFilePath = ", testInputFilePath)
			}
		case "instantiate", "upgrade":
			var instantiateCCUIObject operations.InstantiateCCUIObject
			err := instantiateCCUIObject.InstantiateCC(config, tls, action)
			if err != nil {
				logger.CRIT(err, "Failed to ", action, " chaincode; testInputFilePath = ", testInputFilePath)
			}
		case "invoke", "query":
			var invokeQueryUIObject operations.InvokeQueryUIObject
			err := invokeQueryUIObject.InvokeQuery(config, tls, strings.Title(action))
			if err != nil {
				logger.CRIT(err, "Failed to perform ", action, "; testInputFilePath = ", testInputFilePath)
			}
		default:
			logger.CRIT(nil, "Incorrect Unknown (", action, ").Supported actions:", supportedActions)
		}
	}
}

func main() {

	flag.Parse()
	validateArguments(testInputFilePath)
	config, err := GetInputData(*testInputFilePath)
	if err != nil {
		logger.CRIT(err)
	}
	doAction(*action, config, *testInputFilePath)
}
