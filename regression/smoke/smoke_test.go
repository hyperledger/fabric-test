package smoke_test

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	l "github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Smoke Test Suite", func() {

	Describe("Running Smoke Test Suite in fabric-test", func() {
		var (
			action          string
			inputSpecPath   string
			networkSpecPath string
		)
		It("Running end to end (old cc lifecycle)", func() {
			inputSpecPath = "../testdata/smoke-test-input.yml"
			networkSpecPath = "../testdata/smoke-network-spec.yml"

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

			By("6) Sending Queries")
			action = "query"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("7) Snapshot the ledger")
			action = "snapshot"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("8) Sending Invokes")
			action = "invoke"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("9) Adding new peer to the network")
			action = "addPeer"
			err = l.Launcher(action, "docker", "", networkSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("10) Upgrading Chaincode")
			action = "upgrade"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("11) Sending Queries")
			action = "query"
			testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("12) Join new peers using snapshot")
			action = "joinBySnapshot"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())

			By("13) Sending Invokes")
			action = "invoke"
			err = testclient.Testclient(action, inputSpecPath)
			Expect(err).NotTo(HaveOccurred())
		})
	})
})
