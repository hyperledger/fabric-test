package k8s

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/logger"
	"github.com/hyperledger/fabric-test/tools/operator/networkclient"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
)

type K8Ports struct {
	Spec struct {
		Ports []struct {
			NodePort   int `json:"nodePort,omitempty"`
			TargetPort int `json:"targetPort,omitempty"`
		} `json:"ports,omitempty"`
	} `json:"spec,omitempty"`
}

type NodePortIP struct {
	Items []struct {
		Status struct {
			Addresses []struct {
				Address string `json:"address,omitempty"`
				Type    string `json:"type,omitempty"`
			} `json:"addresses,omitempty"`
		} `json:"status,omitempty"`
	} `json:"items,omitempty"`
}

type LoadBalancerIP struct {
	Status struct {
		LoadBalancer struct {
			Ingress []struct {
				IP string `json:"ip,omitempty"`
			} `json:"ingress,omitempty"`
		} `json:"loadBalancer,omitempty"`
	} `json:"status,omitempty"`
}

//GetK8sExternalIP -- To get the externalIP of a fabric component
func (k K8s) GetK8sExternalIP(config networkspec.Config, serviceName string) (string, error) {

	var nodeIP string
	var inputArgs []string
	var loadBalancerIP LoadBalancerIP
	var nodePortIP NodePortIP
	if config.K8s.ServiceType == "NodePort" {
		inputArgs = []string{"get", "-o", "json", "nodes"}
		k.Arguments = inputArgs
		output, err := networkclient.ExecuteK8sCommand(k.Args(), false)
		if err != nil {
			logger.ERROR("Failed to get the external IP for k8s using NodePort")
			return "", err
		}
		err = json.Unmarshal([]byte(output), &nodePortIP)
		if err != nil {
			logger.ERROR("Failed to unmarshall nodePortIP object")
		}
		nodeIP = nodePortIP.Items[0].Status.Addresses[1].Address
	} else if config.K8s.ServiceType == "LoadBalancer" {
		inputArgs = []string{"get", "-o", "json", "services", serviceName}
		k.Arguments = inputArgs
		output, err := networkclient.ExecuteK8sCommand(k.Args(), false)
		if err != nil {
			logger.ERROR("Failed to get the external IP for k8s using LoadBalancer")
			return "", err
		}
		err = json.Unmarshal([]byte(output), &loadBalancerIP)
		if err != nil {
			logger.ERROR("Failed to unmarshall loadBalancer object")
		}
		nodeIP = loadBalancerIP.Status.LoadBalancer.Ingress[0].IP
	}
	return nodeIP, nil
}

//GetK8sServicePort -- To get the port number of a fabric k8s component
func (k K8s) GetK8sServicePort(serviceName, serviceType string, forHealth bool) (string, error) {

	var k8Ports K8Ports
	var portNumber int
	args := []string{"get", "-o", "json", "services", serviceName}
	k.Arguments = args
	output, err := networkclient.ExecuteK8sCommand(k.Args(), false)
	if err != nil {
		logger.ERROR("Failed to get the port number for service ", serviceName)
		return "", err
	}
	err = json.Unmarshal([]byte(output), &k8Ports)
	if err != nil {
		logger.ERROR("Failed to unmarshall k8sPort object")
	}
	portNumber = k8Ports.Spec.Ports[0].NodePort
	if serviceType == "LoadBalancer" {
		portNumber = k8Ports.Spec.Ports[0].TargetPort
	}
	if forHealth {
		portNumber = k8Ports.Spec.Ports[1].NodePort
	}
	return strconv.Itoa(portNumber), nil
}

func (k K8s) ordererOrganizations(config networkspec.Config) (map[string]networkspec.Orderer, error) {

	orderers := make(map[string]networkspec.Orderer)
	artifactsLocation := config.ArtifactsLocation
	ordererOrgsPath := paths.OrdererOrgsDir(artifactsLocation)
	var err error
	var orderer networkspec.Orderer
	var connProfile connectionprofile.ConnProfile
	var portNumber, nodeIP string
	protocol := "grpc"
	if config.TLS == "true" || config.TLS == "mutual" {
		protocol = "grpcs"
	}
	for org := 0; org < len(config.OrdererOrganizations); org++ {
		ordererOrg := config.OrdererOrganizations[org]
		orgName := ordererOrg.Name
		for i := 0; i < ordererOrg.NumOrderers; i++ {
			ordererName := fmt.Sprintf("orderer%d-%s", i, orgName)
			portNumber, err = k.GetK8sServicePort(ordererName, config.K8s.ServiceType, false)
			if err != nil {
				return orderers, err
			}
			nodeIP, err = k.GetK8sExternalIP(config, ordererName)
			if err != nil {
				return orderers, err
			}
			orderer = networkspec.Orderer{MSPID: ordererOrg.MSPID, URL: fmt.Sprintf("%s://%s:%s", protocol, nodeIP, portNumber)}
			orderer.GrpcOptions.SslTarget = ordererName
			tlscaCertPath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/orderers/%s.%s/msp/tlscacerts/tlsca.%s-cert.pem", orgName, ordererName, orgName, orgName))
			cert, err := connProfile.GetCertificateFromFile(tlscaCertPath)
			if err != nil {
				return orderers, err
			}
			orderer.TLSCACerts.Pem = cert
			adminCertPath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp/signcerts/Admin@%s-cert.pem", orgName, orgName, orgName))
			cert, err = connProfile.GetCertificateFromFile(adminCertPath)
			if err != nil {
				return orderers, err
			}
			orderer.AdminCert = cert
			privKeyPath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp/keystore/priv_sk", orgName, orgName))
			cert, err = connProfile.GetCertificateFromFile(privKeyPath)
			if err != nil {
				return orderers, err
			}
			orderer.PrivateKey = cert
			orderers[ordererName] = orderer
		}
	}
	return orderers, nil
}

func (k K8s) certificateAuthorities(peerOrg networkspec.PeerOrganizations, config networkspec.Config) (map[string]networkspec.CertificateAuthority, error) {

	CAs := make(map[string]networkspec.CertificateAuthority)
	var err error
	var connProfile connectionprofile.ConnProfile
	var CA networkspec.CertificateAuthority
	var portNumber, nodeIP string
	protocol := "http"
	if config.TLS == "true" || config.TLS == "mutual" {
		protocol = "https"
	}
	artifactsLocation := config.ArtifactsLocation
	orgName := peerOrg.Name
	for i := 0; i < peerOrg.NumCA; i++ {
		caName := fmt.Sprintf("ca%d-%s", i, orgName)
		portNumber, err = k.GetK8sServicePort(caName, config.K8s.ServiceType, false)
		if err != nil {
			return CAs, err
		}
		nodeIP, err = k.GetK8sExternalIP(config, caName)
		if err != nil {
			return CAs, err
		}
		CA = networkspec.CertificateAuthority{URL: fmt.Sprintf("%s://%s:%s", protocol, nodeIP, portNumber), CAName: caName}
		tlscaCertPath := paths.JoinPath(paths.PeerOrgsDir(artifactsLocation), fmt.Sprintf("%s/ca/ca.%s-cert.pem", orgName, orgName))
		cert, err := connProfile.GetCertificateFromFile(tlscaCertPath)
		if err != nil {
			return CAs, err
		}
		CA.TLSCACerts.Pem = cert
		CA.HTTPOptions.Verify = false
		CA.Registrar.EnrollID, CA.Registrar.EnrollSecret = "admin", "adminpw"
		CAs[fmt.Sprintf("ca%d", i)] = CA
	}
	return CAs, nil
}

func (k K8s) peersPerOrganization(peerorg networkspec.PeerOrganizations, config networkspec.Config) (map[string]networkspec.Peer, error) {

	var err error
	var peer networkspec.Peer
	var portNumber, nodeIP string
	var connProfile connectionprofile.ConnProfile
	peers := make(map[string]networkspec.Peer)
	protocol := "grpc"
	peerOrgsLocation := paths.PeerOrgsDir(config.ArtifactsLocation)
	if config.TLS == "true" || config.TLS == "mutual" {
		protocol = "grpcs"
	}
	for i := 0; i < peerorg.NumPeers; i++ {
		peerName := fmt.Sprintf("peer%d-%s", i, peerorg.Name)
		portNumber, err = k.GetK8sServicePort(peerName, config.K8s.ServiceType, false)
		if err != nil {
			return peers, err
		}
		nodeIP, err = k.GetK8sExternalIP(config, peerName)
		if err != nil {
			return peers, err
		}
		peer = networkspec.Peer{URL: fmt.Sprintf("%s://%s:%s", protocol, nodeIP, portNumber)}
		peer.GrpcOptions.SslTarget = peerName
		tlscaCertPath := paths.JoinPath(peerOrgsLocation, fmt.Sprintf("%s/tlsca/tlsca.%s-cert.pem", peerorg.Name, peerorg.Name))
		cert, err := connProfile.GetCertificateFromFile(tlscaCertPath)
		if err != nil {
			return peers, err
		}
		peer.TLSCACerts.Pem = cert
		peers[peerName] = peer
	}
	return peers, nil
}

//GenerateConnectionProfiles -- To generate conenction profiles
func (k K8s) GenerateConnectionProfiles(config networkspec.Config) error {

	orderersMap, err := k.ordererOrganizations(config)
	if err != nil {
		return err
	}
	connProfile := connectionprofile.ConnProfile{Orderers: orderersMap, Config: config}
	for org := 0; org < len(config.PeerOrganizations); org++ {
		organizations := make(map[string]networkspec.Organization)
		peerorg := config.PeerOrganizations[org]
		peersMap, err := k.peersPerOrganization(peerorg, config)
		if err != nil {
			return err
		}
		connProfile.Peers = peersMap
		ca, err := k.certificateAuthorities(peerorg, config)
		if err != nil {
			return err
		}
		connProfile.CA = ca
		caList := make([]string, 0, len(ca))
		for k := range ca {
			caList = append(caList, k)
		}
		org, err := connProfile.Organization(peerorg, caList)
		if err != nil {
			logger.ERROR("Failed to get the organization details")
			return err
		}
		organizations[peerorg.Name] = org
		connProfile.Organizations = organizations
		err = connProfile.GenerateConnProfilePerOrg(peerorg.Name)
		if err != nil {
			logger.ERROR("Failed to generate connection profile")
			return err
		}
	}
	return nil
}
