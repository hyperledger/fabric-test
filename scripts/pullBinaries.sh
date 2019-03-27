#!/bin/bash -e
#set -o pipefail

REPO=$1
# Set the working directory
WD=$GOPATH/src/github.com/hyperledger/fabric-test
cd $WD

RELEASE_VERSION=${RELEASE_VERSION:=latest}
# Get the arch value
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" = "amd64" ]; then
    ARCH=linux-amd64
fi
echo "Arch: $ARCH"

echo "Fetching binary artifacts from Nexus"
echo "---------> REPO:" $REPO

##########################################################
# Pull the binaries from Nexus
##########################################################
pullBinary() {
  REPOS=$@
  echo "Repos: $REPOS"
  for repo in $REPOS; do
    echo "======== PULL $repo BINARIES ========"
    echo

    # Set Nexus Snapshot URL
    NEXUS_URL=https://nexus.hyperledger.org/content/repositories/snapshots/org/hyperledger/$repo/hyperledger-$repo-$RELEASE_VERSION/$ARCH.$RELEASE_VERSION-SNAPSHOT

    # Download the maven-metadata.xml file
    curl $NEXUS_URL/maven-metadata.xml > maven-metadata.xml
    if grep -q "not found in local storage of repository" "maven-metadata.xml"; then
        echo  "FAILED: Unable to download from $NEXUS_URL"
    else
        # Set latest tar file to the VERSION
        VERSION=$(grep value maven-metadata.xml | sort -u | cut -d "<" -f2|cut -d ">" -f2)
        echo "Version: $VERSION..."

        # Download tar.gz file and extract it
        mkdir -p $WD/bin
        curl $NEXUS_URL/hyperledger-$repo-$RELEASE_VERSION-$VERSION.tar.gz | tar xz
        rm hyperledger-$repo-*.tar.gz
        cd -
        rm -f maven-metadata.xml
        echo "Finished pulling $repo..."
        echo
    fi
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
export PATH=$WD/bin:$PATH

# Show the results
ls -l $WD
echo
echo "In the bin dir..."
ls -l $WD/bin/*
echo
echo $PATH

# Copy new binaries to the exported PATH bin dir
mkdir -p $GOPATH/src/github.com/hyperledger/fabric/.build/bin
cp -r $WD/bin/* $GOPATH/src/github.com/hyperledger/fabric/.build/bin/

# PTE looks for binaries in fabric submodule dir
mkdir -p $GOPATH/src/github.com/hyperledger/fabric-test/fabric/.build/bin
cp -r $WD/bin/* $GOPATH/src/github.com/hyperledger/fabric-test/fabric/.build/bin/

# Temporarily copy fabric-ca binaries to the exported fabric bin dir
cp -r $GOPATH/src/github.com/hyperledger/fabric-ca/bin/* $GOPATH/src/github.com/hyperledger/fabric/.build/bin/
cp -r $GOPATH/src/github.com/hyperledger/fabric-ca/bin/* $GOPATH/src/github.com/hyperledger/fabric-test/fabric/.build/bin/
echo
