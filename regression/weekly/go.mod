module github.com/hyperledger/fabric-test/regression/weeklytest

go 1.13

require (
	github.com/hyperledger/fabric-test v1.1.1-0.20191210182509-1d3c883f142f
	github.com/onsi/ginkgo v1.11.0
	github.com/onsi/gomega v1.8.1
)

replace github.com/hyperledger/fabric-test => ../../../fabric-test
