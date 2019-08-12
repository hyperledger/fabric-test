// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"github.com/hyperledger/fabric-test/tools/operator/client"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

type DockerCompose struct{
	Config string
	Action []string
}

func (d DockerCompose) Args() []string {
	args := []string{"-f", d.Config}
	return append(args, d.Action...)
}

//LaunchLocalNetwork -- To launch the network in the local environment
func LaunchLocalNetwork() error {
	configPath := utils.JoinPath(utils.ConfigFilesDir(), "docker-compose.yaml")
	dockerCompose := DockerCompose{Config: configPath, Action: []string{"up", "-d"}}
	_, err :=  client.ExecuteCommand("docker-compose", dockerCompose.Args(), true)
	if err != nil {
		return err
	}
	return nil
}

//DownLocalNetwork -- To tear down the local network
func DownLocalNetwork() error {
	configPath := utils.JoinPath(utils.ConfigFilesDir(), "docker-compose.yaml")
	dockerCompose := DockerCompose{Config: configPath, Action: []string{"down"}}
	_, err :=  client.ExecuteCommand("docker-compose", dockerCompose.Args(), true)
	if err != nil {
		return err
	}
	return nil
}
