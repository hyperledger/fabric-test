package networkclient

import (
	"fmt"
	"os"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

//CheckNetworkInSync -  to check whether the network is synced based on block height
func CheckNetworkInSync(config networkspec.Config, kubeConfigPath string) error {

	var artifactsLocation string
	ordererOrgs := []string{}
	numOrderersPerOrg := []string{}
	peerOrgs := []string{}
	numPeersPerOrg := []string{}
	peerOrgsMSPID := []string{}
	for j := 0; j < len(config.OrdererOrganizations); j++ {
		ordererOrgs = append(ordererOrgs, config.OrdererOrganizations[j].Name)
		numOrderersPerOrg = append(numOrderersPerOrg, fmt.Sprintf("%d", config.OrdererOrganizations[j].NumOrderers))
	}
	for j := 0; j < len(config.PeerOrganizations); j++ {
		peerOrgs = append(peerOrgs, config.PeerOrganizations[j].Name)
		peerOrgsMSPID = append(peerOrgsMSPID, config.PeerOrganizations[j].MSPID)
		numPeersPerOrg = append(numPeersPerOrg, fmt.Sprintf("%d", config.PeerOrganizations[j].NumPeers))
	}
	if !(strings.HasPrefix(config.ArtifactsLocation, "/")) {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			logger.ERROR("CheckNetworkSync: GetCurrentDir failed; unable to join with ArtifactsLocation", config.ArtifactsLocation)
			return err
		}
		artifactsLocation = paths.JoinPath(currentDir, config.ArtifactsLocation)
	}
	ordererOrg := strings.Join(ordererOrgs[:], ",")
	numOrderers := strings.Join(numOrderersPerOrg[:], ",")
	peerOrg := strings.Join(peerOrgs[:], ",")
	peerOrgMSPID := strings.Join(peerOrgsMSPID[:], ",")
	numPeers := strings.Join(numPeersPerOrg[:], ",")
	args := []string{kubeConfigPath, config.OrdererOrganizations[0].MSPID, artifactsLocation, ordererOrg, numOrderers, fmt.Sprintf("%d", config.NumChannels), peerOrg, numPeers, peerOrgMSPID}
	os.Setenv("VALIDATE_BLOCK", "true")
	_, err := ExecuteCommand("./scripts/validateNetworkInSync.sh", args, true)
	if err != nil {
		return err
	}
	logger.INFO("Successfully verfied that the network is synced and all the orderers and the peers are at same block level in their respective channels")
	return nil
}
