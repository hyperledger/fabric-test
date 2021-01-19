# Copyright the Hyperledger Fabric contributors. All rights reserved.
#
# SPDX-License-Identifier: Apache-2.0

GOTOOLS = gocov gocov-xml goimports golint ginkgo govendor
TOOLS = $(CURDIR)/bin

.PHONY: gotools
gotools: $(patsubst %,build/tools/%, $(GOTOOLS))

build/tools/%: tools/gotools/go.mod tools/gotools/tools.go
	@mkdir -p $(@D)
	@$(eval TOOL = ${subst build/tools/,,${@}})
	@$(eval FQP = $(shell grep ${TOOL} tools/gotools/tools.go | cut -d " " -f2 | tr -d '"'))
	@echo Installing ${TOOL} at $(TOOLS) from ${FQP}
	@echo "TOOL: " $(TOOLS)
	@cd tools/gotools && GO111MODULE=on GOBIN=$(TOOLS) go install ${FQP}