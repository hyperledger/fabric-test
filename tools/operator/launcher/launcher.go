// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package launcher

import (
	"fmt"
	"path"

	"github.com/hyperledger/fabric-test/tools/operator/launcher/dockercompose"
	"github.com/hyperledger/fabric-test/tools/operator/launcher/k8s"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	ytt "github.com/hyperledger/fabric-test/tools/operator/ytt-helper"
	"github.com/pkg/errors"
)

func doAction(action, kubeConfigPath string, config networkspec.Config) error {
	if kubeConfigPath == "" {
		compose := dockercompose.DockerCompose{
			Config: config,
		}
		return compose.DockerNetwork(action)
	}
	kube := k8s.K8s{
		KubeConfigPath: kubeConfigPath,
		Config:         config,
	}
	return kube.Network(action)
}

func Launcher(action, kubeConfigPath string, config networkspec.Config) error {
	var yttObject ytt.YTT
	err := yttObject.DownloadYtt()
	if err != nil {
		return errors.Errorf("Launcher: Failed to download ytt with error: %s", err)
	}
	if !path.IsAbs(config.ArtifactsLocation) {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			return fmt.Errorf("failed resolving absolute path of artifacts location [%s]: %v", config.ArtifactsLocation, err)
		}
		config.ArtifactsLocation = paths.JoinPath(currentDir, config.ArtifactsLocation)
	}
	err = doAction(action, kubeConfigPath, config)
	if err != nil {
		logger.ERROR("Launcher: Failed to perform ", action)
		return err
	}
	return nil
}
