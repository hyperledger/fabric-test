# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
# -------------------------------------------------------------
# This makefile defines the following targets
#
#   - ca                           - clones the fabric-ca repository.
#   - ci-smoke                     - update submodules, clone fabric, pulls docker images and executes smoke tests.
#   - ci-barebones                 - update submodules, clone fabric, pulls docker images and executes barebones tests.
#   - ci-daily                     - update submodules, clone fabric, pulls docker images and executes daily test suite.
#   - k8s-sys-test                 - Triggers system tests on k8s cluster
#   - build-docker-images          - builds fabric & ca docker images.
#   - build-fabric                 - builds fabric docker images and binaries.
#   - build-fabric-ca              - builds fabric-ca docker images and binaries.
#   - fabric                       - clones fabric repository.
#   - fabric-chaincode-java        - clones the fabric-chaincode-java repository.
#   - smoke-tests                  - runs Smoke Test Suite.
#   - barebones-tests              - runs Barebones Test Suite.
#   - daily-tests                  - runs Daily Test Suite.
#   - pull-images                  - pull the images and binaries from Artifactory.
#   - javaenv                      - clone the fabric-chaincode-java repository and build the javaenv image.
#   - nodeenv                      - clone the fabric-chaincode-node repository and build the nodeenv image.
#   - svt-weekly-pte-12hr-test-k8s - Test 12hr longrun test in k8s environment.
#   - npm-init                     - initialize the PTE NPM modules
#   - git-latest                   - init git submodules to latest available commit.
#   - git-init                     - init git submodules.
#   - pre-setup                    - installs node and govendor
#   - clean                        - cleans the docker containers.
#   - gotools                      - installs go tools, such as: ginkgo, golint, goimports, gocov and govendor
#
# ------------------------------------------------------------------

BRANCH = master
FABRIC = https://github.com/hyperledger/fabric
FABRIC_CA = https://github.com/hyperledger/fabric-ca
FABRIC-CHAINCODE-JAVA = https://github.com/hyperledger/fabric-chaincode-java
FABRIC-CHAINCODE-NODE = https://github.com/hyperledger/fabric-chaincode-node
HYPERLEDGER_DIR = $(GOPATH)/src/github.com/hyperledger
FABRIC_DIR = $(HYPERLEDGER_DIR)/fabric
CA_DIR = $(HYPERLEDGER_DIR)/fabric-ca
CHAINCODE-JAVA_DIR = $(HYPERLEDGER_DIR)/fabric-chaincode-java
CHAINCODE-NODE_DIR = $(HYPERLEDGER_DIR)/fabric-chaincode-node
PRE_SETUP = $(GOPATH)/src/github.com/hyperledger/fabric-test/scripts/pre_setup.sh

include gotools.mk

.PHONY: ci-smoke
ci-smoke: pre-reqs pull-binaries-fabric smoke-tests

.PHONY: ci-barebones
ci-barebones: pre-reqs pull-binaries-fabric barebones-tests

.PHONY: ci-daily
ci-daily: pre-reqs pull-binaries-fabric daily-tests

.PHONY: npm-init
npm-init:
	cd $(CURDIR)/tools/PTE && npm install
    ifeq ($(shell arch), i386)
		cd $(CURDIR)/tools/PTE && npm rebuild 2>/dev/null
    endif

.PHONY: pre-reqs
pre-reqs: docker-clean npm-init gotools

.PHONY: pre-setup
pre-setup: gotools
	@bash $(PRE_SETUP)

.PHONY: git-latest
git-latest:
	@git submodule foreach git checkout $(BRANCH)
	@git submodule foreach git pull origin $(BRANCH)

.PHONY: git-init
git-init:
	@git submodule update --init --recursive

.PHONY: fabric
fabric:
	if [ ! -d "$(FABRIC_DIR)" ]; then \
		echo "Clone FABRIC REPO"; \
		cd $(HYPERLEDGER_DIR); \
		git clone --single-branch -b $(BRANCH) $(FABRIC) $(FABRIC_DIR); \
	else \
		cd $(FABRIC_DIR) && git pull $(FABRIC); \
	fi

.PHONY: build-docker-images
build-docker-images: build-fabric build-fabric-ca

.PHONY: build-fabric
build-fabric: fabric
	@make docker -C $(FABRIC_DIR)
	@make docker-thirdparty -C $(FABRIC_DIR)
	@make native -C $(FABRIC_DIR)

.PHONY: build-fabric-ca
build-fabric-ca: ca
	@make docker -C $(CA_DIR)
	@make fabric-ca-client -C $(CA_DIR)
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./buildFabricCaImages.sh $(BRANCH) $(CA_DIR)

.PHONY: pull-thirdparty-images
pull-thirdparty-images: gotools
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh third-party

.PHONY: ca
ca:
	if [ ! -d "$(CA_DIR)" ]; then \
		echo "Clone CA REPO"; \
		cd $(HYPERLEDGER_DIR); \
		git clone --single-branch -b $(BRANCH) $(FABRIC_CA) $(CA_DIR); \
	else \
		cd $(CA_DIR) && git pull $(FABRIC_CA); \
	fi

.PHONY: fabric-chaincode-java
fabric-chaincode-java:
	if [ ! -d "$(CHAINCODE-JAVA_DIR)" ]; then \
		echo "Clone FABRIC-CHAINCODE-JAVA REPO"; \
		cd $(HYPERLEDGER_DIR); \
		git clone --single-branch -b $(BRANCH) $(FABRIC-CHAINCODE-JAVA) $(CHAINCODE-JAVA_DIR); \
	else \
		cd $(CHAINCODE-JAVA_DIR) && git pull $(FABRIC-CHAINCODE-JAVA); \
	fi

.PHONY: javaenv
javaenv: fabric-chaincode-java
	@cd $(CHAINCODE-JAVA_DIR) && ./gradlew buildimage

.PHONY: fabric-chaincode-node
fabric-chaincode-node:
	if [ ! -d "$(CHAINCODE-NODE_DIR)" ]; then \
		echo "Clone FABRIC-CHAINCODE-NODE REPO"; \
		cd $(HYPERLEDGER_DIR); \
		git clone --single-branch -b $(BRANCH) $(FABRIC-CHAINCODE-NODE) $(CHAINCODE-NODE_DIR); \
	else \
		cd $(CHAINCODE-NODE_DIR) && git pull $(FABRIC-CHAINCODE-NODE); \
	fi

.PHONY: nodeenv
nodeenv: fabric-chaincode-node
	@cd $(CHAINCODE-NODE_DIR) && npm install && npm install gulp -g && gulp docker-image-build

.PHONY: smoke-tests
smoke-tests: gotools
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/smoke && ./runSmokeTestSuite.sh

.PHONY: barebones-tests
barebones-tests: gotools
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/barebones && ./runBarebonesTestSuite.sh

.PHONY: daily-tests
daily-tests:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runPteTestSuite.sh

.PHONY: interop-tests
interop-tests:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/interop && ./runInteropTestSuite.sh

.PHONY: k8s-sys-test
k8s-sys-test:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/systemtest && ./runk8ssystest.sh

.PHONY: pull-images
pull-images:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh all

.PHONY: pull-binaries
pull-binaries:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullBinaries.sh

.PHONY: pull-binaries-fabric
pull-binaries-fabric:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullBinaries.sh fabric

.PHONY: pull-binaries-fabric-ca
pull-binaries-fabric-ca:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullBinaries.sh fabric-ca

.PHONY: pull-fabric
pull-fabric:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh fabric

.PHONY: pull-fabric-ca
pull-fabric-ca:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh fabric-ca

.PHONY: pull-fabric-sdk-node
pull-fabric-sdk-node:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh fabric-sdk-node

.PHONY: pull-fabric-sdk-java
pull-fabric-sdk-java:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh fabric-sdk-java

.PHONY: pull-fabric-javaenv
pull-fabric-javaenv:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh fabric-javaenv

.PHONY: pull-fabric-nodeenv
pull-fabric-nodeenv:
	cd $(HYPERLEDGER_DIR)/fabric-test/scripts && ./pullDockerImages.sh fabric-nodeenv

.PHONY: interop-fabric
interop-fabric: pre-reqs fabric pull-thirdparty-images pull-fabric-javaenv pull-binaries-fabric-ca build-fabric build-fabric-ca  interop-tests

.PHONY: interop-fabric-ca
interop-fabric-ca: pre-reqs fabric pull-thirdparty-images pull-fabric pull-binaries-fabric pull-fabric-javaenv build-fabric-ca  interop-tests

.PHONY: interop-fabric-sdk-node
interop-fabric-sdk-node: pre-reqs fabric pull-thirdparty-images pull-binaries pull-fabric-ca pull-fabric-javaenv  interop-tests

.PHONY: interop-fabric-nodeenv
interop-fabric-nodeenv: pre-reqs fabric pull-thirdparty-images pull-binaries pull-fabric-nodeenv nodeenv  interop-tests

.PHONY: interop-fabric-sdk-java
interop-fabric-sdk-java: pre-reqs fabric pull-thirdparty-images pull-binaries pull-fabric-ca pull-fabric-javaenv  interop-tests

.PHONY: interop-fabric-javaenv
interop-fabric-javaenv: pre-reqs fabric pull-thirdparty-images pull-binaries pull-fabric-ca javaenv  interop-tests

.PHONY: svt-weekly-pte-12hr-test-k8s
svt-weekly-pte-12hr-test-k8s:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/weekly && ./run12HrTest_k8s.sh

.PHONY: docker-clean
docker-clean:
	docker kill $(docker ps -a -q) || true
	docker rm $(docker ps -a -q) || true
