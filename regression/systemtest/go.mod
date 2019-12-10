module github.com/hyperledger/fabric-test/regression/systemtest

go 1.13

replace github.com/hyperledger/fabric-test => ../../../fabric-test

require (
	github.com/hyperledger/fabric-test v1.4.4
	github.com/onsi/ginkgo v1.10.3
	github.com/onsi/gomega v1.7.1
	github.com/pkg/errors v0.8.1 // indirect
	gopkg.in/yaml.v2 v2.2.7 // indirect
)