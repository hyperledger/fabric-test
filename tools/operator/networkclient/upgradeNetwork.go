package networkclient

import (
	"fmt"

	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//UpgradeDB -  to upgrade db
func UpgradeDB(config networkspec.Config, kubeConfigPath string) error {

	for i := 0; i < len(config.PeerOrganizations); i++ {
		for j := 0; j < config.PeerOrganizations[i].NumPeers; j++ {
			args := []string{"upgradeDB",
				config.PeerOrganizations[i].MSPID,
				fmt.Sprintf("peer%d-%s", j, config.PeerOrganizations[i].Name),
				config.PeerOrganizations[i].Name,
				config.ArtifactsLocation}
			_, err := ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
			if err != nil {
				return err
			}
		}
	}
	Logger.Info("Successfully updated dbs for all peers")
	return nil
}

//UpdateCapability -  to update capability
func UpdateCapability(config networkspec.Config, kubeConfigPath string) error {
	capabilityGroup := "channel"
	capabilityKey := config.ChannelCapabilities
	args := []string{"configUpdate",
		config.OrdererOrganizations[0].MSPID,
		fmt.Sprintf("orderer0-%s", config.OrdererOrganizations[0].Name),
		config.OrdererOrganizations[0].Name,
		config.ArtifactsLocation,
		fmt.Sprintf("%d", config.NumChannels),
		capabilityKey,
		capabilityGroup,
		config.PeerOrganizations[0].MSPID,
		config.PeerOrganizations[0].Name}
	_, err := ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
	if err != nil {
		return err
	}

	capabilityGroup = "orderer"
	capabilityKey = config.OrdererCapabilities
	args = []string{"configUpdate",
		config.OrdererOrganizations[0].MSPID,
		fmt.Sprintf("orderer0-%s", config.OrdererOrganizations[0].Name),
		config.OrdererOrganizations[0].Name,
		config.ArtifactsLocation,
		"0",
		capabilityKey,
		capabilityGroup,
		config.PeerOrganizations[0].MSPID,
		config.PeerOrganizations[0].Name}
	_, err = ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
	if err != nil {
		return err
	}

	capabilityGroup = "application"
	capabilityKey = config.ApplicationCapabilities
	args = []string{"configUpdate",
		config.OrdererOrganizations[0].MSPID,
		fmt.Sprintf("orderer0-%s", config.OrdererOrganizations[0].Name),
		config.OrdererOrganizations[0].Name,
		config.ArtifactsLocation,
		fmt.Sprintf("%d", config.NumChannels),
		capabilityKey,
		capabilityGroup,
		config.PeerOrganizations[0].MSPID,
		config.PeerOrganizations[0].Name}
	_, err = ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
	if err != nil {
		return err
	}

	Logger.Info("Successfully updated capabilities")
	return nil
}

//UpdatePolicy - to update policy
func UpdatePolicy(config networkspec.Config, kubeConfigPath string) error {
	for j := 0; j < len(config.PeerOrganizations); j++ {
		policyGroup := "consortium"
		args := []string{"configUpdate",
			config.OrdererOrganizations[0].MSPID,
			fmt.Sprintf("orderer0-%s", config.OrdererOrganizations[0].Name),
			config.OrdererOrganizations[0].Name,
			config.ArtifactsLocation,
			"0",
			"null",
			policyGroup,
			config.PeerOrganizations[j].MSPID,
			config.PeerOrganizations[j].Name}
		_, err := ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
		if err != nil {
			return err
		}
	}

	for j := 0; j < len(config.PeerOrganizations); j++ {
		policyGroup := "organization"
		args := []string{"configUpdate",
			config.OrdererOrganizations[0].MSPID,
			fmt.Sprintf("orderer0-%s", config.OrdererOrganizations[0].Name),
			config.OrdererOrganizations[0].Name,
			config.ArtifactsLocation,
			fmt.Sprintf("%d", config.NumChannels),
			"null",
			policyGroup,
			config.PeerOrganizations[j].MSPID,
			config.PeerOrganizations[j].Name}
		_, err := ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
		if err != nil {
			return err
		}
	}

	policyGroups := []string{"apppolicy", "acls"}
	for _, policyGroup := range policyGroups {
		args := []string{"configUpdate",
			config.OrdererOrganizations[0].MSPID,
			fmt.Sprintf("orderer0-%s", config.OrdererOrganizations[0].Name),
			config.OrdererOrganizations[0].Name,
			config.ArtifactsLocation,
			fmt.Sprintf("%d", config.NumChannels),
			"null",
			policyGroup,
			config.PeerOrganizations[0].MSPID,
			config.PeerOrganizations[0].Name}
		_, err := ExecuteCommand("./scripts/upgradeNetwork.sh", args, true)
		if err != nil {
			return err
		}
	}

	Logger.Info("Successfully updated policies")
	return nil
}
