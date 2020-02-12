module github.com/hyperledger/fabric-test/regression/basicnetworktest

go 1.13

replace github.com/hyperledger/fabric-test => ../../../fabric-test

require (
	github.com/hyperledger/fabric-test v1.1.1-0.20191119225408-b8ac69dde86d
	github.com/onsi/ginkgo v1.12.0
	github.com/onsi/gomega v1.7.1
)
