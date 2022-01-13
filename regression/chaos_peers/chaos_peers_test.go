package chaos_peers_test

import (
	"path"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

var _ = Describe("Chaos Test", func() {

	var (
		inputSpecPath string
	)

	It("Running Chaos Test)", func() {

		fabricTestDir, _ = getFabricTestDir()
		testDataDir = path.Join(fabricTestDir, "regression/testdata")

		inputSpecPath = path.Join(testDataDir, "chaos-test-input.yml")

		By("1) Creating channel")
		action = "create"
		err := testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		By("2) Joining Peers to channel")
		action = "join"
		err = testclient.Testclient(action, inputSpecPath)
		Expect(err).NotTo(HaveOccurred())

		By("3) Defining Anchor Peers")
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

		// in regression/chaos_peers directory
		By("6) Starting chaos")
		_, err = networkclient.ExecuteCommand("./launch_chaos.sh", []string{}, true)
		Expect(err).NotTo(HaveOccurred())
	})
})
