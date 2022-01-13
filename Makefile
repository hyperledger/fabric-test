# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
# -------------------------------------------------------------
# This makefile defines the following targets
#
#   - regression/chaos_peers        - Executes peer chaos tests
#   - regression/barebones          - Executes barebones tests
#   - regression/barebones_caliper  - Executes barebones tests using Caliper
#   - regression/basicnetwork       - Executes basicnetwork tests
#   - regression/smoke              - Executes smoke tests
#   - upgrade                       - Executes upgrade scenario in weekly from 1.4 to 2.0
#   - npm-init                      - Initializes the PTE NPM modules
#   - gotools                       - Installs go tools, such as: ginkgo, golint, goimports, gocov and govendor
#
# ------------------------------------------------------------------

include gotools.mk

regression/chaos_%: pre-reqs chaos-init
	cd ${@} && ginkgo -v

regression/barebones_caliper: pre-reqs caliper-init
	cd regression/barebones_caliper && ginkgo -v

regression/%: pre-reqs
	cd ${@} && ginkgo -v

.PHONY: regression/hsm
regression/hsm: docker
	cd ${@} && ./network.sh

upgrade%:
	cd regression/upgrade && ./${@}.sh

.PHONY: pre-reqs
pre-reqs: npm-init pull-binaries-fabric gotools

.PHONY: npm-init
npm-init:
	cd $(CURDIR)/tools/PTE && npm install

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

.PHONY: chaos-init
chaos-init:
	cd chaincodes/chaos/node && npm install && npm run build
	cd tools/chaos/client/node && npm install && npm run build
	cd tools/chaos/engine && npm install &&  npm run build

.PHONY: caliper-init
caliper-init:
	cd regression/barebones_caliper && npm init -y
	cd regression/barebones_caliper && npm install --only=prod @hyperledger/caliper-cli@0.3.1
	cd regression/barebones_caliper && npx caliper bind --caliper-bind-sut fabric:latest

docker: docker-ca docker-orderer docker-peer docker-proxy-tools docker-proxy
docker-ca: docker-image-ca
docker-orderer: docker-image-orderer
docker-peer: docker-image-peer
docker-proxy: docker-image-proxy
docker-proxy-tools: docker-image-proxy-tools
docker-image-%:
	$(eval image = ${subst docker-image-,,${@}})
	cd images/${image} && docker build -t hyperledger-fabric.jfrog.io/fabric-${image}:hsm .

docker-clean:
	docker rmi -f $$(docker images -f "dangling=true" -q)

build/%:
	./ci/scripts/interop/${@}.sh

.PHONY: clean
clean:
	rm -rf bin/ build/ config/ tools/PTE/node_modules
