// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package nl

import (
	"os"

	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/utils"
)

//NetworkCleanUp - to clean up the network
func NetworkCleanUp(input networkspec.Config, kubeConfigPath string) error {
	var err error
	artifactsLocation := input.ArtifactsLocation
	if kubeConfigPath != "" {
		err = DownK8sComponents(kubeConfigPath, input)
	} else {
		err = DownLocalNetwork()
	}
	if err != nil {
		return err
	}
	err = os.RemoveAll(utils.ConfigFilesDir())
	err = os.RemoveAll(utils.JoinPath(utils.TemplatesDir(), "input.yaml"))
	err = os.RemoveAll(utils.ChannelArtifactsDir(artifactsLocation))
	err = os.RemoveAll(utils.CryptoConfigDir(artifactsLocation))
	err = os.RemoveAll(utils.ConnectionProfilesDir(artifactsLocation))
	if err != nil {
		return err
	}
	return nil
}
