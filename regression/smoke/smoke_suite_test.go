package smoke_test

import (
	"testing"
	"strings"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/onsi/ginkgo/reporters"

	"../../tools/operator/launcher"
	"../../tools/operator/networkclient"
)

func TestSmoke(t *testing.T) {
	RegisterFailHandler(Fail)
	junitReporter := reporters.NewJUnitReporter("results_smoke-test-suite.xml")
	RunSpecsWithDefaultAndCustomReporters(t, "Smoke Test Suite", []Reporter{junitReporter})
}

// Bringing up network using BeforeSuite
var _ = BeforeSuite(func() {
	networkSpecPath := "../../tools/operator/testdata/smoke-network-spec.yml"
	err := launcher.Launcher("up", "docker", "", networkSpecPath)
	Expect(err).NotTo(HaveOccurred())
})

// Cleaning up network launched from BeforeSuite and removing all chaincode containers
// and chaincode container images using AfterSuite
var _ = AfterSuite(func(){
	networkSpecPath := "../../tools/operator/testdata/smoke-network-spec.yml"
	err := launcher.Launcher("down", "docker", "", networkSpecPath)
	Expect(err).NotTo(HaveOccurred())

	dockerList := []string{"ps", "-aq", "-f", "status=exited"};
	containerList, _ := networkclient.ExecuteCommand("docker", dockerList, false);
	if containerList != "" {
		list := strings.Split(containerList, "\n")
		containerArgs := []string{"rm", "-f"}
		containerArgs = append(containerArgs, list...)
		networkclient.ExecuteCommand("docker", containerArgs, true);
	}
	ccimagesList := []string{"images", "-q", "--filter=reference=dev*"}
	images, _ := networkclient.ExecuteCommand("docker", ccimagesList, false);
	if images != "" {
		list := strings.Split(images, "\n")
		imageArgs := []string{"rmi", "-f"}
		imageArgs = append(imageArgs, list...)
		networkclient.ExecuteCommand("docker", imageArgs, true);
	}
})
