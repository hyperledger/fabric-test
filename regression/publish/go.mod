module github.com/hyperledger/fabric-test/regression/publish

go 1.13

replace github.com/hyperledger/fabric-test => ../../../fabric-test

require (
	github.com/hyperledger/fabric-test v1.4.4
	github.com/onsi/ginkgo v1.12.0
	github.com/onsi/gomega v1.9.0
)
