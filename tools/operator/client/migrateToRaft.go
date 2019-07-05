package client

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//MigrateToRaft -  to migrate from solo or kafka to raft
func MigrateToRaft(input networkspec.Config, kubeConfigPath string) error {

	ordererOrgs := []string{}
	numOrderersPerOrg := []string{}
	for j := 0; j < len(input.OrdererOrganizations); j++ {
		ordererOrgs = append(ordererOrgs, input.OrdererOrganizations[j].Name)
		numOrderersPerOrg = append(numOrderersPerOrg, fmt.Sprintf("%v", input.OrdererOrganizations[j].NumOrderers))
	}
	ordererOrg := strings.Join(ordererOrgs[:], ",")
	numOrderers := strings.Join(numOrderersPerOrg[:], ",")
	cmd := exec.Command("./scripts/migrateToRaft.sh", kubeConfigPath, input.OrdererOrganizations[0].MSPID, input.ArtifactsLocation, ordererOrg, numOrderers, fmt.Sprintf("%v", input.NumChannels))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		return err
	}
	fmt.Println("Successfully migrated from kafka to etcdraft")
	return nil
}
