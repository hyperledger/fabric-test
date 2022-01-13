module github.com/hyperledger/fabric-test/regression/chaos

go 1.14

replace github.com/hyperledger/fabric-test/tools/operator => ../../tools/operator

require (
	github.com/hyperledger/fabric-test/tools/operator v0.0.0-00010101000000-000000000000
	github.com/onsi/ginkgo v1.13.0
	github.com/onsi/gomega v1.10.1
)
