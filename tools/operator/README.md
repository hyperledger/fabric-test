# Fabric Network Operator

- A tool to launch fabric network on kubernetes cluster or local machine with a docker-compose
file. This tool creates the network based on a network specification file, and also creates connection profiles for each peer organization, which can be used by any client. It also can use its own testclient to generate channelTx transaction files, and perform fabric operations defined as "actions" in a test input file, such as creating channels, joining peers to a channel, anchor peer updates, installing, upgrading
and instantiating chaincodes, and performing invokes and queries, migrating a network from kafka to etcdraft, checking the health of peers and orderers, and upgrading the network. This uses `ytt` 
<https://github.com/k14s/ytt/blob/master/README.md> to generate all necessary configuration files 
and a go program to launch fabric network

## Prerequisites

- Go 1.11.0 or above <https://golang.org/dl/>
- yaml.v2 go package (go get gopkg.in/yaml.v2)
- Fabric binaries downloaded in $PATH <https://hyperledger-fabric.readthedocs.io/en/latest/install.html>

#### Kubernetes

- Kubernetes cluster if launching fabric network on kubernetes cluster. It is the responsibility
of the user to carefully consider and to create a kube cluster with enough resources to handle
the number of nodes specified in networkspec for the planned traffic patterns and rates
- `kubectl` if launching fabric network on kubernetes cluster. Refer to
<https://kubernetes.io/docs/tasks/tools/install-kubectl/> for installing `kubectl`

#### Local using docker

- Docker <https://docs.docker.com/install/linux/docker-ce/ubuntu/> and Docker-compose
<https://docs.docker.com/compose/install/> if launching fabric network locally

## Usage

Supported input arguments for operator are:

```go
-a string
       Set action(up, down, create, join, anchorpeer, install, instantiate, upgrade, 
	   invoke, query, createChannelTxn, migrate, health) (default is up)
-i string
       Network spec (or) Test input file path (Required)
-k string
       Kube config file path (If omitted, then use local network)
```

- `-a` is used to set type of action to be performed. It takes all the above actions as the values. Default value is up.
#####Actions that uses network input file
		`up`		 			  To launch a fabric network.
		`down`				   To take down a network
		`createChannelTxn`To create channelTx for specified number of channels
		`migrate` 			   To migrate a network to etcdraft
		`health`				   To perform health check on peers and orderers
		`upgradeNetwork`   To upgrade an existing fabric network to latest version
#####Actions that uses test input file
		`create`			      To create a channel
		`join`					  To join peers to a channel
		`anchorpeer`		  To perform anchor peer update
		`install`				   To install a chaincode
		`instantiate`		    To instantiate a chaincode
		`upgrade`			   To upgrade a chaincode
		`invoke`				  To perform invokes by sending the traffic to a fabric network
		`query`				   To perform queries on a fabric network

- `-i` is used to pass the absolute file path for network input file. It is required
to launch/remove fabric network. Network input file can be prepared using `networkInput.md`
in operator
- `-k` is used to pass the absolute file path to kube config file of kubernetes cluster.
If `-k` is specified with `path/to/kube-config.yaml`, then it will launch/remove
fabric network on kubernetes cluster. Kube config file can be downloaded from kubernetes
cluster. If `-k` is not specified in the command line, operator will launch fabric
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

##### Local

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
