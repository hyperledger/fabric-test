// If running application locally, set LOCAL to true

// If running on K8 cluster, change K8_external to the external IP with the server's port number

const LOCAL = false;
const LOCAL_PORT = '3000'

const REMOTE_IP = `169.46.120.39`
const REMOTE_PORT = '30000'

////
var server_ip;
var port;

if (LOCAL) {
	// LOCAL USE
	server_ip = `http://${window.location.host.split(":")[0]}:${LOCAL_PORT}`
}
else {
	// K8
	server_ip = `http://${REMOTE_IP}:${REMOTE_PORT}`
}

export { server_ip }