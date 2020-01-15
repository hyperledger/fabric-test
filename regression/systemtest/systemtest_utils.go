package systemtest

import (
	"os"
	"io/ioutil"
	"fmt"
	"path"
	"strings"
	"path/filepath"
	"gopkg.in/yaml.v2"

	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
)

//MovePTEReportFile -- Move pteReport file after the test is executed
func MovePTEReportFile(fileName, logsDir string) {
	fabricTestDir, _ := GetFabricTestDir()
	pteScriptsDir := filepath.Join(fabricTestDir, "tools/PTE/CITest/scripts")
	networkclient.ExecuteCommand("node", []string{filepath.Join(pteScriptsDir, "get_pteReport.js"), "pteReport.txt"}, false)
	pteReportFilePath := filepath.Join(logsDir, fileName)
	if _, err := os.Stat(logsDir); os.IsNotExist(err) {
		os.MkdirAll(logsDir, os.ModePerm)
	}
	_ = os.Rename("pteReport.txt", pteReportFilePath)
}

//GetTestStatusFromReportFile -- To get the status of the test, once it is executed
func GetTestStatusFromReportFile(filePath, action string) string {

	invokeStatus := "INVOKE Overall TEST RESULTS PASSED"
	queryStatus := "QUERY Overall TEST RESULTS PASSED"
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Sprintf("%s", err)
	}
	fileData := string(data)
	switch action {
	case "invoke":
		if strings.Contains(fileData, invokeStatus) {
			return invokeStatus
		}
	case "query":
		if strings.Contains(fileData, queryStatus) {
			return queryStatus
		}
	}
	return "Overall TEST RESULTS FAILED"
}

//GetFabricTestDir -- To get the root directory of the fabric-test
func GetFabricTestDir() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return currentDir, err
	}
	fabricTestPath := path.Join(currentDir, "../../")
	return fabricTestPath, nil
}

//ChangeTargetPeers -- To change the tagetPeers option and creates a temporary test-input.yml file
func ChangeTargetPeers(testFilePath, testFileName, targetPeersType string) error {
	var config inputStructs.Config
	var err error
	yamlFile, err := ioutil.ReadFile(testFilePath)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		return err
	}
	for key := range config.Invoke {
		config.Invoke[key].TargetPeers = targetPeersType
	}
	for key := range config.Query {
		config.Query[key].TargetPeers = targetPeersType
	}
	yamlBytes, err := yaml.Marshal(config)
	if err != nil {
		return err
	}
	err = ioutil.WriteFile(fmt.Sprintf("%s_%s", strings.ToLower(targetPeersType), testFileName), yamlBytes, 0644)
	if err != nil {
		return err
	}
	return err
}

//RemoveTemporaryFile -- To remove the temporary test-input.yaml file
func RemoveTemporaryFile(filePath string) error{
	err := os.Remove(filePath)
	if err != nil{
		return err
	}
	return err
}