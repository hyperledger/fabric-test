#!/bin/bash -e

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
WD=$FabricTestDir/feature/sdk/java
cd $WD

echo "======== Build Java SDK wrapper ======"
mvn package
cp target/peer-javasdk-test-jar-with-dependencies-exclude-resources.jar peer-javasdk.jar
echo "jar file located in $WD ======"
