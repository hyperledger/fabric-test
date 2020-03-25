package simple_test

import (
	"path"

	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Simple Performance Test", func() {

	var (
		inputSpecPath string
	)

	It("Runs Simple Performance Tests)", func() {

		fabricTestDir, _ = getFabricTestDir()
		testDataDir = path.Join(fabricTestDir, "systemtest/testdata")

		inputSpecPath = path.Join(testDataDir, "simple-test-input.yml")

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

		By("5)Sending Invokes")
		action = "invoke"
		err = testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		By("6)Sending Queries")
		action = "query"
		err = testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

	})
})
