package networkclient

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"

	"github.com/onsi/ginkgo"
)

//ExecuteCommand - to execute the cli commands
func ExecuteCommand(name string, args []string, printLogs bool) (string, error) {

	// Print executed commands (in bold)
	fmt.Println("\033[1m", ">", name, strings.Join(args, " "), "\033[0m")

	cmd := exec.Command(name, args...)
	var stdBuffer bytes.Buffer
	runTests, envVariableExists := os.LookupEnv("GinkoTests")
	writerArgs := []io.Writer{os.Stdout, &stdBuffer}
	mw := io.MultiWriter(writerArgs...)
	if printLogs {
		if envVariableExists && runTests == "true" {
			writerArgs = append(writerArgs, ginkgo.GinkgoWriter)
			mw = io.MultiWriter(writerArgs...)
			cmd.Stdout = ginkgo.GinkgoWriter
			cmd.Stderr = ginkgo.GinkgoWriter
		} else {
			cmd.Stdout = mw
			cmd.Stderr = mw
		}
	} else {
		cmd.Stdout = &stdBuffer
		cmd.Stderr = &stdBuffer
	}
	if err := cmd.Run(); err != nil {
		return string(stdBuffer.Bytes()), err
	}
	return strings.TrimSpace(string(stdBuffer.Bytes())), nil
}

//ExecuteK8sCommand - to execute the k8s commands
func ExecuteK8sCommand(args []string, printLogs bool) (string, error) {
	return ExecuteCommand("kubectl", args, printLogs)
}
