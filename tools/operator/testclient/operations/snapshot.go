package operations

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//SnapshotUIObject --
type SnapshotUIObject struct {
	SDK             string         `json:"sdk,omitempty"`
	TLS             string         `json:"TLS,omitempty"`
	BlockNumber     int            `json:"BlockNumber,omitempty"`
	ChannelOpt      ChannelOptions `json:"ChannelOpt,omitempty"`
	ConnProfilePath string         `json:"ConnProfilePath,omitempty"`
	TargetPeers     []string       `json:"targetPeers,omitempty"`
}

//Snapshot -- To snapshot channel
func (s SnapshotUIObject) Snapshot(config inputStructs.Config, tls string) error {

	var snapshotObjects []SnapshotUIObject
	for index := 0; index < len(config.SnapshotChannel); index++ {
		ccObjects := s.createSnapshotObjects(config.SnapshotChannel[index], config.Organizations, tls)
		snapshotObjects = append(snapshotObjects, ccObjects...)
	}
	err := s.snapshot(snapshotObjects)
	if err != nil {
		return err
	}
	return nil
}

//createSnapshotObjects -- To create snapshot objects for snapshot
func (s SnapshotUIObject) createSnapshotObjects(ccObject inputStructs.Snapshot, organizations []inputStructs.Organization, tls string) []SnapshotUIObject {

	var snapshotObjects []SnapshotUIObject
	orgNames := strings.Split(ccObject.Organizations, ",")
	targetPeers := strings.Split(ccObject.TargetPeers, ",")
	for _, blockNumber := range ccObject.BlockNumber {
		s = SnapshotUIObject{
			TLS:         tls,
			BlockNumber: blockNumber,
			ChannelOpt: ChannelOptions{
				OrgName: orgNames,
				Name:    ccObject.ChannelName,
			},
			TargetPeers:     targetPeers,
			ConnProfilePath: paths.GetConnProfilePath(orgNames, organizations),
		}
		snapshotObjects = append(snapshotObjects, s)
	}
	return snapshotObjects
}

//snapshotCLI --
func (s SnapshotUIObject) snapshotCLI(snapshotObject SnapshotUIObject) error {

	for _, orgName := range snapshotObject.ChannelOpt.OrgName {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			return err
		}
		var connProfilePath string
		if strings.Contains(snapshotObject.ConnProfilePath, ".yaml") || strings.Contains(snapshotObject.ConnProfilePath, ".json") {
			connProfilePath = snapshotObject.ConnProfilePath
		} else {
			connProfilePath = fmt.Sprintf("%s/connection_profile_%s.yaml", snapshotObject.ConnProfilePath, orgName)
		}
		for _, peerName := range snapshotObject.TargetPeers {
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
				err = SetEnvForCLI(orgName, peerName, connProfilePath, snapshotObject.TLS, currentDir)
				if err != nil {
					return err
				}
				args := []string{
					"snapshot",
					"submitrequest",
					"-C", snapshotObject.ChannelOpt.Name,
					"-b", strconv.Itoa(snapshotObject.BlockNumber),
					"--peerAddress", peerAddress,
					"--tlsRootCertFile",
					fmt.Sprintf("%s/crypto-config/peerOrganizations/%s/peers/%s.%s/tls/ca.crt", currentDir, orgName, peerName, orgName),
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

//Snapshot -- To snapshot ledger
func (s SnapshotUIObject) snapshot(snapshotObjects []SnapshotUIObject) error {

	var err error
	for j := 0; j < len(snapshotObjects); j++ {
		err = s.snapshotCLI(snapshotObjects[j])
		if err != nil {
			return err
		}
	}
	return err
}
