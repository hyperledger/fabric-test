package barebones_test

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Barebones Test", func() {

	var (
		fabricTestDir        string
		testDataDir          string
		pteReportCmd         string
		pteReportTxt         string
		pteFinalReport       string
		expectedInvokeStatus string
		expectedQueryStatus  string

		action              string
		networkSpecPath     string
		inputSpecPath       string
		inputSpecPathMaster string

		kubeConfig    string
		envKubeConfig bool
		containerType string
	)

	BeforeEach(func() {
		// set up dir variables
		fabricTestDir, _ = getFabricTestDir()
		testDataDir = path.Join(fabricTestDir, "regression/testdata")
		pteReportCmd = path.Join(fabricTestDir, "tools/PTE/CITest/scripts/get_pteReport.js")
		pteReportTxt = path.Join(fabricTestDir, "regression/barebones/pteReport.txt")
		pteFinalReport = path.Join(fabricTestDir, "regression/barebones/barebones-pteReport.log")

		// set up input file variables
		networkSpecPath = path.Join(testDataDir, "barebones-network-spec.yml")
		inputSpecPathMaster = path.Join(testDataDir, "barebones-test-input-master.yml")
		inputSpecPath = path.Join(testDataDir, "barebones-test-input.yml")

		// set up test status variables
		expectedInvokeStatus = "INVOKE Overall TEST RESULTS PASSED"
		expectedQueryStatus = "QUERY Overall TEST RESULTS PASSED"

		// get kubeConfig from environment variable
		kubeConfig, envKubeConfig = os.LookupEnv("KUBECONFIG")
		if envKubeConfig {
			containerType = "k8s"
		} else {
			containerType = "docker"
		}

		// bring up network
		action = "up"
		err := launcher.Launcher(action, containerType, kubeConfig, networkSpecPath)
		Expect(err).NotTo(HaveOccurred())
	})

	AfterEach(func() {
		action = "down"
		err := launcher.Launcher(action, containerType, kubeConfig, networkSpecPath)
		Expect(err).NotTo(HaveOccurred())
	})

	It("Running barebones Test)", func() {

		// prepare PTE input for create/join channel and install/instantiate chaincode
		myKey := 0
		nProc := 1
		getPTEInput(inputSpecPathMaster, inputSpecPath, myKey, nProc)

		By("1) Creating channel")
		action = "create"
		err := testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		By("2) Joining Peers to channel")
		action = "join"
		err = testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		By("3) Installing Chaincode on Peers")
		action = "install"
		err = testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		By("4) Instantiating Chaincode")
		action = "instantiate"
		err = testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		nRequest := 10000
		myKey = 0

		outputFile, err := os.Create(pteFinalReport)
		Expect(err).NotTo(HaveOccurred())

		for nProc := 32; nProc <= 36; nProc += 4 {
			// prepare PTE input for sending transactions
			myKey += nRequest
			getPTEInput(inputSpecPathMaster, inputSpecPath, myKey, nProc)

			By("Sending Invokes")
			deleteFile(pteReportTxt)

			action = "invoke"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			_, err = networkclient.ExecuteCommand("node", []string{pteReportCmd, pteReportTxt}, true)
			data, err := ioutil.ReadFile(pteReportTxt)
			Expect(err).NotTo(HaveOccurred())
			_, err = outputFile.Write([]byte(data))
			Expect(err).NotTo(HaveOccurred())

			// check the test status
			testStatus := getTestStatusFromReportFile(pteReportTxt, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending Queries")
			deleteFile(pteReportTxt)

			Expect(err).NotTo(HaveOccurred())
			action = "query"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			_, err = networkclient.ExecuteCommand("node", []string{pteReportCmd, pteReportTxt}, true)
			data, err = ioutil.ReadFile(pteReportTxt)
			Expect(err).NotTo(HaveOccurred())
			_, err = outputFile.Write([]byte(data))
			Expect(err).NotTo(HaveOccurred())

			// check the test status
			testStatus = getTestStatusFromReportFile(pteReportTxt, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))

			err = os.Remove(pteReportTxt)
			Expect(testStatus).To(Equal(expectedQueryStatus))

		}

		deleteFile(pteReportTxt)
		outputFile.Close()

	})
})

// get PTE test input file
func getPTEInput(pteInputMaster string, pteInput string, keyStart int, nProc int) {
	// copy pte input from master
	_, err := networkclient.ExecuteCommand("cp", []string{pteInputMaster, pteInput}, true)
	Expect(err).NotTo(HaveOccurred())

	// prepare pte input
	subString := fmt.Sprintf(`s/_KEYSTART_/%d/g`, keyStart)
	_, err = networkclient.ExecuteCommand("sed", []string{"-i", "-e", subString, pteInput}, true)
	Expect(err).NotTo(HaveOccurred())

	subString = fmt.Sprintf(`s/_NPROCPERORG_/%d/g`, nProc)
	_, err = networkclient.ExecuteCommand("sed", []string{"-i", "-e", subString, pteInput}, true)
	Expect(err).NotTo(HaveOccurred())
}

// delete a file if exists
func deleteFile(filename string) {
	_, err := os.Stat(filename)
	if !os.IsNotExist(err) {
		err = os.Remove(filename)
		Expect(err).NotTo(HaveOccurred())
	}
}
