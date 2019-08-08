package client

import (
	"fmt"
	"os/exec"
)

//ExecuteCommand - to execute the cli commands
func ExecuteCommand(name string, args ...string) error {

	stdoutStderr, err := exec.Command(name, args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s", string(stdoutStderr))
	}
	fmt.Printf(string(stdoutStderr))
	return nil
}

//ExecuteK8sCommand - to execute the k8s commands
func ExecuteK8sCommand(kubeConfigPath string, args ...string) error {

	kubeconfig := fmt.Sprintf("--kubeconfig=%s", kubeConfigPath)
	newArgs := []string{kubeconfig}
	newArgs = append(newArgs, args...)
	err := ExecuteCommand("kubectl", newArgs...)
	if err != nil {
		return err
	}
	return nil
}
