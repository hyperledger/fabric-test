package client

type Cryptogen struct {
	Config string
	Output string
}

func (c Cryptogen) Args() []string {
	return []string{
		"generate",
		"--config", c.Config,
		"--output", c.Output,
	}
}