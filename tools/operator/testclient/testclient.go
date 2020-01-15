package testclient

import (
	"io/ioutil"
	"strings"
	"path/filepath"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/operations"
	"github.com/pkg/errors"
	yaml "gopkg.in/yaml.v2"
)

func validateArguments(testInputFilePath string) error {

	if testInputFilePath == "" {
		return errors.New("Input file not provided")
	}
	return nil
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

func doAction(action string, config inputStructs.Config, testInputFilePath string) error {

	var actions []string
	var err error
	var connectionProfileFileContents []byte
	tls := "disabled"
	supportedActions := "create|anchorpeer|join|install|instantiate|upgrade|invoke|query"
	if strings.HasSuffix(config.Organizations[0].ConnProfilePath, "yaml") || strings.HasSuffix(config.Organizations[0].ConnProfilePath, "yml") {
		connectionProfileFileContents, err = ioutil.ReadFile(config.Organizations[0].ConnProfilePath)
	} else {
		files, err := ioutil.ReadDir(config.Organizations[0].ConnProfilePath)
		if err != nil {
			return errors.Errorf("Failed to read the connection profiles directory; Error: %s", err)
		}
		connectionProfileFileContents, err = ioutil.ReadFile(filepath.Join(config.Organizations[0].ConnProfilePath, files[0].Name()))
	}
	if err != nil {
		return errors.Errorf("Failed to read the connection profile file; Error: %s", err)
	}
	if strings.Contains(string(connectionProfileFileContents), "grpcs") {
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
				return err
			}
		case "install":
			var installCCUIObject operations.InstallCCUIObject
			err := installCCUIObject.InstallCC(config, tls)
			if err != nil {
				return err
			}
		case "instantiate", "upgrade":
			var instantiateCCUIObject operations.InstantiateCCUIObject
			err := instantiateCCUIObject.InstantiateCC(config, tls, action)
			if err != nil {
				return err
			}
		case "invoke", "query":
			var invokeQueryUIObject operations.InvokeQueryUIObject
			err := invokeQueryUIObject.InvokeQuery(config, tls, strings.Title(action))
			if err != nil {
				return err
			}
		default:
			return errors.Errorf("Incorrect Unknown ( %s ).Supported actions: %s ", action, supportedActions)
		}
	}
	return nil
}

func Testclient(action, testInputFilePath string) error {

	err := validateArguments(testInputFilePath)
	if err != nil {
		logger.ERROR("Failed to validate arguments")
		return err
	}

	config, err := GetInputData(testInputFilePath)
	if err != nil {
		logger.ERROR("Failed to get configuration data from testInputFilePath = ", testInputFilePath)
		return err
	}

	if action == "" {
		action = "all"
	}

	err = doAction(action, config, testInputFilePath)
	if err != nil {
		logger.ERROR("Failed to perform ", action, " action, testInputFilePath = ", action, testInputFilePath)
		return err
	}
	return nil
}
