package barebones_caliper_test

import (
	"os"
	"path"
	"testing"

	. "github.com/onsi/ginkgo"
	"github.com/onsi/ginkgo/reporters"
	. "github.com/onsi/gomega"

	"github.com/hyperledger/fabric-test/tools/operator/launcher"
	"github.com/hyperledger/fabric-test/tools/operator/testclient"
)

func TestCaliperBarebones(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_barebones-caliper-test-suite.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "Barebones Caliper Test Suite", []Reporter{junitReporter})
}

func getFabricTestDir() (string, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return currentDir, err
	}
	fabricTestPath := path.Join(currentDir, "../../")
	return fabricTestPath, nil
}

// get kubeConfig from environment variable
func getKubeConfig() (string, string) {
	kubeConfig, envKubeConfig = os.LookupEnv("KUBECONFIG")
	if envKubeConfig {
		containerType = "k8s"
	} else {
		containerType = "docker"
	}
	return kubeConfig, containerType
}

var (
	fabricTestDir string
	testDataDir   string

	action          string
	networkSpecPath string

	kubeConfig    string
	envKubeConfig bool
	containerType string
)

var _ = BeforeSuite(func() {
	// set up dir variables
	fabricTestDir, _ = getFabricTestDir()
	testDataDir = path.Join(fabricTestDir, "regression/testdata")

	// set up input file variables
	networkSpecPath = path.Join(testDataDir, "barebones-network-spec.yml")
	inputSpecPath := path.Join(testDataDir, "barebones-test-input.yml")

	// Use input "command" to print peer logs
	action := "command"
	err := testclient.Testclient(action, inputSpecPath)
	Expect(err).NotTo(HaveOccurred())

	// get kube config env
	kubeConfig, containerType = getKubeConfig()

	// bring up network
	action = "up"
	err = launcher.Launcher(action, containerType, kubeConfig, networkSpecPath)
	Expect(err).NotTo(HaveOccurred())
})

var _ = AfterSuite(func() {
	// set up dir variables
	fabricTestDir, _ = getFabricTestDir()
	testDataDir = path.Join(fabricTestDir, "regression/testdata")

	// set up input file variables
	networkSpecPath = path.Join(testDataDir, "barebones-network-spec.yml")

	// get kube config env
	kubeConfig, containerType = getKubeConfig()

	// bring down network
	action = "down"
	err := launcher.Launcher(action, containerType, kubeConfig, networkSpecPath)
	Expect(err).NotTo(HaveOccurred())
})
