package networkclient

type Cryptogen struct {
	ConfigPath string
	Output     string
}

func (c Cryptogen) Args() []string {
	return []string{
		"generate",
		"--config", c.ConfigPath,
		"--output", c.Output,
	}
}
