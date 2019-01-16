#!/bin/bash -e
set -o pipefail

BRANCH=$1
CA_DIR=$2

echo "Build docker images from fabric-ca repo"
ARCH=$(go env GOARCH)
STABLE_TAG=$ARCH-$BRANCH-stable
ORG_NAME="hyperledger"
LATEST_TAG=${LATEST_TAG:=$ARCH-latest}
FABRIC_TAG=latest

for IMAGE in fabric-ca-orderer fabric-ca-peer fabric-ca-tools; do
  echo "Image: $IMAGE"
  DOCKER_NAME=${ORG_NAME}/${IMAGE}
  echo "---------> IMAGE:" $IMAGE
  echo "---------> LATEST_TAG:" $LATEST_TAG
  echo "---------> CA_DIR:" $CA_DIR

  echo "Building docker $IMAGE image"
  mkdir -p ../build/image/$IMAGE/payload
  cat ../images/$IMAGE/Dockerfile.in \
	  | sed -e 's|'"_BASE_NS_"'|'"$ORG_NAME"'|g' \
	  | sed -e 's|'"_NS_"'|'"$ORG_NAME"'|g' \
	  | sed -e 's|'"_FABRIC_TAG_"'|'"$FABRIC_TAG"'|g' \
	  > ../build/image/$IMAGE/Dockerfile

  cp $CA_DIR/bin/fabric-ca-client ../build/image/$IMAGE/payload/.
  cd ..
  docker build --build-arg FABRIC_CA_DYNAMIC_LINK=$FABRIC_CA_DYNAMIC_LINK -t $DOCKER_NAME build/image/$IMAGE
  docker tag $DOCKER_NAME $DOCKER_NAME:$LATEST_TAG
  touch payload
  cd -
done

echo
docker images | grep "hyperledger*"
echo
