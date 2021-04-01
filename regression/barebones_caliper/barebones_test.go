package barebones_caliper_test

import (
	"path"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Barebones Caliper Test", func() {

	var (
		inputSpecPath string
	)

	It("Running barebones_caliper Test)", func() {

		fabricTestDir, _ = getFabricTestDir()
		testDataDir = path.Join(fabricTestDir, "regression/testdata")

		inputSpecPath = path.Join(testDataDir, "barebones-test-input.yml")

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

		By("5)Sending Caliper Invokes and Queries")
		caliperArgs := []string{
			"caliper",
			"launch",
			"main",
			"--caliper-workspace",
			".",
			"--caliper-benchconfig",
			"benchmarks/config_barebones.yaml",
			"--caliper-networkconfig",
			"caliper-connection-profile/caliper_connection_profile_org1.yaml",
			"--caliper-flow-only-test",
		}
		networkclient.ExecuteCommand("npx", caliperArgs, true)
	})
})
