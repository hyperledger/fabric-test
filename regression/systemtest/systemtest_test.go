package systemtest

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	. "github.com/onsi/ginkgo"
	"github.com/onsi/ginkgo/reporters"
	. "github.com/onsi/gomega"
)

func TestSystemTest(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_system-test-suite.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "System Test Suite", []Reporter{junitReporter})
}

var _ = Describe("Systemtest", func() {
	var (
		inputSpecPath        string
		kubeconfig           string
		envVariableExists    bool
		err                  error
		network              nl.Network
		kafkaTLSLogsDir      string
		raftMutualLogsDir    string
		kafkaNoTLSLogsDir    string
		expectedInvokeStatus string
		expectedQueryStatus  string
		fabricTestDir        string
		testDataDir          string
		testStatus           string
		pteReportFilePath    string
		targetPeers          string
	)

	BeforeSuite(func() {
		fabricTestDir, _ = GetFabricTestDir()
		kafkaTLSLogsDir = filepath.Join(fabricTestDir, "regression/systemtest/Logs/kafka_couch_tls")
		kafkaNoTLSLogsDir = filepath.Join(fabricTestDir, "regression/systemtest/Logs/kafka_level_no_tls")
		raftMutualLogsDir = filepath.Join(fabricTestDir, "regression/systemtest/Logs/raft_mutual_tls")
		testDataDir = filepath.Join(fabricTestDir, "tools/operator/testdata")
		expectedInvokeStatus = "INVOKE Overall TEST RESULTS PASSED"
		expectedQueryStatus = "QUERY Overall TEST RESULTS PASSED"
		kubeconfig, envVariableExists = os.LookupEnv("KUBECONFIG")
		Expect(envVariableExists).To(Equal(true))
	})

	/*
		Running K8s system tests with kafka network using couchDB
		as database and enabling TLS
	*/
	Describe("Kafka_Couchdb_TLS", func() {
		It("Step 1: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "kafka-couchdb-tls-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 2: Launching the network", func() {
			err = launcher.Launcher("up", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 3: Creating channels and joining peers to channel", func() {
			inputSpecPath = filepath.Join(testDataDir, "test-input.yml")
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
			MovePTEReportFile("sampleccInvokesPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "sampleccInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplecc")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("sampleccQueriesPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "sampleccQueriesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		It("Step 6: Performing invokes and queries using samplejs chaincode", func() {
			inputSpecPath = filepath.Join(testDataDir, "samplejs-test-input.yml")
			By("Sending invokes for samplejs")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplejsInvokesPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "samplejsInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplejs")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("samplejsQueriesPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "samplejsQueriesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		It("Step 7: Sbe chiancode", func() {
			inputSpecPath = filepath.Join(testDataDir, "sbecc-test-input.yml")
			By("Installing sbe chaincode")
			err = testclient.Testclient("install", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Instantiating sbe chaincode")
			err = testclient.Testclient("instantiate", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Sending invokes for sbecc")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("sbeInvokesPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "sbeInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
		})

		It("Step 8: Sending 8 MB invoke using samplecc chaincode", func() {
			inputSpecPath = filepath.Join(testDataDir, "samplecc-8MB-test-input.yml")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplecc8MBInvokesPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 9: Migrating to etcdraft", func() {
			inputSpecPath = filepath.Join(fabricTestDir, "tools/operator/templates/input.yaml")
			config, err := network.GetConfigData(inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
			err = networkclient.MigrateToRaft(config, kubeconfig)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 10: Performing invokes and queries using samplecc chaincode after migrating to etcdraft", func() {
			inputSpecPath = filepath.Join(testDataDir, "kafka-couchdb-tls-test-input.yml")
			By("Sending invokes for samplecc")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("sampleccInvokesAfterMigrationPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "sampleccInvokesAfterMigrationPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplecc")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("sampleccQueriesAfterMigrationPteReport.txt", kafkaTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaTLSLogsDir, "sampleccQueriesAfterMigrationPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		It("Step 11: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "kafka-couchdb-tls-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})

	/*
		Running K8s system tests with raft network using couchDB
		as database and with mutual TLS and service discovery
	*/
	Describe("Raft_CouchDB_MutualTLS_ServiceDiscovery", func() {
		targetPeers = "Discovery"
		It("Step 1: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "raft-couchdb-mutualtls-servdisc-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 2: Launching the network", func() {
			err = launcher.Launcher("up", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 3: Creating channels and joining peers to channel", func() {
			err = ChangeTargetPeers(testDataDir, "test-input.yml", targetPeers)
			Expect(err).NotTo(HaveOccurred())
			inputSpecPath = filepath.Join(testDataDir, "discovery-test-input.yml")
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
			MovePTEReportFile("sampleccInvokesPteReport.txt", raftMutualLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(raftMutualLogsDir, "sampleccInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplecc")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("sampleccQueriesPteReport.txt", raftMutualLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(raftMutualLogsDir, "sampleccQueriesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
			err = RemoveTemporaryFile(inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 6: Performing invokes and queries using samplejs chaincode", func() {
			err = ChangeTargetPeers(testDataDir, "samplejs-test-input.yml", targetPeers)
			Expect(err).NotTo(HaveOccurred())
			inputSpecPath = filepath.Join(testDataDir, "discovery-samplejs-test-input.yml")
			By("Sending invokes for samplejs")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplejsInvokesPteReport.txt", raftMutualLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(raftMutualLogsDir, "samplejsInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplejs")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("samplejsQueriesPteReport.txt", raftMutualLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(raftMutualLogsDir, "samplejsQueriesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
			err = RemoveTemporaryFile(inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 7: Sending 8 MB invoke using samplecc chaincode", func() {
			err = ChangeTargetPeers(testDataDir, "samplecc-8MB-test-input.yml", targetPeers)
			Expect(err).NotTo(HaveOccurred())
			inputSpecPath = filepath.Join(testDataDir, "discovery-samplecc-8MB-test-input.yml")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplecc8MBInvokesPteReport.txt", raftMutualLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(raftMutualLogsDir, "samplecc8MBInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			err = RemoveTemporaryFile(inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 8: Sending 50 MB invoke using samplecc chaincode", func() {
			err = ChangeTargetPeers(testDataDir, "samplecc-50MB-test-input.yml", targetPeers)
			Expect(err).NotTo(HaveOccurred())
			inputSpecPath = filepath.Join(testDataDir, "discovery-samplecc-50MB-test-input.yml")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplecc50MBInvokesPteReport.txt", raftMutualLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(raftMutualLogsDir, "samplecc50MBInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
			err = RemoveTemporaryFile(inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 9: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "raft-couchdb-mutualtls-servdisc-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})

	/*
		Running K8s system tests with kafka network using levelDB
		as database and disabling TLS
	*/
	Describe("Kafka_Leveldb_NoTLS", func() {
		It("Step 1: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "kafka-leveldb-notls-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 2: Launching the network", func() {
			err = launcher.Launcher("up", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Step 3: Creating channels and joining peers to channel", func() {
			inputSpecPath = filepath.Join(testDataDir, "test-input.yml")
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
			MovePTEReportFile("sampleccInvokesPteReport.txt", kafkaNoTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaNoTLSLogsDir, "sampleccInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplecc")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("sampleccQueriesPteReport.txt", kafkaNoTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaNoTLSLogsDir, "sampleccQueriesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		It("Step 6: Performing invokes and queries using samplejs chaincode", func() {
			inputSpecPath = filepath.Join(testDataDir, "samplejs-test-input.yml")
			By("Sending invokes for samplejs")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplejsInvokesPteReport.txt", kafkaNoTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaNoTLSLogsDir, "samplejsInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))

			By("Sending queries for samplejs")
			err = testclient.Testclient("query", inputSpecPath)
			MovePTEReportFile("samplejsQueriesPteReport.txt", kafkaNoTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaNoTLSLogsDir, "samplejsQueriesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "query")
			Expect(testStatus).To(Equal(expectedQueryStatus))
		})

		It("Step 7: Sending 8 MB invoke using samplecc chaincode", func() {
			inputSpecPath = filepath.Join(testDataDir, "samplecc-8MB-test-input.yml")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplecc8MBInvokesPteReport.txt", kafkaNoTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaNoTLSLogsDir, "samplecc8MBInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
		})

		It("Step 8: Sending 50 MB invoke using samplecc chaincode", func() {
			inputSpecPath = filepath.Join(testDataDir, "samplecc-50MB-test-input.yml")
			err = testclient.Testclient("invoke", inputSpecPath)
			MovePTEReportFile("samplecc50MBInvokesPteReport.txt", kafkaNoTLSLogsDir)
			Expect(err).NotTo(HaveOccurred())
			pteReportFilePath = filepath.Join(kafkaNoTLSLogsDir, "samplecc50MBInvokesPteReport.txt")
			testStatus = GetTestStatusFromReportFile(pteReportFilePath, "invoke")
			Expect(testStatus).To(Equal(expectedInvokeStatus))
		})

		It("Step 9: Tearing the network", func() {
			inputSpecPath = filepath.Join(testDataDir, "kafka-leveldb-notls-network-spec.yml")
			err = launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})
})
