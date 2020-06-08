# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
# -------------------------------------------------------------
# This makefile defines the following targets
#
#   - regression/barebones			- Executes barebones tests
#   - regression/barebones_caliper		- Executes barebones tests using Caliper
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

regression/barebones_caliper: pre-reqs caliper-init
	cd regression/barebones_caliper && ginkgo -v

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

.PHONY: caliper-init
caliper-init:
	npm install -g --only=prod @hyperledger/caliper-cli@0.3.1
	caliper bind --caliper-bind-sut fabric:latest --caliper-bind-args=-g

build/%:
	./ci/scripts/${@}.sh
