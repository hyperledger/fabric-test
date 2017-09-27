#!/bin/bash

if [ $# -ne 1 ]; then
    echo "[$0] invalid number of arguments: $#"
    ./test_help.sh test_pte.sh
    exit
fi

FabricTestDir=$GOPATH/src/github.com/hyperledger/fabric-test
PTEDir=$FabricTestDir/fabric-sdk-node/test/PTE
CIDir=$FabricTestDir/fabric-sdk-node/test/PTE/CITest
ScriptsDir=$CIDir/scripts

TCase=$1
echo "[$0] test case: $TCase"

cd $PTEDir

# sanity check if the test case directory exists
if [[ ! -e CITest/$TCase ]]; then
    echo "The test case [CITest/$TCase] does not exist"
    cd $ScriptsDir
    ./test_help.sh test_driver.sh
    exit
fi


# execute test cases
if [ $TCase == "robust-i-TLS" ]; then
    # robustness test
    echo "*************** [$0] executing: ***************"
    echo "    ./pte_mgr.sh CITest/$TCase/samplecc/PTEMgr-$TCase.txt >& CITest/$TCase/samplecc/$TCase.log"
    sleep 20s
    ./pte_mgr.sh CITest/$TCase/samplecc/PTEMgr-$TCase.txt >& $CIDir/$TCase/samplecc/$TCase.log &
    cd $ScriptsDir
    ./test_robust.sh
    echo "[$0] kill node processes"
    kill -9 $(ps -a | grep node | awk '{print $1}')
else
    # others
    cd CITest
    ccDir=`ls $TCase`
    echo "[$0] ccDir $ccDir"
    for cc in $ccDir; do
        echo "[$0] cc: $cc"
        cd $CIDir/$TCase/$cc
        ptemgr=`ls PTEMgr*txt`
        cd $PTEDir
        for pte in $ptemgr; do
            echo "*************** [$0] executing: ***************"
            echo "    ./pte_mgr.sh CITest/$TCase/$cc/$pte > CITest/$TCase/$cc/$pte.log"
            sleep 20s
            ./pte_mgr.sh CITest/$TCase/$cc/$pte > CITest/$TCase/$cc/$pte.log
        done
    done
    cd $PTEDir
fi


cd $ScriptsDir
echo "current dir: $PWD"
exit
