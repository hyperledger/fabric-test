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
#   - regression/weekly				- Executres 12hr long running test in k8s environment
#   - npm-init						- Initializes the PTE NPM modules
#   - gotools						- Installs go tools, such as: ginkgo, golint, goimports, gocov and govendor
#
# ------------------------------------------------------------------

include gotools.mk

regression/%: pre-reqs
	cd ${@} && ginkgo -v

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

.PHONY: pull-binaries
pull-binaries:
	./scripts/pullBinaries.sh fabric fabric-ca

.PHONY: pull-binaries-fabric
pull-binaries-fabric:
	./scripts/pullBinaries.sh fabric

.PHONY: pull-binaries-fabric-ca
pull-binaries-fabric-ca:
	./scripts/pullBinaries.sh fabric-ca
