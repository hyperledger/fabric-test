# Fabric Network Operator

- A tool to launch fabric network on kubernetes cluster or on a local machine using Docker.
  This tool creates the network based on a network specification file, and also creates
  connection profiles for each peer organization, which can be used by any client. It also
  can use its own testclient to generate channelTx transaction files, and perform fabric
  operations defined as "actions" in a test input file, such as creating channels, joining
  peers to a channel, anchor peer updates, installing, upgrading and instantiating chaincodes,
  and performing invokes and queries, migrating a network from kafka to etcdraft, checking the
  health of peers and orderers, and upgrading the network. This uses `ytt`
<https://github.com/k14s/ytt/blob/master/README.md> to generate all necessary configuration files
and a go program to launch fabric network

## Prerequisites

- Go 1.14 or later
- Node 1.12.0 or later (for SDK interactions)
- Java 8 or later (if using Java chaincode)
- Docker
- Docker-Compose
- Curl and Make

## Usage

Supported input arguments for operator are:

```
-a (action) string
       Set action(up, down, create, join, anchorpeer, install, instantiate, upgrade,
	   invoke, query, createChannelTxn, migrate, health) (default is up)
-i (input) string
       Network spec (or) Test input file path (Required)
-k (kubeconfig) string
       Kube config file path (If omitted, then use local network)
```

- `-a` is used to set type of action to be performed. It takes all the above actions as the values. Default value is up.
#####Actions that uses network input file
		up                  To launch a fabric network.
		down                To take down a network
		createChannelTxn    To create channelTx for specified number of channels
		migrate             To migrate a network to etcdraft
		health              To perform health check on peers and orderers
		upgradeNetwork      To upgrade an existing fabric network to latest version
#####Actions that uses test input file
		create              To create a channel
		join                To join peers to a channel
		anchorpeer          To perform anchor peer update
		install             To install a chaincode
		instantiate         To instantiate a chaincode
		upgrade             To upgrade a chaincode
		invoke              To perform invokes by sending the traffic to a fabric network
		query               To perform queries on a fabric network

- `-i` is used to pass the absolute or relative file path for a network input file. It is required
to launch/remove fabric network. Instructions for creating a networkSpec can be found here
  [networkInput.md](networkInput.md)

- `-k` is used to pass the absolute or relative file path to a kube config file of kubernetes cluster.
    If `-k` is not specified in the command line, the operator will launch the fabric
    network locally using docker-compose

## Examples
#### Fabric Network
##### On Kubernetes Cluster

To launch fabric network in kubernetes cluster, need kube config file for cluster
and network input file
```go run main.go -i <path/to/network spec file> -k <path/to/kube config file> -a up``` or
```go run main.go -i <path/to/network spec file> -k <path/to/kube config file>```
To take down the launched fabric network from the above
```go run main.go -i <path/to/network spec file> -k <path/to/kube config file> -a down```

To verify if fabric network is launched successfully or not in kubernetes cluster:
```export KUBECONFIG=<path/to/kube config file>```
```kubectl get pods``` - To display list of pods running in kubernetes cluster
```kubectl get services``` - To display list of services created in kubernetes cluster

##### Locally With Docker

To launch fabric network locally using network input file
```go run main.go -i <path/to/network spec file> -a up``` or
```go run main.go -i <path/to/network spec file>```

To take down launched fabric network locally
```go run main.go -i <path/to/network spec file> -a down```

To verify if fabric network is launched successfully or not locally:
```docker ps -a```

#### Fabric Operations

- To perform any action specified in the table above(for both the local network and the network launched in the kubernetes), use the below command
```go run main.go -i <path/to/test input file> -a <action>```
- To upgrade a local fabric network, use the below command
```go run main.go -i <path/to/network spec file> -a upgradeNetwork```
To upgrade a fabric network launched using kubernetes, use the below command
```go run main.go -i <path/to/network spec file> -k <path/to kube config file> -a upgradeNetwork```

#### E2E Example Locally With Docker

```
    make pre-reqs
    cd tools/operator
    go install .
    operator -i ../../regression/testdata/smoke-network-spec.yml -a up
    operator -i ../../regression/testdata/smoke-test-input.yml -a create
    operator -i ../../regression/testdata/smoke-test-input.yml -a join
    operator -i ../../regression/testdata/smoke-test-input.yml -a anchorpeer
    operator -i ../../regression/testdata/smoke-test-input.yml -a install
    operator -i ../../regression/testdata/smoke-test-input.yml -a instantiate
    operator -i ../../regression/testdata/smoke-test-input.yml -a invoke
    operator -i ../../regression/testdata/smoke-test-input.yml -a query
    operator -i ../../regression/testdata/smoke-test-input.yml -a upgrade
    operator -i ../../regression/testdata/smoke-test-input.yml -a invoke
    operator -i ../../regression/testdata/smoke-test-input.yml -a query
    operator -i ../../regression/testdata/smoke-network-spec.yml -a down
```

###Note:
While you can compile the operator tool with `cd tools/operator && go build .` during development you can call
the commands directly to compile your code on each invocation, i.e., `go run main.go ...`
