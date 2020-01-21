package system_test

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	. "github.com/onsi/ginkgo"
	"github.com/onsi/ginkgo/reporters"
	. "github.com/onsi/gomega"
)

func TestSystemTest(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_k8s_long_run.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "K8s 12Hr Long Run", []Reporter{junitReporter})
}

func movePTEReportFile(fileName, logsDir string) {
	fabricTestDir, _ := getFabricTestDir()
	pteScriptsDir := filepath.Join(fabricTestDir, "tools/PTE/CITest/scripts")
	networkclient.ExecuteCommand("node", []string{filepath.Join(pteScriptsDir, "get_pteReport.js"), "pteReport.txt"}, false)
	pteReportFilePath := filepath.Join(logsDir, fileName)
	if _, err := os.Stat(logsDir); os.IsNotExist(err) {
		os.MkdirAll(logsDir, os.ModePerm)
	}
	_ = os.Rename("pteReport.txt", pteReportFilePath)
}

func getTestStatusFromReportFile(filePath string) string {

	invokeStatus := "INVOKE Overall TEST RESULTS PASSED"
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Sprintf("%s", err)
	}
	fileData := string(data)
	if strings.Contains(fileData, invokeStatus) {
		return invokeStatus
	}
	return "Overall TEST RESULTS FAILED"
}

func getFabricTestDir() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return currentDir, err
	}
	fabricTestPath := path.Join(currentDir, "../../")
	return fabricTestPath, nil
}

var _ = Describe("Systemtest", func() {
	var (
		inputSpecPath        string
		kubeconfig           string
		envVariableExists    bool
		err                  error
		logsDir              string
		expectedInvokeStatus string
		fabricTestDir        string
		testDataDir          string
		testStatus           string
		pteReportFilePath    string
	)

	BeforeSuite(func() {
		fabricTestDir, _ = getFabricTestDir()
		logsDir = filepath.Join(fabricTestDir, "regression/weekly/Logs/")
		testDataDir = filepath.Join(fabricTestDir, "tools/operator/testdata")
		expectedInvokeStatus = "INVOKE Overall TEST RESULTS PASSED"
		kubeconfig, envVariableExists = os.LookupEnv("KUBECONFIG")
		Expect(envVariableExists).To(Equal(true))
	})

	/*
		Running K8s system tests with kafka network using couchDB
		as database and enabling TLS
	*/
	Describe("Kafka_Couchdb_TLS", func() {
		It("Step 1: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "12hr80tps4org2chan-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 2: Launching the network", func() {
			err = launcher.Launcher("up", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 3: Creating channels and joining peers to channel", func() {
			inputSpecPath = filepath.Join(testDataDir, "12hr80tps4org2chan-test-input.yml")
			By("Creating the channels")
			err = testclient.Testclient("create", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Joining peers to the channels")
			err = testclient.Testclient("join", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 4: Installing and Instantiating samplecc and samplejs chaincodes", func() {
			By("Installing samplecc and smplejs chaincode")
			err = testclient.Testclient("install", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Instantiating samplecc and samplejs chiancode")
			err = testclient.Testclient("instantiate", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 5: Performing invokes and queries using samplecc chaincode", func() {
			By("Sending invokes for samplecc")
			err = testclient.Testclient("invoke", inputSpecPath)
			movePTEReportFile("sampleccInvokesPteReport.txt", logsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(logsDir, "sampleccInvokesPteReport.txt")
			testStatus = getTestStatusFromReportFile(pteReportFilePath)
			Expect(testStatus).To(Equal(expectedInvokeStatus))
		})

		It("Step 6: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "12hr80tps4org2chan-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})

})