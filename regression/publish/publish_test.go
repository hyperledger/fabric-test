package smoke_test

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Publish Test Suite", func() {

	Describe("Running Publish Test Suite in fabric-test", func() {
		var (
			action        string
			inputSpecPath string
		)
		It("Running end to end (old cc lifecycle)", func() {
			inputSpecPath = "../testdata/publish-test-input.yml"

			By("1) Creating channel")
			action = "create"
			err := testclient.Testclient(action, inputSpecPath)
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

			By("6) Sending Invokes")
			action = "invoke"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("7) Sending Queries")
			action = "query"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("8) Upgrading Chaincode")
			action = "upgrade"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("9) Sending Queries")
			action = "query"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})
})
