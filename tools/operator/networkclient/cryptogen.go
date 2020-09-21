package networkclient

type Cryptogen struct {
	ConfigPath string
	Output     string
}

func (c Cryptogen) Args(action string) []string {
	crytogenArgs := []string{
		action,
		"--config", c.ConfigPath,
	}
	if action == "extend" {
		crytogenArgs = append(crytogenArgs, "--input", c.Output)
	} else {
		crytogenArgs = append(crytogenArgs, "--output", c.Output)
	}
	return crytogenArgs
}
