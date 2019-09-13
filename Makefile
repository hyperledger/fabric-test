# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
# -------------------------------------------------------------
# This makefile defines the following targets
#
#   - ca                       - clones the fabric-ca repository.
#   - ci-smoke                 - update submodules, clone fabric, pulls docker images and executes smoke
#                              tests.
#   - ci-daily                 - update submodules, clone fabric, pulls docker images and executes daily
#                              test suite. NOT USED?
#   - svt-daily                - clones fabric, pulls the images, binaries from Nexus and runs the daily
#                              test suite. NOT USED?
#   - svt-smoke                - pulls the images, binaries from Nexus and runs the smoke tests. NOT USED?
#   - k8s-sys-test             - Triggers system tests on k8s cluster
#   - build-docker-images      - builds fabric & ca docker images.
#   - build-fabric             - builds fabric docker images and binaries.
#   - build-fabric-ca          - builds fabric-ca docker images and binaries.
#   - build-sdk-wrapper        - builds fabric-sdk-java wrapper jar files.
#   - fabric                   - clones fabric repository.
#   - fabric-chaincode-java    - clones the fabric-chaincode-java repository.
#   - smoke-tests              - runs Smoke Test Suite.
#   - daily-tests              - runs Daily Test Suite.
#   - pull-images              - pull the images and binaries from Nexus.
#   - javaenv                  - clone the fabric-chaincode-java repository and build the javaenv image.
#   - nodeenv                  - clone the fabric-chaincode-node repository and build the nodeenv image.
#   - svt-daily-behave-tests   - pulls the images, binaries from Nexus and runs the Behave feature tests.
#   - svt-daily-pte-tests      - pulls the images, binaries from Nexus and runs the PTE Performance tests.
#   - svt-daily-ote-tests      - clones fabric, pulls the images, runs the OTE test suite.
#   - svt-daily-lte-tests      - pulls the images, runs the LTE test suite.
#   - svt-daily-ca-tests       - pulls the images, runs the CA test suite.
#   - svt-weekly-pte-12hr-test - pulls the images, binaries from Nexus and runs the weekly 12hr PTE test.
#   - svt-weekly-pte-12hr-test-k8s -- Test 12hr longrun test in k8s environment.
#   - git-latest               - init git submodules to latest available commit.
#   - git-init                 - init git submodules.
#   - pre-setup                - installs node, govendor and behave pre-requisites.
#   - pte                      - builds pte docker image
#   - clean                    - cleans the docker containers and images.
#
# ------------------------------------------------------------------

TOOL_VERSION = 1.2.0
DOCKER_NS = hyperledger
EXTRA_VERSION ?= $(shell git rev-parse --short HEAD)
PROJECT_TOOL_VERSION = $(TOOL_VERSION)-$(EXTRA_VERSION)
BRANCH = master
FABRIC = https://github.com/hyperledger/fabric
FABRIC_CA = https://github.com/hyperledger/fabric-ca
FABRIC-CHAINCODE-JAVA = https://github.com/hyperledger/fabric-chaincode-java
FABRIC-CHAINCODE-NODE = https://github.com/hyperledger/fabric-chaincode-node
HYPERLEDGER_DIR = $(GOPATH)/src/github.com/hyperledger
INSTALL_BEHAVE_DEPS = $(GOPATH)/src/github.com/hyperledger/fabric-test/scripts/install_behave.sh
FABRIC_DIR = $(HYPERLEDGER_DIR)/fabric
CA_DIR = $(HYPERLEDGER_DIR)/fabric-ca
CHAINCODE-JAVA_DIR = $(HYPERLEDGER_DIR)/fabric-chaincode-java
CHAINCODE-NODE_DIR = $(HYPERLEDGER_DIR)/fabric-chaincode-node
PRE_SETUP = $(GOPATH)/src/github.com/hyperledger/fabric-test/scripts/pre_setup.sh
PTE_IMAGE = $(DOCKER_NS)/fabric-pte
TARGET = pte
STABLE_TAG ?= $(ARCH)-$(BRANCH)-stable

.PHONY: ci-smoke
ci-smoke: fabric ca pre-req pull-images pull-binaries-fabric pull-thirdparty-images build-fabric-ca smoke-tests

.PHONY: git-latest
git-latest:
	@git submodule foreach git checkout $(BRANCH)
	@git submodule foreach git pull origin $(BRANCH)

.PHONY: git-init
git-init:
	@git submodule update --init --recursive

.PHONY: pre-setup
pre-setup:
	@bash $(PRE_SETUP)
#	@bash $(INSTALL_BEHAVE_DEPS)

.PHONY: pre-req
pre-req: git-init git-latest clean pre-setup

.PHONY: ci-daily
ci-daily: pre-req fabric pull-images pull-binaries pull-thirdparty-images build-sdk-wrapper daily-tests

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

.PHONY: build-sdk-wrapper
build-sdk-wrapper:
	cd $(HYPERLEDGER_DIR)/fabric-test/feature/sdk/java && ./package.sh

.PHONY: pull-thirdparty-images
pull-thirdparty-images:
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
smoke-tests:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/smoke && ./runSmokeTestSuite.sh

.PHONY: daily-tests
daily-tests:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runBehaveTestSuite.sh; ./runPteTestSuite.sh; ./runOteTestSuite.sh; ./runLteTestSuite.sh; ./runCATestSuite.sh

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
interop-fabric: pre-req fabric pull-thirdparty-images pull-fabric-javaenv pull-binaries-fabric-ca build-fabric build-fabric-ca build-sdk-wrapper interop-tests

.PHONY: interop-fabric-ca
interop-fabric-ca: pre-req fabric pull-thirdparty-images pull-fabric pull-binaries-fabric pull-fabric-javaenv build-fabric-ca build-sdk-wrapper interop-tests

.PHONY: interop-fabric-sdk-node
interop-fabric-sdk-node: pre-req fabric pull-thirdparty-images pull-binaries pull-fabric-ca pull-fabric-javaenv build-sdk-wrapper interop-tests

.PHONY: interop-fabric-nodeenv
interop-fabric-nodeenv: pre-req fabric pull-thirdparty-images pull-binaries pull-fabric-nodeenv nodeenv build-sdk-wrapper interop-tests

.PHONY: interop-fabric-sdk-java
interop-fabric-sdk-java: pre-req fabric pull-thirdparty-images pull-binaries pull-fabric-ca pull-fabric-javaenv build-sdk-wrapper interop-tests

.PHONY: interop-fabric-javaenv
interop-fabric-javaenv: pre-req fabric pull-thirdparty-images pull-binaries pull-fabric-ca javaenv build-sdk-wrapper interop-tests

.PHONY: svt-daily-behave-tests
svt-daily-behave-tests: pre-req fabric pull-images pull-binaries pull-thirdparty-images build-fabric-ca build-sdk-wrapper
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runBehaveTestSuite.sh

.PHONY: svt-daily-pte-tests
svt-daily-pte-tests: pre-req fabric pull-images pull-binaries pull-thirdparty-images
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runPteTestSuite.sh

.PHONY: svt-daily-ote-tests
svt-daily-ote-tests: pre-req fabric pull-images pull-binaries pull-thirdparty-images
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runOteTestSuite.sh

.PHONY: svt-daily-lte-tests
svt-daily-lte-tests: pre-req fabric pull-binaries pull-thirdparty-images
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runLteTestSuite.sh

.PHONY: svt-daily-ca-tests
svt-daily-ca-tests: pre-req pull-images pull-binaries-fabric build-fabric-ca
	@make docker-fvt -C $(CA_DIR)
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runCATestSuite.sh

.PHONY: svt-weekly-pte-12hr-test
svt-weekly-pte-12hr-test: pre-req fabric pull-images pull-binaries pull-thirdparty-images
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/weekly && ./run12HrTest.sh

.PHONY: svt-weekly-pte-12hr-test-k8s
svt-weekly-pte-12hr-test-k8s:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/weekly && ./run12HrTest_k8s.sh

.PHONY: svt-daily
svt-daily: pre-req fabric pull-images pull-binaries pull-thirdparty-images build-sdk-wrapper daily-tests

.PHONY: svt-smoke
svt-smoke: fabric pre-req pull-images pull-binaries pull-thirdparty-images build-sdk-wrapper smoke-tests

.PHONY: pte
pte:
	docker build -t $(PTE_IMAGE) images/PTE
	docker tag $(PTE_IMAGE) $(PTE_IMAGE):$(PROJECT_TOOL_VERSION)

.PHONY: clean
clean:
	-docker ps -aq | xargs -I '{}' docker rm -f '{}' || true
	@make docker-clean -C $(FABRIC_DIR) || true
	@make docker-clean -C $(CA_DIR) || true
