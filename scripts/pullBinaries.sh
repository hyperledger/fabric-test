#!/bin/bash
set -euo pipefail

# Set the working directory
WD=$(cd "$(dirname "$0")/.." && pwd)
cd "${WD}"

RELEASE_VERSION=$1
shift

# Get the arch value
ARCH=$(arch)
if [[ ${ARCH} == "x86_64" ]]; then
	ARCH=linux-amd64
elif [[ ${ARCH} == "i386" ]]; then
	ARCH=darwin-amd64
else
    printf "Unsupported Architecture, exiting...\n"
    exit 1
fi

printf "\nDownloading fabric-%s binaries from Artifactory\n" "${ARCH}"

##########################################################
# Pull the binaries from Artifactory
##########################################################

REPOS=("$@")
mkdir -p "${WD}/bin"
for repo in "${REPOS[@]}"; do
	ARTIFACTORY_URL=https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-${repo}-${ARCH}-${RELEASE_VERSION}.tar.gz
	curl -sS "${ARTIFACTORY_URL}" -o binaries.tgz
	tar -xf binaries.tgz
	rm -rf binaries.tgz
	printf "\nFinished downloading %s binaries\n\n" "${repo}"
done

printf "The following binaries have been installed at %s/bin:\n\n%s\n\n" "${WD}" "$(ls -l "${WD}"/bin)"
