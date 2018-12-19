#!/bin/bash -e
set -o pipefail

cd $GOPATH/src/github.com/hyperledger/fabric-test

echo "Update fabric-test submodules and install nodejs"

for TARGET in git-init git-latest fabric ca clean pre-setup; do
  make $TARGET
    if [ $? != 0 ]; then
      echo "FAILED: make $TARGET failed to execute"
      exit 1
    else
      echo "make $TARGET is successful"
      echo
    fi
done

###################
# Install govender
###################
echo "Install govendor"
go get -u github.com/kardianos/govendor

echo "======== PULL DOCKER IMAGES ========"

##########################################################
# Pull and Tag the fabric and fabric-ca images from Nexus
##########################################################
echo "Fetching images from Nexus"
NEXUS_URL=nexus3.hyperledger.org:10001
ORG_NAME="hyperledger/fabric"
ARCH=$(go env GOARCH)
: ${STABLE_VERSION:=1.2.1-stable}
STABLE_TAG=$ARCH-$STABLE_VERSION
echo "---------> STABLE_VERSION:" $STABLE_VERSION

cd $GOPATH/src/github.com/hyperledger/fabric

dockerTag() {
  for IMAGES in peer orderer ccenv tools ca ca-tools ca-peer ca-orderer ca-fvt; do
    echo "Images: $IMAGES"
    echo
    docker pull $NEXUS_URL/$ORG_NAME-$IMAGES:$STABLE_TAG
          if [ $? != 0 ]; then
             echo  "FAILED: Docker Pull Failed on $IMAGES"
             exit 1
          fi
    docker tag $NEXUS_URL/$ORG_NAME-$IMAGES:$STABLE_TAG $ORG_NAME-$IMAGES
    docker tag $NEXUS_URL/$ORG_NAME-$IMAGES:$STABLE_TAG $ORG_NAME-$IMAGES:$STABLE_TAG
    echo "$ORG_NAME-$IMAGES:$STABLE_TAG"
    echo "Deleting Nexus docker images: $IMAGES"
    docker rmi -f $NEXUS_URL/$ORG_NAME-$IMAGES:$STABLE_TAG
  done
}

dockerTag

echo
docker images | grep "hyperledger*"
echo

# Pull Binaries from Nexus
MARCH=$(dpkg --print-architecture)
if [ "$MARCH" = "amd64" ]; then
    MARCH=linux-amd64
fi
echo "MARCH: $MARCH"
RELEASE_VERSION=${RELEASE_VERSION:=1.2.1-stable}
NEXUS_URL=https://nexus.hyperledger.org/content/repositories/snapshots/org/hyperledger/fabric/hyperledger-fabric-$RELEASE_VERSION/$MARCH.$RELEASE_VERSION-SNAPSHOT

if [ -z $WD ]; then
   WD=fabric/.build
fi

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
    cd $WD
    curl $NEXUS_URL/hyperledger-fabric-$RELEASE_VERSION-$VERSION.tar.gz | tar xz
    rm hyperledger-fabric-*.tar.gz
    cd -
    rm -f maven-metadata.xml
    echo "Finished pulling fabric binaries..."
    ls -l $WD/bin
    export PATH=$WD/bin:$PATH
fi
echo
