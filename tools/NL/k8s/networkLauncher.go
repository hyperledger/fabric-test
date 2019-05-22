// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	yaml "gopkg.in/yaml.v2"
)

type Config struct {
	ArtifactsLocation    string                 `yaml:"certs_location,omitempty"`
	OrdererOrganizations []OrdererOrganizations `yaml:"orderer_organizations,omitempty"`
	PeerOrganizations    []PeerOrganizations    `yaml:"peer_organizations,omitempty"`
	NumChannels          int                    `yaml:"num_channels,omitempty"`
	K8s                  struct {
		DataPersistance bool `yaml:"data_persistance,omitempty"`
	} `yaml:"k8s,omitempty"`
}

type OrdererOrganizations struct {
	Name        string `yaml:"name,omitempty"`
	MspID       string `yaml:"msp_id,omitempty"`
	NumOrderers int    `yaml:"num_orderers,omitempty"`
	NumCa       int    `yaml:"num_ca,omitempty"`
}

type KafkaConfig struct {
	NumKafka             int `yaml:"num_kafka,omitempty"`
	NumKafkaReplications int `yaml:"num_kafka_replications,omitempty"`
	NumZookeepers        int `yaml:"num_zookeepers,omitempty"`
}

type PeerOrganizations struct {
	Name     string `yaml:"name,omitempty"`
	MspID    string `yaml:"msp_id,omitempty"`
	NumPeers int    `yaml:"num_peers,omitempty"`
	NumCa    int    `yaml:"num_ca,omitempty"`
}

type MSP struct {
	AdminCerts struct {
		AdminPem string `json:"admin_pem"`
	} `json:"admin_certs"`
	CACerts struct {
		CaPem string `json:"ca_pem"`
	} `json:"ca_certs"`
	TlsCaCerts struct {
		TlsPem string `json:"tls_pem"`
	} `json:"tls_ca"`
	SignCerts struct {
		OrdererPem string `json:"pem"`
	} `json:"sign_certs"`
	Keystore struct {
		PrivateKey string `json:"private_key"`
	} `json:"key_store"`
}

type TLS struct {
	CaCert     string `json:"ca_cert"`
	ServerCert string `json:"server_cert"`
	ServerKey  string `json:"server_key"`
}

type CA struct {
	Pem        string `json:"pem"`
	PrivateKey string `json:"private_key"`
}

type TlsCa struct {
	Pem        string `json:"pem"`
	PrivateKey string `json:"private_key"`
}

type Component struct {
	Msp   MSP   `json:"msp"`
	Tls   TLS   `json:"tls"`
	Ca    CA    `json:"ca"`
	Tlsca TlsCa `json:"tlsca"`
}

func getConf(networkSpecPath string) Config {

	var config Config
	yamlFile, err := ioutil.ReadFile(networkSpecPath)
	if err != nil {
		log.Fatalf("Failed to read input file; err = %v", err)
	}
	err = yaml.Unmarshal(yamlFile, &config)
	if err != nil {
		log.Fatalf("Failed to create config object; err = %v", err)
	}
	return config
}

func generateConfigurationFiles() error {

	cmd := exec.Command("uname", "-s")
	stdoutStderr, err := cmd.CombinedOutput()
	osType := fmt.Sprintf(strings.TrimSpace(strings.ToLower(string(stdoutStderr))))

	err = executeCommand(fmt.Sprintf("./ytt-%v-amd64", osType), []string{"-f", "./templates/", "--output", "./configFiles"})
	if err != nil {
		return err
	}
	return nil
}

func generateCryptoCerts(networkSpec Config) error {

	configPath := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config")
	err := executeCommand("cryptogen", []string{"generate", "--config=./configFiles/crypto-config.yaml", fmt.Sprintf("--output=%v", configPath)})
	if err != nil {
		return err
	}
	return nil
}

func createMspJson(networkSpec Config, path string, caPath string, componentName string, kubeConfigPath string) error {

	var msp MSP
	var tls TLS
	var ca CA
	var tlsCa TlsCa
	var component Component
	var tlsArr []string
	if strings.HasPrefix(componentName, "orderer") || strings.HasPrefix(componentName, "peer") {
		files, err := ioutil.ReadDir(path)
		if err != nil {
			return err
		}
		dir := path
		for _, f := range files {
			if f.Name() == "msp" {
				mspDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/msp", dir))
				var mspArr []string
				for _, sf := range mspDir {
					mspSubDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/msp/%v", dir, sf.Name()))
					for _, j := range mspSubDir {
						data, _ := ioutil.ReadFile(fmt.Sprintf("%v/msp/%v/%v", dir, sf.Name(), j.Name()))
						mspArr = append(mspArr, string(data))
					}
				}
				msp.AdminCerts.AdminPem = mspArr[0]
				msp.CACerts.CaPem = mspArr[1]
				msp.Keystore.PrivateKey = mspArr[2]
				msp.SignCerts.OrdererPem = mspArr[3]
				msp.TlsCaCerts.TlsPem = mspArr[4]
			} else {
				tlsDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/tls", dir))
				for _, sf := range tlsDir {
					data, _ := ioutil.ReadFile(fmt.Sprintf("%v/tls/%v", dir, sf.Name()))
					tlsArr = append(tlsArr, string(data))
				}
				tls.CaCert = tlsArr[0]
				tls.ServerCert = tlsArr[1]
				tls.ServerKey = tlsArr[2]
			}
		}
		component.Msp = msp
		component.Tls = tls
	}

	files, err := ioutil.ReadDir(caPath)
	if err != nil {
		return err
	}

	for _, f := range files {
		dir := fmt.Sprintf("%v/%v", caPath, f.Name())
		if f.Name() == "ca" {
			caDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/", dir))
			caCerts := make(map[string]string)
			for _, file := range caDir {
				data, _ := ioutil.ReadFile(fmt.Sprintf("%v/%v", dir, file.Name()))
				if strings.HasSuffix(file.Name(), "pem") {
					caCerts["pem"] = string(data)
				} else {
					caCerts["private_key"] = string(data)
				}
			}
			ca.PrivateKey = caCerts["private_key"]
			ca.Pem = caCerts["pem"]
		} else if f.Name() == "tlsca" {
			tlsCaDir, _ := ioutil.ReadDir(fmt.Sprintf("%v/", dir))
			tlsCaCerts := make(map[string]string)
			for _, file := range tlsCaDir {
				data, _ := ioutil.ReadFile(fmt.Sprintf("%v/%v", dir, file.Name()))
				if strings.HasSuffix(file.Name(), "pem") {
					tlsCaCerts["pem"] = string(data)
				} else {
					tlsCaCerts["private_key"] = string(data)
				}
			}
			tlsCa.PrivateKey = tlsCaCerts["private_key"]
			tlsCa.Pem = tlsCaCerts["pem"]
		}
	}

	component.Ca = ca
	component.Tlsca = tlsCa
	b, _ := json.MarshalIndent(component, "", "  ")
	_ = ioutil.WriteFile(fmt.Sprintf("./configFiles/%v.json", componentName), b, 0644)

	err = executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "create", "secret", "generic", fmt.Sprintf("%v", componentName), fmt.Sprintf("--from-file=./configFiles/%v.json", componentName)})
	if err != nil {
		return err
	}

	return nil
}

func createMspSecret(networkSpec Config, kubeConfigPath string) error {

	for i := 0; i < len(networkSpec.OrdererOrganizations); i++ {
		for j := 0; j < networkSpec.OrdererOrganizations[i].NumOrderers; j++ {
			ordererName := fmt.Sprintf("orderer%s-%s", fmt.Sprintf("%v", j), networkSpec.OrdererOrganizations[i].Name)
			caPath := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config/ordererOrganizations", networkSpec.OrdererOrganizations[i].Name)
			path := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config/ordererOrganizations", networkSpec.OrdererOrganizations[i].Name+"/orderers/"+ordererName+"."+networkSpec.OrdererOrganizations[i].Name)
			_ = createMspJson(networkSpec, path, caPath, ordererName, kubeConfigPath)
		}
		for j := 0; j < networkSpec.OrdererOrganizations[i].NumCa; j++ {
			caName := fmt.Sprintf("ca%s-%s", fmt.Sprintf("%v", j), networkSpec.OrdererOrganizations[i].Name)
			caPath := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config/ordererOrganizations", networkSpec.OrdererOrganizations[i].Name)
			_ = createMspJson(networkSpec, "", caPath, caName, kubeConfigPath)
		}
	}

	for i := 0; i < len(networkSpec.PeerOrganizations); i++ {
		for j := 0; j < networkSpec.PeerOrganizations[i].NumPeers; j++ {
			peerName := fmt.Sprintf("peer%s-%s", fmt.Sprintf("%v", j), networkSpec.PeerOrganizations[i].Name)
			path := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config/peerOrganizations", networkSpec.PeerOrganizations[i].Name+"/peers/"+peerName+"."+networkSpec.PeerOrganizations[i].Name)
			caPath := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config/peerOrganizations", networkSpec.PeerOrganizations[i].Name)
			_ = createMspJson(networkSpec, path, caPath, peerName, kubeConfigPath)
		}
		for j := 0; j < networkSpec.PeerOrganizations[i].NumCa; j++ {
			caName := fmt.Sprintf("ca%s-%s", fmt.Sprintf("%v", j), networkSpec.PeerOrganizations[i].Name)
			caPath := filepath.Join(networkSpec.ArtifactsLocation, "crypto-config/peerOrganizations", networkSpec.PeerOrganizations[i].Name)
			_ = createMspJson(networkSpec, "", caPath, caName, kubeConfigPath)
		}
	}
	return nil
}

func generateOrdererGenesisBlock(networkSpec Config, kubeConfigPath string) error {

	path := filepath.Join(networkSpec.ArtifactsLocation, "channel-artifacts")
	_ = os.Mkdir(path, 0755)

	err := executeCommand("configtxgen", []string{"-profile", "testOrgsOrdererGenesis", "-channelID", "orderersystemchannel", "-outputBlock", fmt.Sprintf("%v/genesis.block", path), "-configPath=./configFiles/"})
	if err != nil {
		return err
	}

	err = executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "create", "secret", "generic", "genesisblock", fmt.Sprintf("--from-file=%v/genesis.block", path)})
	if err != nil {
		return err
	}

	return nil
}

func generateChannelTransaction(networkSpec Config) error {

	path := filepath.Join(networkSpec.ArtifactsLocation, "channel-artifacts")
	_ = os.Mkdir(path, 0755)

	for i := 0; i < networkSpec.NumChannels; i++ {
		err := executeCommand("configtxgen", []string{"-profile", "testorgschannel", "-channelCreateTxBaseProfile", "testOrgsOrdererGenesis", "-channelID", fmt.Sprintf("testorgschannel%v", i), "-outputCreateChannelTx", fmt.Sprintf("%v/testorgschannel%v.tx", path, i), "-configPath=./configFiles/"})
		if err != nil {
			return err
		}
	}
	return nil
}

func createCertsParserConfigMap(kubeConfigPath string) error {

	err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "create", "configmap", "certsparser", "--from-file=./scripts/certs-parser.sh"})
	if err != nil {
		return err
	}
	return nil
}

func createPvcs(kubeConfigPath string) error {

	err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "apply", "-f", "./configFiles/fabric-pvc.yaml"})
	if err != nil {
		return err
	}
	return nil
}

func createServices(kubeConfigPath string) error {

	err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "apply", "-f", "./configFiles/k8s-service.yaml"})
	if err != nil {
		return err
	}
	return nil
}

func deployFabric(kubeConfigPath string) error {

	err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "apply", "-f", "./configFiles/fabric-k8s-pods.yaml"})
	if err != nil {
		return err
	}
	return nil
}

func executeCommand(name string, args []string) error {

	stdoutStderr, err := exec.Command(name, args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%v", string(stdoutStderr))
	}
	fmt.Printf(string(stdoutStderr))
	return nil
}

func networkCleanUp(networkSpec Config, kubeConfigPath string) error {

	for i := 0; i < len(networkSpec.OrdererOrganizations); i++ {
		for j := 0; j < networkSpec.OrdererOrganizations[i].NumOrderers; j++ {
			ordererName := fmt.Sprintf("orderer%v-%v", j, networkSpec.OrdererOrganizations[i].Name)
			err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "secrets", ordererName})
			if err != nil {
				fmt.Println(err.Error())
			}
		}
		for j := 0; j < networkSpec.OrdererOrganizations[i].NumCa; j++ {
			caName := fmt.Sprintf("ca%v-%v", j, networkSpec.OrdererOrganizations[i].Name)
			err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "secrets", caName})
			if err != nil {
				fmt.Println(err.Error())
			}
		}
	}

	for i := 0; i < len(networkSpec.PeerOrganizations); i++ {
		for j := 0; j < networkSpec.PeerOrganizations[i].NumPeers; j++ {
			peerName := fmt.Sprintf("peer%v-%v", j, networkSpec.PeerOrganizations[i].Name)
			err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "secrets", peerName})
			if err != nil {
				fmt.Println(err.Error())
			}
		}
		for j := 0; j < networkSpec.PeerOrganizations[i].NumCa; j++ {
			caName := fmt.Sprintf("ca%v-%v", j, networkSpec.PeerOrganizations[i].Name)
			err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "secrets", caName})
			if err != nil {
				fmt.Println(err.Error())
			}
		}
	}
	err := executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "secrets", "genesisblock"})
	err = executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "-f", "./configFiles/fabric-k8s-pods.yaml"})
	err = executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "-f", "./configFiles/k8s-service.yaml"})
	err = executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "-f", "./configFiles/fabric-pvc.yaml"})
	err = executeCommand("kubectl", []string{fmt.Sprintf("--kubeconfig=%v", kubeConfigPath), "delete", "configmaps", "certsparser"})
	if err != nil {
		fmt.Println(err.Error())
	}

	currentDir, err := os.Getwd()
	if err != nil {
		err := fmt.Errorf("%v", err)
		fmt.Println(err.Error())
	}
	path := filepath.Join(currentDir, "configFiles")
	err = os.RemoveAll(path)
	path = filepath.Join(currentDir, "templates/input.yaml")
	err = os.RemoveAll(path)
	path = filepath.Join(networkSpec.ArtifactsLocation, "channel-artifacts")
	err = os.RemoveAll(path)
	path = filepath.Join(networkSpec.ArtifactsLocation, "crypto-config")
	err = os.RemoveAll(path)
	if err != nil {
		return err
	}
	return nil
}

func readArguments() (*string, *string, string) {

	networkSpecPath := flag.String("i", "", "Network spec input file path")
	kubeConfigPath := flag.String("k", "", "Kube config file path")
	mode := flag.String("m", "up", "Set mode(up or down)")
	flag.Parse()

	if fmt.Sprintf("%s", *kubeConfigPath) == "" {
		log.Fatalf("Kube config file not provided")
	} else if fmt.Sprintf("%s", *networkSpecPath) == "" {
		log.Fatalf("Input file not provided")
	}

	return networkSpecPath, kubeConfigPath, fmt.Sprintf("%s", *mode)
}

func init() {
	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("%v", err)
	}
	cmd := exec.Command("uname", "-s")
	stdoutStderr, err := cmd.CombinedOutput()

	osType := fmt.Sprintf(strings.TrimSpace(strings.ToLower(string(stdoutStderr))))
	path := filepath.Join(currentDir, fmt.Sprintf("ytt-%v-amd64", osType))

	if _, err = os.Stat(path); os.IsNotExist(err) {

		err = executeCommand("wget", []string{fmt.Sprintf("https://github.com/k14s/ytt/releases/download/v0.11.0/ytt-%v-amd64", osType)})
		if err != nil {
			log.Fatalf("%v", err)
		}

		err = executeCommand("chmod", []string{"+x", fmt.Sprintf("ytt-%v-amd64", osType)})
		if err != nil {
			log.Fatalf("%v", err)
		}
	}
}

func modeAction(mode string, input Config, kubeConfigPath string) {
	switch mode{
		case "up":
			err := generateConfigurationFiles()
			if err != nil {
				log.Fatalf("Failed to generate yaml files; err = %v", err)
			}

			err = generateCryptoCerts(input)
			if err != nil {
				log.Fatalf("Failed to generate certificates; err = %v", err)
			}

			err = createMspSecret(input, kubeConfigPath)
			if err != nil {
				log.Fatalf("Failed to create secret; err = %v", err)
			}

			err = generateOrdererGenesisBlock(input, kubeConfigPath)
			if err != nil {
				log.Fatalf("Failed to create orderer genesis block; err = %v", err)
			}

			err = generateChannelTransaction(input)
			if err != nil {
				log.Fatalf("Failed to create channel transaction; err = %v", err)
			}

			err = createCertsParserConfigMap(kubeConfigPath)
			if err != nil {
				log.Fatalf("Failed to create cert parser configmap; err = %v", err)
			}

			if input.K8s.DataPersistance == true {
				err = createPvcs(kubeConfigPath)
				if err != nil {
					log.Fatalf("Failed to create pvcs; err = %v", err)
				}
			}

			err = createServices(kubeConfigPath)
			if err != nil {
				log.Fatalf("Failed to create services; err = %v", err)
			}

			err = deployFabric(kubeConfigPath)
			if err != nil {
				log.Fatalf("Failed to deploy fabric; err = %v", err)
			}

		case "down":
			err := networkCleanUp(input, kubeConfigPath)
			if err != nil {
				log.Fatalf("Failed to clean up the network:; err = %v", err)
			}

		default:
			log.Fatalf("Incorrect mode (%v). Use up or down for mode", mode)
	}
}

func main() {

	networkSpecPath, kubeConfigPath, mode := readArguments()
	inputPath := fmt.Sprintf("%s", *networkSpecPath)
	contents, _ := ioutil.ReadFile(inputPath)

	contents = append([]byte("#@data/values \n"), contents...)
	currentDir, err := os.Getwd()
	if err != nil {
		err := fmt.Errorf("%v", err)
		fmt.Println(err.Error())
	}

	ioutil.WriteFile(filepath.Join(currentDir, "templates/input.yaml"), contents, 0644)
	inputPath = fmt.Sprintf("%v", filepath.Join(currentDir, "templates/input.yaml"))
	input := getConf(inputPath)
	modeAction(mode, input, *kubeConfigPath)
}
