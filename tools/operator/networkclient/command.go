package networkclient

import (
	"bytes"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
)

//ExecuteCommand - to execute the cli commands
func ExecuteCommand(name string, args []string, printLogs bool) (string, error) {

	cmd := exec.Command(name, args...)
	var stdBuffer bytes.Buffer
	var redirectLogs bool
	logsToFile, envVariableExists := os.LookupEnv("RedirectLogs")
	if envVariableExists && logsToFile == "true" {
		redirectLogs = true
	}

	f, err := os.OpenFile("testlogfile", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}

	writersArgs := []io.Writer{os.Stdout, &stdBuffer, f}
	mw := io.MultiWriter(writersArgs...)
	log.SetOutput(mw)

	if printLogs {
		if redirectLogs {
			cmd.Stdout = f
			cmd.Stderr = f
		}else {
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

	output, err := ExecuteCommand("kubectl", args, printLogs)
	if err != nil {
		return output, err
	}
	return output, nil
}
