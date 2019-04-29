#!/bin/bash

REPO=$1
VERSION=2.0.0

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
LATEST_TAG=${LATEST_TAG:=$ARCH-latest}
echo "---------> REPO:" $REPO
echo "---------> LATEST_TAG:" $LATEST_TAG


dockerTag() {
  IMAGELIST=$@
  echo "Images: $IMAGELIST"

  for IMAGE in $IMAGELIST; do
    echo
    echo "Image: $IMAGE"
    if ! docker pull $NEXUS_URL/$ORG_NAME-$IMAGE:$LATEST_TAG > /dev/null; then
           echo  "FAILED: Docker Pull Failed on $IMAGE"
           exit 1
    fi
    docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$LATEST_TAG $ORG_NAME-$IMAGE
    docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$LATEST_TAG $ORG_NAME-$IMAGE:$LATEST_TAG
    docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$LATEST_TAG $ORG_NAME-$IMAGE:$VERSION
    if [ $IMAGE == javaenv ]; then
        docker tag $NEXUS_URL/$ORG_NAME-$IMAGE:$LATEST_TAG $ORG_NAME-$IMAGE:$ARCH-$VERSION
    fi
    echo "$ORG_NAME-$IMAGE:$LATEST_TAG"
    echo "Deleting Nexus docker images: $IMAGE"
    docker rmi -f $NEXUS_URL/$ORG_NAME-$IMAGE:$LATEST_TAG
  done
}

dockerThirdParty() {
  for IMAGE in kafka zookeeper couchdb; do
    echo "$ORG_NAME-$IMAGE"
    if ! docker pull $ORG_NAME-$IMAGE:latest > /dev/null; then
       echo  "FAILED: Docker Pull Failed on $IMAGE"
       exit 1
    fi
    docker tag $ORG_NAME-$IMAGE:latest $ORG_NAME-$IMAGE:$ARCH-latest
  done
}

case $REPO in
fabric)
  echo "Pull all images except fabric"
  dockerTag javaenv nodeenv ca
  ;;
fabric-ca)
  echo "Pull all images except fabric-ca"
  dockerTag peer orderer baseos ccenv nodeenv tools javaenv
  ;;
fabric-sdk-node)
  echo "Pull all images except fabric-sdk-node"
  dockerTag peer orderer baseos ccenv nodeenv tools ca javaenv
  ;;
fabric-sdk-java)
  echo "Pull all images except fabric-sdk-java"
  dockerTag peer orderer baseos ccenv nodeenv tools ca javaenv
  ;;
fabric-javaenv)
  echo "Pull all images except fabric-javaenv"
  dockerTag peer orderer baseos ccenv nodeenv tools ca
  ;;
fabric-nodeenv)
  echo "Pull all images except fabric-nodeenv"
  dockerTag peer orderer baseos ccenv tools ca javaenv
  ;;
third-party)
  echo "Pull all third-party docker images"
  dockerThirdParty
  ;;
*)
  echo "Pull all images"
  dockerTag peer orderer baseos ccenv nodeenv tools ca javaenv
  ;;
esac

echo
docker images | grep "hyperledger*"
echo
