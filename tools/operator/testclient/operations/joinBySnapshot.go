package operations

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//JoinBySnapshotUIObject --
type JoinBySnapshotUIObject struct {
	TLS             string         `json:"TLS,omitempty"`
	ChannelOpt      ChannelOptions `json:"ChannelOpt,omitempty"`
	ConnProfilePath string         `json:"ConnProfilePath,omitempty"`
	TargetPeers     []string       `json:"targetPeers,omitempty"`
	SnapshotPath    string
	SnapshotPeer    string
}

//JoinBySnapshot -- To join channel using snapshot
func (j JoinBySnapshotUIObject) JoinBySnapshot(config inputStructs.Config, tls string) error {

	var joinBySnapshotObjects []JoinBySnapshotUIObject
	var joinBySnapshotConfigObjects []interface{}
	var configObjects []inputStructs.JoinChannelBySnapshot
	configObjects = config.JoinChannelBySnapshot
	for index := 0; index < len(configObjects); index++ {
		ccObjects := j.createJoinBySnapshotObjects(configObjects[index], config.Organizations, tls)
		joinBySnapshotObjects = append(joinBySnapshotObjects, ccObjects...)
		joinBySnapshotConfigObjects = append(joinBySnapshotConfigObjects, &config.JoinChannelBySnapshot[index])
	}
	err := j.joinBySnapshot(joinBySnapshotObjects)
	if err != nil {
		return err
	}
	var connProfileObject connectionprofile.ConnProfile
	err = connProfileObject.UpdateConnectionProfiles(joinBySnapshotConfigObjects, config.Organizations, "joinBySnapshot")
	if err != nil {
		return err
	}
	return nil
}

//createSnapshotObjects -- To create snapshot objects for snapshot
func (j JoinBySnapshotUIObject) createJoinBySnapshotObjects(ccObject inputStructs.JoinChannelBySnapshot, organizations []inputStructs.Organization, tls string) []JoinBySnapshotUIObject {

	var joinBySnapshotObjects []JoinBySnapshotUIObject
	orgNames := strings.Split(ccObject.Organizations, ",")
	targetPeers := strings.Split(ccObject.TargetPeers, ",")
	snapshotConfig := strings.Split(ccObject.SnapshotPath, ":")

	j = JoinBySnapshotUIObject{
		TLS: tls,
		ChannelOpt: ChannelOptions{
			OrgName: orgNames,
			Name:    ccObject.ChannelName,
		},
		TargetPeers:     targetPeers,
		SnapshotPeer:    snapshotConfig[0],
		SnapshotPath:    snapshotConfig[1],
		ConnProfilePath: paths.GetConnProfilePath(orgNames, organizations),
	}
	joinBySnapshotObjects = append(joinBySnapshotObjects, j)
	return joinBySnapshotObjects
}

//joinBysnapshotCLI -- to join the channel using snapshot
func (j JoinBySnapshotUIObject) joinBySnapshotCLI(joinBySnapshotObject JoinBySnapshotUIObject) error {

	for _, orgName := range joinBySnapshotObject.ChannelOpt.OrgName {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			return err
		}
		var connProfilePath string
		if strings.Contains(joinBySnapshotObject.ConnProfilePath, ".yaml") || strings.Contains(joinBySnapshotObject.ConnProfilePath, ".json") {
			connProfilePath = joinBySnapshotObject.ConnProfilePath
		} else {
			connProfilePath = fmt.Sprintf("%s/connection_profile_%s.yaml", joinBySnapshotObject.ConnProfilePath, orgName)
		}
		for _, peerName := range joinBySnapshotObject.TargetPeers {
			peerOrgName := strings.Split(peerName, "-")
			if peerOrgName[1] == orgName {
				connProfConfig, err := ConnProfileInformationForOrg(connProfilePath, orgName)
				if err != nil {
					return err
				}
				peerURL, err := url.Parse(connProfConfig.Peers[peerName].URL)
				if err != nil {
					logger.ERROR("Failed to get peer url from connection profile")
					return err
				}
				peerAddress := peerURL.Host
				err = SetEnvForCLI(orgName, peerName, connProfilePath, joinBySnapshotObject.TLS, currentDir)
				if err != nil {
					return err
				}
				args := []string{
					"channel",
					"joinbysnapshot",
					"--snapshotpath",
				}
				os.Setenv("CORE_PEER_ADDRESS", peerAddress)
				if os.Getenv("KUBECONFIG") != "" || strings.Contains(peerAddress, "127.0.0.1") {
					err = j.copySnapshotDirectoryDocker(peerName, joinBySnapshotObject)
					if err != nil {
						return err
					}
					args = append(args, fmt.Sprintf("/var/hyperledger/production/snapshots/completed/%s", joinBySnapshotObject.SnapshotPath))
				} else {
					err = j.copySnapshotDirectoryK8s(peerName, joinBySnapshotObject)
					if err != nil {
						return err
					}
					args = append(args, fmt.Sprintf("/shared/data/snapshots/completed/%s", joinBySnapshotObject.SnapshotPath))
				}
				_, err = networkclient.ExecuteCommand("peer", args, true)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (j JoinBySnapshotUIObject) copySnapshotDirectoryDocker(peer string, joinBySnapshotObject JoinBySnapshotUIObject) error {

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	content, _, err := cli.CopyFromContainer(ctx, joinBySnapshotObject.SnapshotPeer, fmt.Sprintf("/var/hyperledger/production/snapshots/completed/%s/%s", joinBySnapshotObject.ChannelOpt.Name, joinBySnapshotObject.SnapshotPath))
	if err != nil {
		return err
	}
	options := types.CopyToContainerOptions{AllowOverwriteDirWithFile: true, CopyUIDGID: false}
	err = cli.CopyToContainer(ctx, peer, "/var/hyperledger/production/snapshots/completed/", content, options)
	if err != nil {
		return err
	}
	defer content.Close()
	return nil
}

//TODO: to replace kubectl call with api call
func (j JoinBySnapshotUIObject) copySnapshotDirectoryK8s(peer string, joinBySnapshotObject JoinBySnapshotUIObject) error {

	copyFromArgs := []string{
		"-n", "fabric-system-test",
		"cp",
		fmt.Sprintf("%s-0:/shared/data/snapshots/completed/%s/%s", joinBySnapshotObject.SnapshotPeer, joinBySnapshotObject.ChannelOpt.Name, joinBySnapshotObject.SnapshotPath),
		fmt.Sprintf("/tmp/%s", joinBySnapshotObject.SnapshotPath),
		"-c", "peer",
	}
	_, err := networkclient.ExecuteCommand("kubectl", copyFromArgs, true)
	if err != nil {
		return err
	}
	copyToArgs := []string{
		"-n", "fabric-system-test",
		"cp",
		fmt.Sprintf("/tmp/%s", joinBySnapshotObject.SnapshotPath),
		fmt.Sprintf("%s-0:/shared/data/snapshots/completed/%s", peer, joinBySnapshotObject.SnapshotPath),
		"-c", "peer",
	}
	_, err = networkclient.ExecuteCommand("kubectl", copyToArgs, true)
	if err != nil {
		return err
	}
	return nil
}

//joinBySnapshot -- To join peer to channel using snapshot
func (j JoinBySnapshotUIObject) joinBySnapshot(joinBySnapshotObjects []JoinBySnapshotUIObject) error {

	var err error
	for i := 0; i < len(joinBySnapshotObjects); i++ {
		err = j.joinBySnapshotCLI(joinBySnapshotObjects[i])
		if err != nil {
			return err
		}
	}
	return err
}
