package basicnetwork_test

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Basic Network Test Suite", func() {

	var (
		action        string
		inputSpecPath string
		err           error
	)

	Describe("Running basic network test suite using testdata/basic-test-input.yml", func() {
		BeforeEach(func() {
			inputSpecPath = "../../tools/operator/testdata/basic-test-input.yml"

			By("1) Creating channel")
			action = "create"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("2) Joining Peers to channel")
			action = "join"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("3) Updating channel with anchor peers")
			action = "anchorpeer"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("4) Installing Chaincode on Peers")
			action = "install"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("5) Instantiating Chaincode")
			action = "instantiate"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})

		It("Invoke and Query transactions for samplecc and mapcc using testdata/basic-test-input.yml", func() {
			inputSpecPath = "../../tools/operator/testdata/basic-test-input.yml"

			By("1) Sending Queries")
			action = "query"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("2) Sending Invokes")
			action = "invoke"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})
})
