module github.com/hyperledger/fabric-test/systemtest/functional/basicnetwork

go 1.13

replace github.com/hyperledger/fabric-test/tools/operator => ../../../../fabric-test/tools/operator

require (
	github.com/hyperledger/fabric-test/chaincodes/map_private/go v0.0.0-20200327220901-324535bcd065 // indirect
	github.com/hyperledger/fabric-test/chaincodes/samplecc/go v0.0.0-20200327220901-324535bcd065 // indirect
	github.com/hyperledger/fabric-test/tools/operator v0.0.0-00010101000000-000000000000
	github.com/onsi/ginkgo v1.12.0
	github.com/onsi/gomega v1.9.0
)
