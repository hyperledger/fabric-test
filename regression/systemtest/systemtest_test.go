package system_test

import (
	"os"
	"testing"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
	"github.com/onsi/ginkgo/reporters"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
)

func TestSystemTest(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_system-test-suite.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "System Test Suite", []Reporter{junitReporter})
}

var _ = Describe("Systemtest", func() {
	var (
		inputSpecPath     string
		kubeconfig        string
		envVariableExists bool
	)

	BeforeSuite(func() {
		kubeconfig, envVariableExists = os.LookupEnv("KUBECONFIG")
		Expect(envVariableExists).To(Equal(true))
	})

	/*
		Running K8s system tests with kafka network using couchDB
		as database and enabling TLS
	*/
	Describe("Kafka_Couchdb_TLS", func() {
		It("Kafka_Couchdb_TLS", func() {

			inputSpecPath = "../../tools/operator/testdata/kafka-couchdb-tls/network-spec.yml"
			By("Step 1: Tearing the network")
			err := launcher.Launcher("down", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Step 2: Launching the network")
			err = launcher.Launcher("up", "k8s", kubeconfig, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			inputSpecPath = "../../tools/operator/testdata/kafka-couchdb-tls/samplecc-input.yml"
			By("Step 3: Creating the channels")
			err = testclient.Testclient("create", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Step 4: Joining peers to the channels")
			err = testclient.Testclient("join", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			// By("Step 5: Installing samplecc and smplejs chaincode")
			// err := testclient.Testclient("install", inputSpecPath)
			// Expect(err).NotTo(HaveOccurred())

			// By("Step 6: Instantiating samplecc and samplejs chiancode")
			// err = testclient.Testclient("instantiate", inputSpecPath)
			// Expect(err).NotTo(HaveOccurred())

			// By("Step 7: Sending invokes for samplecc")
			// err := testclient.Testclient("invoke", inputSpecPath)
			// Expect(err).NotTo(HaveOccurred())

			// By("Step 8: Sending queries for samplecc")
			// err := testclient.Testclient("query", inputSpecPath)
			// Expect(err).NotTo(HaveOccurred())

			inputSpecPath = "../../tools/operator/testdata/kafka-couchdb-tls/samplejs-input.yml"

			// By("Step 9: Sending invokes for samplejs")
			// err := testclient.Testclient("invoke", inputSpecPath)
			// Expect(err).NotTo(HaveOccurred())

			// By("Step 10: Sending queries for samplejs")
			// err = testclient.Testclient("query", inputSpecPath)
			// Expect(err).NotTo(HaveOccurred())

			inputSpecPath = "../../tools/operator/testdata/kafka-couchdb-tls/sbecc-input.yml"

			By("Step 11: Installing sbe chaincode")
			err = testclient.Testclient("install", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Step 12: Instantiating sbe chaincode")
			err = testclient.Testclient("instantiate", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("Step 13: Sending invokes for sbecc")
			err = testclient.Testclient("invoke", inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})
})
