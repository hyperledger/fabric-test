module github.com/hyperledger/fabric-test/regression/systemtest

go 1.13

replace github.com/hyperledger/fabric-test => ../../../fabric-test

require (
	github.com/hyperledger/fabric-test v1.1.1-0.20200102104930-dcd7e057017d
	github.com/onsi/ginkgo v1.11.0
	github.com/onsi/gomega v1.8.1
	github.com/pkg/errors v0.8.1 // indirect
	gopkg.in/yaml.v2 v2.2.7
)