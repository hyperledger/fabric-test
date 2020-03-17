#!/bin/bash

# Copyright Greg Haskins All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

set -e

fabric_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd ${fabric_dir}

declare -a source_dirs
source_dirs=($(cd ${fabric_dir}/tools/operator && go list -f '{{.Dir}}' ./... | sed s,"${fabric_dir}".,,g))

echo "Checking with gofmt"
OUTPUT="$(gofmt -l -s "${source_dirs[@]}")"
if [[ -n $OUTPUT ]]; then
	echo "The following files contain gofmt errors"
	echo "$OUTPUT"
	echo "The gofmt command 'gofmt -l -s -w' must be run for these files"
	exit 1
fi

echo "Checking with goimports"
OUTPUT="$(goimports -l "${source_dirs[@]}")"
if [[ -n $OUTPUT ]]; then
	echo "The following files contain goimports errors"
	echo "$OUTPUT"
	echo "The goimports command 'goimports -l -w' must be run for these files"
	exit 1
fi

echo "Checking with go vet"
PRINTFUNCS="Print,Printf,Info,Infof,Warning,Warningf,Error,Errorf,Critical,Criticalf,Sprint,Sprintf,Log,Logf,Panic,Panicf,Fatal,Fatalf,Notice,Noticef,Wrap,Wrapf,WithMessage"
OUTPUT="$(cd ${fabric_dir}/tools/operator && go vet -all -printfuncs "$PRINTFUNCS" ./...)"
if [[ -n $OUTPUT ]]; then
	echo "The following files contain go vet errors"
	echo "$OUTPUT"
	exit 1
fi
