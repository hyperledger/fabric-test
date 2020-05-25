package k8s

import (
	"fmt"
	"io/ioutil"
	"net"
	"strconv"

	"github.com/hyperledger/fabric-test/tools/operator/connectionprofile"
	"github.com/hyperledger/fabric-test/tools/operator/networkspec"
	"github.com/hyperledger/fabric-test/tools/operator/paths"
	"k8s.io/client-go/kubernetes"
)

var reservedIPBlocks []*net.IPNet

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8",    // IPv4 loopback
		"10.0.0.0/8",     // RFC1918
		"172.16.0.0/12",  // RFC1918
		"192.168.0.0/16", // RFC1918
		"169.254.0.0/16", // RFC3927 link-local
	} {
		_, block, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(fmt.Errorf("parse error on %q: %v", cidr, err))
		}
		reservedIPBlocks = append(reservedIPBlocks, block)
	}
}

//ExternalIP -- To get the externalIP of a fabric component
func (k8s K8s) ExternalIP(config networkspec.Config, serviceName string, clientset *kubernetes.Clientset) (string, error) {

	var nodeIP string
	if config.K8s.ServiceType == "NodePort" {
		output, err := k8s.NodeStatus(clientset)
		if err != nil {
			Logger.Error("Failed to get the external IP for k8s using NodePort")
			return "", err
		}
		for _, ip := range output.Addresses {
			addr := net.ParseIP(ip.Address)
			if addr != nil {
				if !reservedIP(addr) {
					nodeIP = ip.Address
					break
				}
			}
		}
	} else if config.K8s.ServiceType == "LoadBalancer" {
		output, err := k8s.ServiceStatus(config.K8s.Namespace, serviceName, clientset)
		if err != nil {
			Logger.Error("Failed to get the external IP for k8s using LoadBalancer")
			return "", err
		}
		nodeIP = output.Status.LoadBalancer.Ingress[0].IP
	}
	return nodeIP, nil
}

//ServicePort -- To get the port number of a fabric k8s component
func (k8s K8s) ServicePort(serviceName, serviceType, namespace string, forHealth bool, clientset *kubernetes.Clientset) (string, error) {

	var portNumber int32
	output, err := k8s.ServiceStatus(namespace, serviceName, clientset)
	if err != nil {
		Logger.Error("Failed to get the port number for service ", serviceName)
		return "", err
	}
	portNumber = output.Spec.Ports[0].NodePort
	if serviceType == "LoadBalancer" {
		portNumber = output.Spec.Ports[0].Port
	}
	if forHealth {
		portNumber = output.Spec.Ports[1].NodePort
	}
	return strconv.Itoa(int(portNumber)), nil
}

func (k8s K8s) ordererOrganizations(config networkspec.Config, clientset *kubernetes.Clientset) (map[string]networkspec.Orderer, error) {

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
			portNumber, err = k8s.ServicePort(ordererName, config.K8s.ServiceType, config.K8s.Namespace, false, clientset)
			if err != nil {
				return orderers, err
			}
			nodeIP, err = k8s.ExternalIP(config, ordererName, clientset)
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
			keystorePath := paths.JoinPath(ordererOrgsPath, fmt.Sprintf("%s/users/Admin@%s/msp/keystore", orgName, orgName))

			privKeyFile, err := ioutil.ReadDir(keystorePath)
			if err != nil {
				return orderers, err
			}
			privKeyPath := paths.JoinPath(keystorePath, privKeyFile[0].Name())
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

func (k8s K8s) certificateAuthorities(peerOrg networkspec.PeerOrganizations, config networkspec.Config, clientset *kubernetes.Clientset) (map[string]networkspec.CertificateAuthority, error) {

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
		portNumber, err = k8s.ServicePort(caName, config.K8s.ServiceType, config.K8s.Namespace, false, clientset)
		if err != nil {
			return CAs, err
		}
		nodeIP, err = k8s.ExternalIP(config, caName, clientset)
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

func (k8s K8s) peersPerOrganization(peerorg networkspec.PeerOrganizations, config networkspec.Config, clientset *kubernetes.Clientset) (map[string]networkspec.Peer, error) {

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
		portNumber, err = k8s.ServicePort(peerName, config.K8s.ServiceType, config.K8s.Namespace, false, clientset)
		if err != nil {
			return peers, err
		}
		nodeIP, err = k8s.ExternalIP(config, peerName, clientset)
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
func (k8s K8s) GenerateConnectionProfiles(config networkspec.Config, clientset *kubernetes.Clientset) error {

	orderersMap, err := k8s.ordererOrganizations(config, clientset)
	if err != nil {
		return err
	}
	connProfile := connectionprofile.ConnProfile{Orderers: orderersMap, Config: config}
	for org := 0; org < len(config.PeerOrganizations); org++ {
		organizations := make(map[string]networkspec.Organization)
		peerorg := config.PeerOrganizations[org]
		peersMap, err := k8s.peersPerOrganization(peerorg, config, clientset)
		if err != nil {
			return err
		}
		connProfile.Peers = peersMap
		ca, err := k8s.certificateAuthorities(peerorg, config, clientset)
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
			Logger.Error("Failed to get the organization details")
			return err
		}
		organizations[peerorg.Name] = org
		connProfile.Organizations = organizations
		err = connProfile.GenerateConnProfilePerOrg(peerorg.Name)
		if err != nil {
			Logger.Error("Failed to generate connection profile")
			return err
		}
	}
	return nil
}

func reservedIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	for _, block := range reservedIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}
