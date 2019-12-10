package daily_test

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"strings"
	"testing"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	. "github.com/onsi/ginkgo"
	"github.com/onsi/ginkgo/reporters"
	. "github.com/onsi/gomega"
)

func TestPTEDaily(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_daily_pte-test-suite.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "NL+PTE Test Suite", []Reporter{junitReporter})
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

var _ = Describe("NL+PTE Test Suite", func() {

	var (
		fabricTestDir        string
		expectedInvokeStatus string
		expectedQueryStatus  string
	)

	BeforeSuite(func() {
		fmt.Println("===================================")
		fabricTestDir, _ = getFabricTestDir()
		expectedInvokeStatus = "INVOKE Overall TEST RESULTS PASSED"
		expectedQueryStatus = "QUERY Overall TEST RESULTS PASSED"
		scenariosDir := path.Join(fabricTestDir, "tools/PTE/CITest/scenarios")
		err := os.Chdir(scenariosDir)
		Expect(err).NotTo(HaveOccurred())
	})

	Describe("Running performance measurement tests with CouchDB and TLS", func() {

		/*
		   Description:
		   TPS performance measurement test with CouchDB and TLS.
		   - This scenario launches a network, as defined below,
		     and runs two tests - for invokes, and for queries -
		     on single host using networkLauncher (after removing
		     any existing network and artifacts).

		   Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
		     1 Channel, 1 chaincode (sample_cc), 2 threads, TLS enabled

		   Part 1: FAB-3833
		   - Use PTE in Stress Mode to continuously send INVOKE
		     transactions concurrently to 1 peer in both orgs,
		   - Ensure events are raised for each Tx (indicating
		     each was written to ledger)

		   Part 2: FAB-3810
		   - Same as Part 1 - but use QUERY instead of INVOKE

		   Part 3: Count TXs and calculate results for both testcases in this scenario

		   Logs Artifacts Locations, PTE Testcase Logs:
		       fabric-test/tools/PTE/CITest/Logs/FAB-3833-2i-pteReport.log
		       fabric-test/tools/PTE/CITest/Logs/FAB-3833-2i-<MMDDHHMMSS>.log
		       fabric-test/tools/PTE/CITest/Logs/FAB-3810-2q-<MMDDHHMMSS>.log
		*/
		It("test_FAB3833_2i_FAB3810_2q", func() {
			_, err := networkclient.ExecuteCommand("./FAB-3833-2i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-3833-2i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		/*
					Description:
			        TPS performance measurement test with CouchDB and TLS.
			        - This scenario launches a network, as defined below,
			          and runs two tests - for invokes, and for queries -
			          on single host using networkLauncher (after removing
			          any existing network and artifacts).

			        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
			          1 Channel, 1 chaincode (sample_cc), 4 threads, TLS enabled

			        Part 1: FAB-3832
			        - Use PTE in Stress Mode to continuously send INVOKE
			          transactions concurrently to 1 peer in both orgs,
			        - Ensure events are raised for each Tx (indicating
			          each was written to ledger)

			        Part 2: FAB-3834
			        - Same as Part 1 - but use QUERY instead of INVOKE

			        Part 3: Count TXs and calculate results for both testcases in this scenario

					Logs Artifacts Locations, PTE Testcase Logs:
			            fabric-test/tools/PTE/CITest/Logs/FAB-3832-4i-pteReport.log
			            fabric-test/tools/PTE/CITest/Logs/FAB-3832-4i-<MMDDHHMMSS>.log
			            fabric-test/tools/PTE/CITest/Logs/FAB-3834-4q-<MMDDHHMMSS>.log
		*/
		It("test_FAB3832_4i_FAB3834_4q", func() {
			_, err := networkclient.ExecuteCommand("./FAB-3832-4i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-3832-4i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		/*
					Description:
			        Launch standard network with couchdb using 1 channel and marbles02 cc.
			            FAB-6813-4i 4 threads x 1000 invokes (initMarble)
			        followed by three sets of queries:
			            FAB-8199-4q: 4 threads queries: readMarble
			            FAB-8200-4q: 4 threads rich queries: queryMarblesByOwner
			            FAB-8201-4q: 4 threads rich queries: queryMarbles

			        This test uses indexing for the rich queries, by including a metadataPath
			        for index files during the install step. This is the only difference between
			        this and FAB8192, which does not use indexing for the queries and runs much slower.
		*/
		It("test_FAB6813_4i_marbles_FAB8199_4q_FAB8200_4q_FAB8201_4q", func() {
			_, err := networkclient.ExecuteCommand("./FAB-6813-4i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-6813-4i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			pteReportFilePath = path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-8199-4q-pteReport.log")
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
			pteReportFilePath = path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-8200-4q-pteReport.log")
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
			pteReportFilePath = path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-8201-4q-pteReport.log")
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})
	})

	Describe("Running performance measurement tests with LevelDB and TLS", func() {

		/*
					Description:
			        TPS performance measurement test with levelDB and TLS.
			        - This scenario launches a network, as defined below,
			          and runs two tests - for invokes, and for queries -
			          on single host using networkLauncher (after removing
			          any existing network and artifacts).

			        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
			          1 Channel, 1 chaincode (sample_cc), 2 threads, TLS enabled

			        Part 1: FAB-3808
			        - Use PTE in Stress Mode to continuously send INVOKE
			          transactions concurrently to 1 peer in both orgs,
			        - Ensure events are raised for each Tx (indicating
			          each was written to ledger)

			        Part 2: FAB-3811
			        - Same as Part 1 - but use QUERY instead of INVOKE

					Part 3: Count TXs and calculate results for both testcases in this scenario

			        Logs Artifacts Locations, PTE Testcase Logs:
			            fabric-test/tools/PTE/CITest/Logs/FAB-3808-2i-pteReport.log
			            fabric-test/tools/PTE/CITest/Logs/FAB-3808-2i-<MMDDHHMMSS>.log
			            fabric-test/tools/PTE/CITest/Logs/FAB-3811-2q-<MMDDHHMMSS>.log

		*/
		It("test_FAB3808_2i_FAB3811_2q", func() {
			_, err := networkclient.ExecuteCommand("./FAB-3808-2i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-3808-2i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		/*
					Description:
			        TPS performance measurement test with levelDB and TLS.
			        - This scenario launches a network, as defined below,
			          and runs two tests - for invokes, and for queries -
			          on single host using networkLauncher (after removing
			          any existing network and artifacts).

			        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
			          1 Channel, 1 chaincode (sample_cc), 4 threads, TLS enabled

			        Part 1: FAB-3807
			        - Use PTE in Stress Mode to continuously send INVOKE
			          transactions concurrently to 1 peer in both orgs,
			        - Ensure events are raised for each Tx (indicating
			          each was written to ledger)

			        Part 2: FAB-3835
			        - Same as Part 1 - but use QUERY instead of INVOKE

					Part 3: Count TXs and calculate results for both testcases in this scenario

			        Logs Artifacts Locations, PTE Testcase Logs:
			            fabric-test/tools/PTE/CITest/Logs/FAB-3807-4i-pteReport.log
			            fabric-test/tools/PTE/CITest/Logs/FAB-3807-4i-<MMDDHHMMSS>.log
			            fabric-test/tools/PTE/CITest/Logs/FAB-3835-4q-<MMDDHHMMSS>.log
		*/
		It("test_FAB3807_4i_FAB3835_4q", func() {
			_, err := networkclient.ExecuteCommand("./FAB-3807-4i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-3807-4i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		/*
			Description:
			FAB-7329 channel events, 1 ch NodeJS cc, 4 thrds x 10000
		*/
		It("test_FAB7329_4i_channel_events", func() {
			_, err := networkclient.ExecuteCommand("./FAB-7329-4i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-7329-4i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
		})

		/*
					Description:
			        FAB-7333 filtered block events, 1 ch NodeJS cc, 4 thrds x 10000
		*/
		It("test_FAB7333_4i_filtered_block_events", func() {
			_, err := networkclient.ExecuteCommand("./FAB-7333-4i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-7333-4i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
		})

		/*
		   Description:
		   FAB-7647-1i.sh latency for single thread, 1 transaction at a time sequentially, batchSize 1
		*/
		It("test_FAB7647_1i_latency", func() {
			_, err := networkclient.ExecuteCommand("./FAB-7647-1i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-7647-1i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})
	})

	Describe("Running Functional and TPS performance measurement test", func() {

		/*
		   Description:
		   Functional and TPS performance measurement test.
		   - This scenario launches a network, as defined below,
		     and runs two tests - for invokes, and for queries -
		     on single host using networkLauncher (after removing
		     any existing network and artifacts).

		   Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org, TLS enabled
		     LevelDB, 4 Channels, 1 chaincode (sample_cc), 8 threads total

		   Part 1:
		   - Use PTE in Constant Stress Mode to continuously send INVOKE
		     transactions concurrently to 1 peer in both orgs,
		     for each of the 4 channels (8 threads total, each
		     send 100 transaction proposals)
		   - Register a listener to receive an event for each
		     Block (not per transaction) per
		     Channel (full block events - not filtered blocks)
		   - Count TXs and ensure events are received for each one (indicating
		     each was written to ledger successfully) and calculate TPS results

		   Part 2:
		   - QUERY all the invoked transactions
		   - Count successes and calculate TPS results

		   Logs Artifacts Locations, PTE Testcase Logs:
		       fabric-test/tools/PTE/CITest/Logs/FAB-7929-8i-pteReport.log
		       fabric-test/tools/PTE/CITest/Logs/FAB-7929-8i-<MMDDHHMMSS>.log
		       fabric-test/tools/PTE/CITest/Logs/FAB-7929-8q-<MMDDHHMMSS>.log
		*/
		It("test_FAB7929_8i", func() {
			_, err := networkclient.ExecuteCommand("./FAB-7929-8i.sh", []string{}, true)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath := path.Join(fabricTestDir, "tools/PTE/CITest/Logs/FAB-7929-8i-pteReport.log")
			testStatus := getTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			testStatus = getTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})
	})

	AfterSuite(func() {
		fmt.Println("\n===================================")
		networkLauncherDir := path.Join(fabricTestDir, "tools/NL")
		err := os.Chdir(networkLauncherDir)
		Expect(err).NotTo(HaveOccurred())
		_, err = networkclient.ExecuteCommand("./networkLauncher.sh", []string{"-a", "down"}, true)
		dailyDir := path.Join(fabricTestDir, "regression/daily")
		err = os.Chdir(dailyDir)
		Expect(err).NotTo(HaveOccurred())
	})

})
