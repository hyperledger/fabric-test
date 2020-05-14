# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
# -------------------------------------------------------------
# This makefile defines the following targets
#
#   - regression/barebones			- Executes barebones tests
#   - regression/basicnetwork		- Executes basicnetwork tests
#   - regression/smoke				- Executes smoke tests
#   - regression/systemtest			- Executes system tests on k8s cluster
#   - regression/weekly				- Executes 12hr long running test in k8s environment
#   - upgrade						- Executes upgrade scenario in weekly from 1.4 to 2.0
#   - npm-init						- Initializes the PTE NPM modules
#   - gotools						- Installs go tools, such as: ginkgo, golint, goimports, gocov and govendor
#
# ------------------------------------------------------------------

include gotools.mk

regression/%: pre-reqs
	cd ${@} && ginkgo -v

upgrade:
	cd regression/upgrade && ./upgrade2.1.sh

.PHONY: pre-reqs
pre-reqs: npm-init pull-binaries-fabric gotools

.PHONY: npm-init
npm-init:
	cd $(CURDIR)/tools/PTE && npm install
    ifeq ($(shell arch), i386)
		cd $(CURDIR)/tools/PTE && npm rebuild 2>/dev/null
    endif

.PHONY: lint
lint: gotools
	./scripts/lint.sh

.PHONY: unit-tests
unit-tests:
	@cd tools/operator && go test -cover ./...

.PHONY: pull-binaries
pull-binaries:
	./scripts/pullBinaries.sh latest fabric fabric-ca

.PHONY: pull-binaries-fabric
pull-binaries-fabric:
	./scripts/pullBinaries.sh latest fabric

.PHONY: pull-binaries-fabric-ca
pull-binaries-fabric-ca:
	./scripts/pullBinaries.sh latest fabric-ca

docker: ca-docker orderer-docker peer-docker proxy-docker

ca-docker:
	cd images/ca && docker build --rm -t hyperledger/fabric-ca:hsm .
	docker tag hyperledger/fabric-ca:hsm hyperledger-fabric.jfrog.io/fabric-ca:hsm

orderer-docker:
	cd images/orderer && docker build --rm -t hyperledger/fabric-orderer:hsm .
	docker tag hyperledger/fabric-orderer:hsm hyperledger-fabric.jfrog.io/fabric-orderer:hsm

peer-docker:
	cd images/peer && docker build --rm -t hyperledger/fabric-peer:hsm .
	docker tag hyperledger/fabric-peer:hsm hyperledger-fabric.jfrog.io/fabric-peer:hsm

proxy-docker:
	cd images/proxy && docker build --rm -t hyperledger/fabric-proxy:hsm .
	docker tag hyperledger/fabric-proxy:hsm hyperledger-fabric.jfrog.io/fabric-proxy:hsm

build/%:
	./ci/scripts/${@}.sh
