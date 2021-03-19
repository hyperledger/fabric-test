#!/bin/bash

Tag14=1.4-stable
Tag20=2.0-stable
Tag21=2.1-stable
Tag22=2.2-stable

CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
OperatorDir="$FabricTestDir"/tools/operator
testdataDir="$FabricTestDir"/regression/testdata

fabrictestCheckout(){
    echo "Checking out to $1 branch"
    git checkout -- .
    git checkout $1
    if [ $? != 0 ]; then
        exit 1
    fi
}

pullFabricBinaries(){
    VERSION=$1
    echo "Downloading fabric binaries for $VERSION"
    cd scripts
    ./pullBinaries.sh $VERSION fabric
    if [ $? != 0 ]; then
        exit 1
    fi
    cd -
}

executeAction (){
    go run main.go -i $1 -a $2
    if [ $? != 0 ]; then
        executeAction $testdataDir/smoke-network-spec.yml down
        exit 1
    fi

}
cd $FabricTestDir
echo "Executing the upgrade scenario"
fabrictestCheckout release-1.4

echo "Installing node modules"
make npm-init

echo "Fabric Binaries"
pullFabricBinaries $Tag14

cd $OperatorDir
echo "Setting up fabric network using operator"
executeAction $testdataDir/smoke-network-spec.yml up

echo "Running fabric operations using $testdataDir/smoke-test-input.yml"
executeAction $testdataDir/smoke-test-input.yml create
executeAction $testdataDir/smoke-test-input.yml join
executeAction $testdataDir/smoke-test-input.yml install
executeAction $testdataDir/smoke-test-input.yml instantiate

echo "Invoking transactions"
executeAction $testdataDir/smoke-test-input.yml invoke

cd $FabricTestDir
echo "Checking out to release-2.0 branch"
fabrictestCheckout release-2.0

echo "Installing node modules"
make npm-init

echo "Fabric Binaries"
pullFabricBinaries $Tag20

cd $OperatorDir
echo "Upgrading fabric network using operator"
executeAction $testdataDir/basic-network-spec.yml upgradeNetwork

echo "Invoking transactions"
executeAction $testdataDir/smoke-test-input.yml invoke

echo "Upgrading fabric network using operator"
executeAction $testdataDir/basic-network-spec.yml updateCapability

echo "Upgrading fabric network using operator"
executeAction $testdataDir/basic-network-spec.yml updatePolicy

echo "Upgrading fabric network using operator"
executeAction $testdataDir/smoke-network-spec.yml upgradeNetwork

echo "Installing chaincode using lifecycle"
executeAction $testdataDir/basic-test-input.yml install

echo "Committing chaincode using lifecycle"
executeAction $testdataDir/basic-test-input.yml instantiate

echo "Invoking transactions"
executeAction $testdataDir/basic-test-input.yml invoke

cd $FabricTestDir
echo "Checking out to release-2.1 branch"
fabrictestCheckout release-2.1

echo "Installing node modules"
make npm-init

echo "Fabric Binaries"
pullFabricBinaries $Tag21

cd $OperatorDir
echo "Upgrading fabric network using operator"
executeAction $testdataDir/basic-network-spec.yml upgradeNetwork

echo "Invoking transactions"
executeAction $testdataDir/smoke-test-input.yml invoke

cd $FabricTestDir
echo "Checking out to main branch"
fabrictestCheckout main

echo "Installing node modules"
make npm-init

cd $OperatorDir
echo "Upgrading fabric network using operator"
executeAction $testdataDir/smoke-network-spec.yml upgradeNetwork

echo "Invoking transactions"
executeAction $testdataDir/smoke-test-input.yml invoke

echo "Bringing down the fabric network using operator"
executeAction $testdataDir/smoke-network-spec.yml down