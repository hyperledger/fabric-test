# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
# -------------------------------------------------------------
# This makefile defines the following targets
#
#   - ca - clones the fabric-ca repository.
#   - ci-smoke - update submodules, clone fabric & fabric-ca, build docker images
#                and executes smoke tests.
#   - ci-daily - update submodules, clone fabric & fabric-ca, build docker images
#                and executes daily test suite.
#   - docker-images - builds fabric & ca docker images.
#   - fabric - clones fabric repository.
#   - smoke-tests - runs Smoke Test Suite
#   - daily-tests - runs Daily Test Suite
#   - git-latest  -   init git submodules to latest available commit.
#   - git-init  - init git submodules
#   - pre-setup - installs node, govendor and behave pre-requisites
#   - clean  - cleans the docker containers and images
#
# ------------------------------------------------------------------

FABRIC = https://gerrit.hyperledger.org/r/fabric
FABRIC_CA = https://gerrit.hyperledger.org/r/fabric-ca
HYPERLEDGER_DIR = $(GOPATH)/src/github.com/hyperledger
INSTALL_BEHAVE_DEPS = $(GOPATH)/src/github.com/hyperledger/fabric-test/feature/scripts/install_behave.sh
FABRIC_DIR = $(HYPERLEDGER_DIR)/fabric
CA_DIR = $(HYPERLEDGER_DIR)/fabric-ca
DOCKER_ORG = hyperledger
PRE_SETUP = $(GOPATH)/src/github.com/hyperledger/fabric-test/pre_setup.sh
PTE_TAG = $(DOCKER_ORG)/fabric-pte:$(shell git rev-parse --short HEAD)

.PHONY: ci-smoke
ci-smoke: git-init fabric ca clean pre-setup docker-images smoke-tests

.PHONY: git-latest
git-latest:
	@git submodule foreach git pull origin master

.PHONY: git-init
git-init:
	@git submodule update --init --recursive

.PHONY: pre-setup
pre-setup:
	@bash $(PRE_SETUP)
#	@bash $(INSTALL_BEHAVE_DEPS)

.PHONY: ci-daily
ci-daily: git-init fabric ca clean pre-setup docker-images daily-tests

.PHONY: fabric
fabric:
	if [ ! -d "$(FABRIC_DIR)" ]; then \
		echo "Clone FABRIC REPO"; \
		cd $(HYPERLEDGER_DIR); \
		git clone $(FABRIC) $(FABRIC_DIR); \
	fi
	cd $(FABRIC_DIR) && git checkout $(shell cat ../fabric-test/.git/modules/fabric/HEAD)

.PHONY: docker-images
docker-images:
	@make docker -C $(FABRIC_DIR)
	@make native -C $(FABRIC_DIR)
	@make docker -C $(CA_DIR)
	@make docker-fvt -C $(CA_DIR)

.PHONY: ca
ca:
	if [ ! -d "$(CA_DIR)" ]; then \
		echo "Clone CA REPO"; \
		cd $(HYPERLEDGER_DIR); \
		git clone $(FABRIC_CA) $(CA_DIR); \
	fi
	cd $(CA_DIR) && git checkout $(shell cat ../fabric-test/.git/modules/fabric-ca/HEAD)

.PHONY: smoke-tests
smoke-tests:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/smoke && ./runSmokeTestSuite.sh

.PHONY: daily-tests
daily-tests:
	cd $(HYPERLEDGER_DIR)/fabric-test/regression/daily && ./runDailyTestSuite.sh

.PHONY: pte-image
pte-image:
	docker build -t $(PTE_TAG) images/PTE

.PHONY: clean
clean:
	-docker ps -aq | xargs -I '{}' docker rm -f '{}'
	@make docker-clean -C $(FABRIC_DIR)
	@make docker-clean -C $(CA_DIR)
