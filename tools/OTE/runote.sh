#!/bin/bash

#defaults
# tool sourcecode location
CWD=$PWD
# location in fabric where to copy and then run the tool
OTE_DIR="$CWD/../../../fabric/OTE"
TESTCASE="FAB-6996_3000tx_1ch_solo"
CLEANUP=true
OLOGLVL="INFO"
PLOGLVL="INFO"
ORDS=1
KBS=0
ZKS=0

function printHelp {

   echo "[fabric-test/tools/OTE/runote.sh] Usage: "
   echo " ./runote.sh [opt] [value] "
   echo "    -t <testcase (default=${TESTCASE})>"
   echo "    -d                                          # debugging option: leave network running"
   echo "    -q <orderer logspec (default $OLOGLVL)>     # orderers logging spec <CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG>"
   echo "    -l <core peer logspec (default $PLOGLVL)>   # peer logging spec <CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG>"
   echo " "
   echo "Examples: "
   echo "  ./runote.sh                                   # run the default basic testcase FAB-6996_3000tx_1ch_solo"
   echo "  ./runote.sh -l peer,endorser=DEBUG:ERROR -t FAB-6996_3000tx_1ch_solo    # basic test with selected peer debug specs"
   echo "  ./runote.sh -q DEBUG -t FAB-7936_100tx_3ch_3ord_3kb    # short test of OTE functionalities, using orderer debug level"
   echo " "
   echo "The supported testcases are:"
   grep "^FAB" ${0} | cut -f1 -d' '
   echo " "
   exit
}

while getopts "t:dq:l:h" opt;
do
        case $opt in
                t)
                  TESTCASE=$OPTARG
                ;;
                d)
                  CLEANUP=false
                ;;
                q)
                  OLOGLVL="$OPTARG"
                ;;
                l)
                  PLOGLVL="$OPTARG"
                ;;
                h)
                  printHelp
                ;;
                \?)
                  echo "Invalid option: -$OPTARG" 2>&1
                  printHelp
                ;;
                :)
                  echo "Option -$OPTARG requires an argument." 2>&1
                  printHelp
                ;;
        esac
done

FAB-6996_3000tx_1ch_solo () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 0 -r 1 -p 1 -n 1 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB6996_3000tx_1ch_solo docker-compose -f ote-compose.yml up -d
}

FAB-7070_30ktx_1ch_solo_10kpayload () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7070_30ktx_1ch_solo_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7024_30ktx_1ch_solo_500batchsize () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7024_30ktx_1ch_solo_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7071_30ktx_1ch_solo_500batchsize_10kpayload () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7071_30ktx_1ch_solo_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7026_30ktx_3ch_solo () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7026_30ktx_3ch_solo docker-compose -f ote-compose.yml up -d
}

FAB-7072_30ktx_3ch_solo_10kpayload () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7072_30ktx_3ch_solo_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7027_30ktx_3ch_solo_500batchsize () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7027_30ktx_3ch_solo_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7073_30ktx_3ch_solo_500batchsize_10kpayload () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7073_30ktx_3ch_solo_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7036_30ktx_1ch_3ord_5kb () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
      # KBS=3 we could make do with just 3 for this and other tests that use just 1 channel, or even all the other tests if necessary
      # ZKS=1 we could make do with just 1 for all tests
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7036_30ktx_1ch_3ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7074_15ktx_1ch_3ord_5kb_10kpayload () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7074_15ktx_1ch_3ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7037_30ktx_1ch_3ord_5kb_500batchsize () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7037_30ktx_1ch_3ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7075_15ktx_1ch_3ord_5kb_500batchsize_10kpayload () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7075_15ktx_1ch_3ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7038_30ktx_3ch_3ord_5kb () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7038_30ktx_3ch_3ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7936_100tx_3ch_3ord_3kb () {
        # this is a short test for OTE functionality, with no CA, and with no extra KBs or ZKs
        cd $CWD/../NL
        ORDS=3
        KBS=3
        ZKS=1
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 0 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7936_100tx_3ch_3ord_3kb docker-compose -f ote-compose.yml up -d
}

FAB-7076_15ktx_3ch_3ord_5kb_10kpayload () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7076_15ktx_3ch_3ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7039_30ktx_3ch_3ord_5kb_500batchsize () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7039_30ktx_3ch_3ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7077_15ktx_3ch_3ord_5kb_500batchsize_10kpayload () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7077_15ktx_3ch_3ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7058_30ktx_1ch_6ord_5kb () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7058_30ktx_1ch_6ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7078_15ktx_1ch_6ord_5kb_10kpayload () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7078_15ktx_1ch_6ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7059_30ktx_1ch_6ord_5kb_500batchsize () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7059_30ktx_1ch_6ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7079_15ktx_1ch_6ord_5kb_500batchsize_10kpayload () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7079_15ktx_1ch_6ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7060_30ktx_3ch_6ord_5kb () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7060_30ktx_3ch_6ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7080_15ktx_3ch_6ord_5kb_10kpayload () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7080_15ktx_3ch_6ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7061_30ktx_3ch_6ord_5kb_500batchsize () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7061_30ktx_3ch_6ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7081_15ktx_3ch_6ord_5kb_500batchsize_10kpayload () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -l $PLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7081_15ktx_3ch_6ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

saveOrdLogs () {
  for (( i=0; i<${ORDS}; i++ ))
  do
    docker logs "orderer${i}.example.com" >& logs/${TESTCASE}-orderer${i}.log
  done
}

saveLogs () {
  # retrieve container logs for kafkaN, zookeeperN, etc, for whatever target name string is passed in $1
  name=${1}
  numContainers=${2}
  for (( i=0; i<${numContainers}; i++ ))
  do
    docker logs "${name}${i}" >& logs/${TESTCASE}-${name}${i}.log
  done
}

collectHostData () {
  # Collect host data : useful when debugging CI host problems
  echo "====== Collect data on host machine:"
  echo "====== $ df"
  df -h
  echo "====== $ top"
  myOS=`uname -s`
  if [ "$myOS" == 'Darwin' ]; then
    # Mac, OSX
    top -l 1 -u -n 10
  else
    top -b -n 1 | head -n 10
    echo "====== $ free"
    free
  fi
}



echo "==================== [fabric-test/tools/OTE/runote.sh] Starting OTE testcase $TESTCASE ===================="

# remove log data from any prior execution of this test
echo PWD=$PWD, removing prior test log files
rm -f ${OTE_DIR}/ote.log
if [ ! -d "${OTE_DIR}/logs" ] ; then
    mkdir -p "${OTE_DIR}/logs"
else
    rm -f ${OTE_DIR}/logs/${TESTCASE}*.log
fi

cp -R $CWD/../OTE $CWD/../../../fabric/
$TESTCASE
docker logs -f OTE
echo "====== OTE test execution finished. Save OTE container logs and test output logs."
docker logs OTE >& logs/${TESTCASE}-ote-container.log
docker cp -a OTE:/opt/gopath/src/github.com/hyperledger/fabric/OTE/ote.log ./logs/${TESTCASE}-ote.log
  # Note: there might not be any test logs if the failure occurred while creating network or channels,
  # so in that situation then you could ignore this stderr message from the previous statement:
  #   Error: No such container:path: OTE:/opt/gopath/src/github.com/hyperledger/fabric/OTE/ote.log

# Check ote test log file for the string "RESULT=PASSED' which ote.go prints for each successful testcase.
PASSED_count=0
if [ -f "./logs/${TESTCASE}-ote.log" ] ; then
    PASSED_count=`grep RESULT=PASSED ./logs/${TESTCASE}-ote.log | wc -l | tr -d '[:space:]'`
fi
# echo "PASSED_count=$PASSED_count"
if [ "$PASSED_count" -ne 0 ]
then
    echo "====== ${TESTCASE} PASSED."
else
    echo "====== ${TESTCASE} FAILED."
    echo "====== Saving all docker container logs in ${PWD}/logs/."
    saveOrdLogs
    saveLogs "kafka" $KBS
    saveLogs "zookeeper" $ZKS
    ### Can uncomment this to help debug problems with CI hosts such as cpu or memory usage:
    ### collectHostData()
fi

# Clean up ####################################################################
if [ "$CLEANUP" == "true" ]
then
  echo CLEANUP
  numChannels="" testcase="" docker-compose -f ote-compose.yml down
  cd ../../fabric-test/tools/NL
  ./networkLauncher.sh -a down
  cd -
else
  echo "====== Test network remains running, as requested, for debugging."
  echo "=== $ docker ps"
  docker ps
  echo "=== PWD:  ${PWD}"
  echo "=== Read OTE output log artifacts:"
  echo "    ...gopath/src/github.com/hyperledger/fabric/OTE/logs/${TESTCASE}.log"
  echo "=== When a test fails, the container logs are stored in:  ./logs/"
  echo "=== Look at container logs, for example:  docker logs orderer0.example.com"
  echo "=== Tip: rerun testcase using option '-q DEBUG' to get orderer debug logs"
  echo "=== Look into containers:  docker exec -it orderer0.example.com /bin/bash"
  echo "=== After finished debugging, then execute the following commands to clean up:"
  echo "    cd ${PWD}"
  echo "    docker-compose -f ote-compose.yml down"
  echo "    cd ../../fabric-test/tools/NL"
  echo "    ./networkLauncher.sh -a down"
fi

#sleep 10
echo "==================== Completed OTE testcase $TESTCASE ===================="
