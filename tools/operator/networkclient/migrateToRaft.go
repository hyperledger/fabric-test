package networkclient

import (
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

//MigrateToRaft -  to migrate from solo or kafka to raft
func MigrateToRaft(config networkspec.Config, kubeConfigPath string) error {

	var artifactsLocation string
	ordererOrgs := []string{}
	numOrderersPerOrg := []string{}
	for j := 0; j < len(config.OrdererOrganizations); j++ {
		ordererOrgs = append(ordererOrgs, config.OrdererOrganizations[j].Name)
		numOrderersPerOrg = append(numOrderersPerOrg, fmt.Sprintf("%d", config.OrdererOrganizations[j].NumOrderers))
	}
	if !(strings.HasPrefix(config.ArtifactsLocation, "/")) {
		currentDir, err := paths.GetCurrentDir()
		if err != nil {
			logger.ERROR("MigrateToRaft: GetCurrentDir failed; unable to join with ArtifactsLocation", config.ArtifactsLocation)
			return err
		}
		artifactsLocation = paths.JoinPath(currentDir, config.ArtifactsLocation)
	}
	ordererOrg := strings.Join(ordererOrgs[:], ",")
	numOrderers := strings.Join(numOrderersPerOrg[:], ",")
	args := []string{kubeConfigPath, config.OrdererOrganizations[0].MSPID, artifactsLocation, ordererOrg, numOrderers, fmt.Sprintf("%d", config.NumChannels)}
	_, err := ExecuteCommand("./scripts/migrateToRaft.sh", args, true)
	if err != nil {
		return err
	}
	logger.INFO("Successfully migrated from kafka to etcdraft")
	return nil
}
