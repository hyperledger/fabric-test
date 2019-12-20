#!/bin/bash

REPO=$1

RELEASE_VERSION=${RELEASE_VERSION:=$BASE_VERSION-stable}
# Get the arch value
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" = "amd64" ]; then
    ARCH=linux-amd64
fi
echo "Arch: $ARCH"

echo "Fetching binary artifacts from Artifactory"
echo "---------> REPO: $REPO"

##########################################################
# Pull the binaries from Artifactory
##########################################################
pullBinary() {
  REPOS=$@
  echo "Repos: $REPOS"
  for repo in $REPOS; do
    echo "======== PULL $repo BINARIES ========"
    echo

    ARTIFACTORY_URL=https://hyperledger.jfrog.io/hyperledger/fabric-binaries/hyperledger-${repo}-${ARCH}-${RELEASE_VERSION}.tar.gz
    curl "${ARTIFACTORY_URL}" | tar -xvz
    echo "Finished pulling $repo..."
    echo
  done
}

##########################################################
# Select which binaries are needed
##########################################################
case $REPO in
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

#Set the PATH to the bin directory in order to execute the correct binaries
export PATH="$(pwd)/bin:$PATH"

# Show the results
echo "In the bin dir..."
ls -l bin/*
echo
echo "$PATH"

# Copy new binaries to the exported PATH bin dir
mkdir -p "../../fabric/.build/bin"
cp -r bin/* "../../fabric/.build/bin/"

# PTE looks for binaries in fabric submodule dir
mkdir -p ../fabric/.build/bin
cp -r bin/* "../fabric/.build/bin/"
