package networkclient

import (
	"bytes"
	"io"
	"os"
	"os/exec"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
)

var Logger = logger.Logger("networkclient")

//ExecuteCommand - to execute the cli commands
func ExecuteCommand(name string, args []string, printLogs bool) (string, error) {
	var stdBuffer bytes.Buffer
	mw := io.MultiWriter(os.Stdout, &stdBuffer)
	cmd := exec.Command(name, args...)
	if printLogs && name != "configtxgen" {
		cmd.Stdout = mw
		cmd.Stderr = mw
	} else {
		cmd.Stdout = &stdBuffer
		cmd.Stderr = &stdBuffer
	}
	if err := cmd.Run(); err != nil {
		return stdBuffer.String(), err
	}
	return strings.TrimSpace(stdBuffer.String()), nil
}

//ExecuteK8sCommand - to execute the k8s commands
func ExecuteK8sCommand(args []string, printLogs bool) (string, error) {

	output, err := ExecuteCommand("kubectl", args, printLogs)
	if err != nil {
		return output, err
	}
	return output, nil
}
