#!/bin/bash -e
set -o pipefail

cd $GOPATH/src/github.com/hyperledger/fabric-test

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
: ${STABLE_VERSION:=1.3.1-stable}
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

#####################################################
# Pull the fabric-chaincode-javaenv image from Nexus
#####################################################
if [ "$GERRIT_BRANCH" != "master" ]; then
       echo "========> SKIP: javaenv image is not available on $GERRIT_BRANCH"
else
       NEXUS_URL=nexus3.hyperledger.org:10001
       ORG_NAME="hyperledger/fabric"
       IMAGE=javaenv
       : ${JAVAENV:=amd64-1.3.0-stable}
       docker pull $NEXUS_URL/$ORG_NAME-$IMAGE:$JAVAENV
       docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$JAVAENV $ORG_NAME-$IMAGE
       docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$JAVAENV $ORG_NAME-$IMAGE:amd64-1.3.0
       docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$JAVAENV $ORG_NAME-$IMAGE:amd64-latest
       ######################################
       docker images | grep hyperledger/fabric-javaenv || true
fi
echo

echo "======== PULL FABRIC BINARIES ========"
echo "------------> RELEASE_COMMIT:" $RELEASE_COMMIT
RELEASE_COMMIT=${RELEASE_COMMIT:0:7}
OS_VER=$(uname -s|tr '[:upper:]' '[:lower:]')
echo
rm -rf .build && mkdir -p .build && cd .build
curl https://nexus.hyperledger.org/content/repositories/releases/org/hyperledger/fabric/hyperledger-fabric-$STABLE_VERSION/$OS_VER-$ARCH.$STABLE_VERSION-$RELEASE_COMMIT/hyperledger-fabric-$STABLE_VERSION-$OS_VER-$ARCH.$STABLE_VERSION-$RELEASE_COMMIT.tar.gz | tar xz
export PATH=$WORKSPACE/gopath/src/github.com/hyperledger/fabric/.build/bin:$PATH
echo "Binaries fetched from Nexus"
echo
ls -l bin/
echo
