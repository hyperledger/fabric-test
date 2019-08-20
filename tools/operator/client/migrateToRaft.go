package client

import (
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//MigrateToRaft -  to migrate from solo or kafka to raft
func MigrateToRaft(input networkspec.Config, kubeConfigPath string) error {

	ordererOrgs := []string{}
	numOrderersPerOrg := []string{}
	for j := 0; j < len(input.OrdererOrganizations); j++ {
		ordererOrgs = append(ordererOrgs, input.OrdererOrganizations[j].Name)
		numOrderersPerOrg = append(numOrderersPerOrg, fmt.Sprintf("%d", input.OrdererOrganizations[j].NumOrderers))
	}
	ordererOrg := strings.Join(ordererOrgs[:], ",")
	numOrderers := strings.Join(numOrderersPerOrg[:], ",")
	args := []string{kubeConfigPath, input.OrdererOrganizations[0].MSPID, input.ArtifactsLocation, ordererOrg, numOrderers, fmt.Sprintf("%d", input.NumChannels)}
	_, err := ExecuteCommand("./scripts/migrateToRaft.sh", args, true)
	if err != nil {
		return err
	}
	logger.INFO("Successfully migrated from kafka to etcdraft")
	return nil
}
