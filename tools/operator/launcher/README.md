# Fabric Network Launcher

- A tool to launch fabric network on kubernetes cluster or local machine with a docker-compose
file using a network input file and gives back connection profiles for each peer organization
to use with any client. This uses `ytt` <https://github.com/k14s/ytt/blob/master/README.md> to
generate all necessary configuration files and a go program to launch fabric network

## Prerequisites

- Go 1.11.0 or above <https://golang.org/dl/>
- yaml.v2 go package (go get gopkg.in/yaml.v2)
- Fabric binaries in $PATH <https://hyperledger-fabric.readthedocs.io/en/latest/install.html>

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

Supported input arguments for launcher are:

```go
-a string
       Set action(up or down) (default is up)
-i string
       Network spec input file path (Required)
-k string
       Kube config file path (If omitted, then use local network)
```

- `-a` is used to set type of action to be performed. It takes `up` or `down` as the
values. Default value is up. If `-a` is specified with `up`, it launches fabric network.
If `-a` is specified with `down`, it takes down the network
- `-i` is used to pass the absolute file path for network input file. It is required
to launch/remove fabric network. Network input file can be prepared using `networkInput.md`
in operator
- `-k` is used to pass the absolute file path to kube config file of kubernetes cluster.
If `-k` is specified with `path/to/kube-config.yaml`, then it will launch/remove
fabric network on kubernetes cluster. Kube config file can be downloaded from kubernetes
cluster. If `-k` is not specified in the command line, launcher will launch fabric
network locally using docker-compose

### Examples

#### On Kubernetes Cluster

To launch fabric network in kubernetes cluster, need kube config file for cluster
and network input file
```go run launcher.go -i <path/to/network input file> -k <path/to/kube config file> -a up``` or
```go run launcher.go -i <path/to/network input file> -k <path/to/kube config file>```
To take down the launched fabric network from the above
```go run launcher.go -i <path/to/network input file> -k <path/to/kube config file> -a down```

To verify if fabric network is launched successfully or not in kubernetes cluster:
```export KUBECONFIG=<path/to/kube config file>```
```kubectl get pods``` - To display list of pods running in kubernetes cluster
```kubectl get services``` - To display list of services created in kubernetes cluster

#### Local

To launch fabric network locally using network input file
```go run launcher.go -i <path/to/network input file> -a up``` or
```go run launcher.go -i <path/to/network input file>```

To take down launched fabric network locally
```go run launcher.go -i <path/to/network input file> -a down```

To verify if fabric network is launched successfully or not locally:
```docker ps -a```