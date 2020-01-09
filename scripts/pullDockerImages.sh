#!/bin/bash

REPO=$1
VERSION=2.0.0
COUCHDB_VER=2.3
KAFKA_VER=5.3.1
ZOOKEEPER_VER=5.3.1

echo "======== VERIFYING WHETHER GOVENDOR IS INSTALLED ========"
OUTPUT="$(which govendor)"
if [ -z "$OUTPUT" ]; then
  echo "Error: govendor is not installed. Please install it by executing the following steps:"
  echo "cd to the fabric-test directory"
  echo "make gotools"
  echo 'export PATH=$PATH:$GOPATH/bin'
  exit 1
else
  echo $OUTPUT
fi

echo "======== PULL DOCKER IMAGES ========"
##########################################################
# Pull and Tag the fabric and fabric-ca images from Artifactory
##########################################################
echo "Fetching images from Artifactory"
ARTIFACTORY_URL=hyperledger-fabric.jfrog.io
ORG_NAME="hyperledger"
ARCH=$(go env GOARCH)
LATEST_TAG=${LATEST_TAG:=$ARCH-latest}
echo "---------> REPO:" $REPO
echo "---------> LATEST_TAG:" $LATEST_TAG


dockerTag() {
  IMAGELIST=$@
  echo "Images: $IMAGELIST"

  for IMAGE in $IMAGELIST; do
    echo
    echo "Image: fabric-$IMAGE"
    if ! docker pull $ARTIFACTORY_URL/fabric-$IMAGE:$LATEST_TAG > /dev/null; then
           echo  "FAILED: Docker Pull Failed on $IMAGE"
           exit 1
    fi
    docker tag $ARTIFACTORY_URL/fabric-$IMAGE:$LATEST_TAG $ORG_NAME/fabric-$IMAGE
    docker tag $ARTIFACTORY_URL/fabric-$IMAGE:$LATEST_TAG $ORG_NAME/fabric-$IMAGE:$LATEST_TAG
    docker tag $ARTIFACTORY_URL/fabric-$IMAGE:$LATEST_TAG $ORG_NAME/fabric-$IMAGE:$VERSION
    if [ $IMAGE == javaenv ]; then
        docker tag $ARTIFACTORY_URL/fabric-$IMAGE:$LATEST_TAG $ORG_NAME/fabric-$IMAGE:$ARCH-$VERSION
    fi
    echo "Pulled: $ORG_NAME/fabric-$IMAGE:$LATEST_TAG"
    echo "Deleting Artifactory docker images: fabric-$IMAGE"
    docker rmi -f $ARTIFACTORY_URL/fabric-$IMAGE:$LATEST_TAG
  done
}

dockerThirdParty() {
  docker pull couchdb:${COUCHDB_VER}
  docker tag couchdb:${COUCHDB_VER} hyperledger/fabric-couchdb
  docker pull confluentinc/cp-zookeeper:${ZOOKEEPER_VER}
  docker tag confluentinc/cp-zookeeper:${ZOOKEEPER_VER} hyperledger/fabric-zookeeper
  docker pull confluentinc/cp-kafka:${KAFKA_VER}
  docker tag confluentinc/cp-kafka:${KAFKA_VER} hyperledger/fabric-kafka
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
