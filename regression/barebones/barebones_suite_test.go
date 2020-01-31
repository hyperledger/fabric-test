package barebones_test

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"strings"
	"testing"

	. "github.com/onsi/ginkgo"
	"github.com/onsi/ginkgo/reporters"
	. "github.com/onsi/gomega"
)

func TestPTEBarebones(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_barebones-test-suite.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "Barebones Test Suite", []Reporter{junitReporter})
}

func getFabricTestDir() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return currentDir, err
	}
	fabricTestPath := path.Join(currentDir, "../../")
	return fabricTestPath, nil
}

func getTestStatusFromReportFile(filePath, action string) string {

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
