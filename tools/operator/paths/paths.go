package paths

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/testclient/inputStructs"
)

//CryptoConfigDir --
func CryptoConfigDir(artifactsLocation string) string {
	return componentPath(artifactsLocation, "crypto-config")
}

//ChannelArtifactsDir --
func ChannelArtifactsDir(artifactsLocation string) string {
	return componentPath(artifactsLocation, "channel-artifacts")
}

//ConnectionProfilesDir --
func ConnectionProfilesDir(artifactsLocation string) string {
	return componentPath(artifactsLocation, "connection-profile")
}

//CaliperConnectionProfilesDir --
func CaliperConnectionProfilesDir(artifactsLocation string) string {
	return componentPath(artifactsLocation, "caliper-connection-profile")
}

//OrdererOrgsDir --
func OrdererOrgsDir(artifactsLocation string) string {
	return componentPath(CryptoConfigDir(artifactsLocation), "ordererOrganizations")
}

//PeerOrgsDir --
func PeerOrgsDir(artifactsLocation string) string {
	return componentPath(CryptoConfigDir(artifactsLocation), "peerOrganizations")
}

//YTTPath --
func YTTPath() string {
	currentDir, err := GetCurrentDir()
	if err != nil {
		logger.ERROR("YTTPath function is failed in getting current directory")
	}
	if strings.Contains(currentDir, "regression") {
		return componentPath(currentDir, "../../tools/operator/ytt")
	}
	return componentPath(currentDir, "ytt")
}

//TemplatesDir --
func TemplatesDir() string {
	currentDir, err := GetCurrentDir()
	if err != nil {
		logger.ERROR("TemplateDir function is failed in getting current directory")
	}
	if strings.Contains(currentDir, "regression") {
		return componentPath(currentDir, "../../tools/operator/templates")
	}
	return componentPath(currentDir, "templates")
}

//ScriptsDir --
func ScriptsDir() string {
	currentDir, err := GetCurrentDir()
	if err != nil {
		logger.ERROR("ScriptsDir function is failed in getting current directory")
	}
	if strings.Contains(currentDir, "regression") {
		return componentPath(currentDir, "../../tools/operator/scripts")
	}
	return componentPath(currentDir, "scripts")
}

//TemplateFilePath --
func TemplateFilePath(fileName string) string {
	templateFiles := map[string]string{
		"crypto-config":        "crypto-config.yaml",
		"crypto-config-extend": "crypto-config-extend.yaml",
		"configtx":             "configtx.yaml",
		"docker":               "docker/docker-compose.yaml",
		"peer-extend":          "docker/peer-extend.yaml",
		"input":                "input.yaml",
	}
	return JoinPath(TemplatesDir(), templateFiles[fileName])
}

//ConfigFilesDir --
func ConfigFilesDir(extend bool) string {
	currentDir, err := GetCurrentDir()
	if err != nil {
		logger.ERROR("ConfigFilesDir function is failed in getting current directory")
	}
	configDirName := "configFiles"
	if strings.Contains(currentDir, "regression") {
		configDirName = "../../tools/operator/configFiles"
	}
	if extend {
		configDirName = "configFiles/extend"
		if strings.Contains(currentDir, "regression") {
			configDirName = "../../tools/operator/configFiles/extend"
		}
	}
	return componentPath(currentDir, configDirName)
}

//ConfigFilePath --
func ConfigFilePath(fileName string) string {
	configFiles := map[string]string{
		"crypto-config":        "crypto-config.yaml",
		"crypto-config-extend": "extend/crypto-config-extend.yaml",
		"configtx":             "configtx.yaml",
		"docker":               "docker-compose.yaml",
		"peer-extend":          "extend/peer-extend.yaml",
	}
	return JoinPath(ConfigFilesDir(false), configFiles[fileName])
}

//GetCurrentDir --
func GetCurrentDir() (string, error) {
	path, err := os.Getwd()
	if err != nil {
		return path, err
	}
	return path, nil
}

func dirExists(dirPath string) (bool, error) {
	_, err := os.Stat(dirPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return true, err
}

func createDirectory(dirPath string) error {
	err := os.MkdirAll(dirPath, os.ModePerm)
	if err != nil {
		return err
	}
	return nil
}

func componentPath(artifactsLocation, component string) string {
	path := JoinPath(artifactsLocation, component)
	isExists, _ := dirExists(path)
	if isExists {
		return path
	}
	err := createDirectory(path)
	if err != nil {
		logger.ERROR("componentPath function is failed in creating new directory")
	}
	return path
}

//JoinPath ---
func JoinPath(oldPath, newPath string) string {
	return filepath.Join(oldPath, newPath)
}

//PTEPath --
func PTEPath() string {
	path, err := GetCurrentDir()
	if err != nil {
		logger.ERROR("PTEPath function is failed in getting current directory")
	}
	if strings.Contains(path, "regression") {
		return JoinPath(path, "../../tools/PTE/pte-main.js")
	}
	path = JoinPath(path, "../PTE/pte-main.js")
	return path
}

//GetConnProfilePath --
func GetConnProfilePath(orgNames []string, organizations []inputStructs.Organization) string {
	var connProfilePath string
	if len(orgNames) > 1 {
		connProfilePath, _ = filepath.Split(organizations[0].ConnProfilePath)
	} else {
		for i := 0; i < len(organizations); i++ {
			if organizations[i].Name == orgNames[0] {
				connProfilePath = organizations[i].ConnProfilePath
				break
			}
		}
	}
	return connProfilePath
}
