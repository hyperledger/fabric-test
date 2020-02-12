#!/bin/bash
set -euo pipefail

REPO=$1
# Set the working directory
WD=$(cd `dirname $0`/.. && pwd)
cd ${WD}

RELEASE_VERSION=${RELEASE_VERSION:=latest}

# Get the arch value
ARCH=$(arch)
if [[ "${ARCH}" = "x86_64" ]]; then
    ARCH=linux-amd64
elif [[ "$ARCH" = "i386" ]]; then
    ARCH=darwin-amd64
fi

echo "Downloading ${REPO}-${ARCH} binary artifacts from Artifactory"

##########################################################
# Pull the binaries from Artifactory
##########################################################

pullBinary() {
  REPOS=$@
  mkdir -p ${WD}/bin
  for repo in "${REPOS}"; do
    echo
    ARTIFACTORY_URL=https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-${repo}-${ARCH}-${RELEASE_VERSION}.tar.gz
    curl "${ARTIFACTORY_URL}" | tar -xvz
    rm -rf config
    echo "Finished pulling $repo..."
    echo
  done
}

##########################################################
# Select which binaries are needed
##########################################################
case ${REPO} in
fabric)
  echo "Pull only fabric binaries"
  pullBinary fabric
  ;;
fabric-ca)
  echo "Pull only fabric-ca binaries"
  pullBinary fabric-ca
  ;;
*)
  echo "Pull all binaries"
  pullBinary fabric fabric-ca
  ;;
esac

echo "In the ${WD}/bin dir..."
ls -l ${WD}/bin
