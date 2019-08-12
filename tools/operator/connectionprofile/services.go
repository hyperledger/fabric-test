// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package connectionprofile

import (
    "errors"
    "fmt"
    "strings"

    "github.com/hyperledger/fabric-test/tools/operator/client"
    "github.com/hyperledger/fabric-test/tools/operator/utils"
    "github.com/hyperledger/fabric-test/tools/operator/launcher/nl"
    "github.com/hyperledger/fabric-test/tools/operator/networkspec"
)

//ExternalIP -- To get the externalIP of a fabric component
func ExternalIP(kubeconfigPath string, input networkspec.Config, serviceName string) (string, error) {

    if kubeconfigPath == "" {
        return "localhost", nil
    }
    var IPAddress string
    var inputArgs []string
    var k8s nl.K8s
    if input.K8s.ServiceType == "NodePort" {
        inputArgs = []string{"get", "nodes", "-o", `jsonpath='{ $.items[*].status.addresses[?(@.type=="ExternalIP")].address }'`}
        k8s.Input = inputArgs
        output, err := client.ExecuteK8sCommand(k8s.Args(kubeconfigPath), false)
        if err != nil {
            utils.PrintLogs("Failed to get the external IP for k8s using NodePor")
            return "", err
        }
        IPAddressList := strings.Split(string(output)[1:], " ")
        IPAddress = IPAddressList[0]
    } else if input.K8s.ServiceType == "LoadBalancer" {
        inputArgs = []string{"get", "-o", `jsonpath="{.status.loadBalancer.ingress[0].ip}"`, "services", serviceName}
        k8s.Input = inputArgs
        output, err := client.ExecuteK8sCommand(k8s.Args(kubeconfigPath), false)
        if err != nil {
            utils.PrintLogs("Failed to get the external IP for k8s using NodePort")
            return "", err
        }
        IPAddress = string(output)[1 : len(string(output))-1]
    }

    return IPAddress, nil
}

//ServicePort -- To get the external port of a fabric component
func ServicePort(kubeconfigPath, serviceName, serviceType string, forHealth bool) (string, error) {

    var port string
    var err error
    if kubeconfigPath != "" {
        port, err = k8sServicePort(kubeconfigPath, serviceName, serviceType, forHealth)
        if err != nil {
            return port, err
        }
        return port, nil
    }
    port, err = dockerServicePort(serviceName, serviceType, forHealth)
    if err != nil {
        return port, err
    }
    return port, nil
}

func k8sServicePort(kubeconfigPath, serviceName, serviceType string, forHealth bool) (string, error) {
    var port string
    index := 0
    if forHealth {
        index = 1
    }
    input := []string{"get", "-o", fmt.Sprintf(`jsonpath="{.spec.ports[%v].nodePort}"`, index), "services", serviceName}
    k8s := nl.K8s{Action:"", Input:input}
    output, err := client.ExecuteK8sCommand(k8s.Args(kubeconfigPath), false)
    if err != nil {
        utils.PrintLogs(fmt.Sprintf("Failed to get the port number for service %s", serviceName))
        return "", err
    }
    port = string(output)
    port = port[1 : len(port)-1]
    return port, nil
}

func dockerServicePort(serviceName, serviceType string, forHealth bool) (string, error) {
    var port string
    args := []string{"port", serviceName}
    output, err := client.ExecuteCommand("docker", args, false)
    if err != nil {
        utils.PrintLogs(fmt.Sprintf("Failed to get the port number for service %s", serviceName))
        return "", err
    }
    ports := strings.Split(string(output), "\n")
    if len(ports) == 0 {
        utils.PrintLogs(fmt.Sprintf("Unable to get the port number for service %s", serviceName))
        return "", errors.New("Unable to get the port number")
    }
    if forHealth {
        for i := 0; i < len(ports); i++ {
            if (strings.Contains(ports[i], "9443")) || (strings.Contains(ports[i], "8443")) {
                port = ports[i]
                break
            }
        }
    } else {
        for i := 0; i < len(ports); i++ {
            if !(strings.Contains(ports[i], "9443")) {
                if !(strings.Contains(ports[i], "8443")) {
                    port = ports[i]
                    break
                }
            }
        }
    }
    port = port[len(port)-5 : len(port)]
    return port, nil
}
