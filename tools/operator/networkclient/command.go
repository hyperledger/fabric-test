package networkclient

import (
	"bytes"
	"io"
	"os/exec"
	"strings"

	"github.com/onsi/ginkgo"
)

//ExecuteCommand - to execute the cli commands
func ExecuteCommand(name string, args []string, printLogs bool) (string, error) {
	var buffer bytes.Buffer
	writers := io.MultiWriter(ginkgo.GinkgoWriter, &buffer)
	cmd := exec.Command(name, args...)
	cmd.Stdout = writers
	cmd.Stderr = writers
	if err := cmd.Run(); err != nil {
		return buffer.String(), err
	}
	return strings.TrimSpace(buffer.String()), nil
}

//ExecuteK8sCommand - to execute the k8s commands
func ExecuteK8sCommand(args []string, printLogs bool) (string, error) {
	output, err := ExecuteCommand("kubectl", args, printLogs)
	if err != nil {
		return output, err
	}
	return output, nil
}
