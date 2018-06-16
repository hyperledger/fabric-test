#!/bin/bash

#defaults
CWD=$PWD
OTE_DIR=$CWD/../../../fabric/OTE
TESTCASE="FAB-6996_1ch_solo"
CLEANUP=true
OLOGLVL="INFO"
ORDS=1
KBS=0
ZKS=0

function printHelp {

   echo "Usage: "
   echo " ./runote.sh [opt] [value] "
   echo "    -t <testcase (default=${TESTCASE})>"
   echo "    -d                                          # debugging option: leave network running"
   echo "    -q <loglevel>                               # orderer log level <CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG>"
   echo " "
   echo "Examples: "
   echo "  ./runote.sh                                   # run the default testcase FAB-6996_1ch_solo"
   echo "  ./runote.sh -t FAB-6996_1ch_solo              # basic test with 1 channel, 1 solo orderer"
   echo "  ./runote.sh -t FAB-7936_100tx_3ch_3ord_3kb    # short test covering OTE functionalities"
   echo " "
   echo "The supported testcases are:"
   grep "^FAB" ${0} | cut -f1 -d' '
   echo " "
   exit
}

while getopts "t:dq:h" opt;
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

FAB-6996_1ch_solo () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 0 -r 1 -p 1 -n 1 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB6996_1ch_1ord_solo docker-compose -f ote-compose.yml up -d
}

FAB-7070 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7070_1ch_1ord_solo_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7024 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7024_1ch_1ord_solo_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7071 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7071_1ch_1ord_solo_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7026 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7026_3ch_1ord_solo docker-compose -f ote-compose.yml up -d
}

FAB-7072 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7072_3ch_1ord_solo_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7027 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7027_3ch_1ord_solo_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7073 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7073_3ch_1ord_solo_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7036 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
      # KBS=3 we could make do with just 3 for this and other tests that use just 1 channel, or even all the other tests if necessary
      # ZKS=1 we could make do with just 1 for all tests
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7036_1ch_3ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7074 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7074_1ch_3ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7037 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7037_1ch_3ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7075 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7075_1ch_3ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7038 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7038_3ch_3ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7936_100tx_3ch_3ord_3kb () {
        # this is a short test for OTE functionality, with no CA, and with no extra KBs or ZKs
        cd $CWD/../NL
        ORDS=3
        KBS=3
        ZKS=1
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 0 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7936_100tx_3ch_3ord_3kb docker-compose -f ote-compose.yml up -d
}

FAB-7076 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7076_3ch_3ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7039 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7039_3ch_3ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7077 () {
        cd $CWD/../NL
        ORDS=3
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7077_3ch_3ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7058 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7058_1ch_6ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7078 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 0 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7078_1ch_6ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7059 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7059_1ch_6ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7079 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 1 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7079_1ch_6ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7060 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7060_3ch_6ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7080 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7080_3ch_6ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7061 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7061_3ch_6ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7081 () {
        cd $CWD/../NL
        ORDS=6
        KBS=5
        ZKS=3
        ./networkLauncher.sh -o $ORDS -q $OLOGLVL -x 1 -r 1 -p 1 -n 3 -k $KBS -z $ZKS -e 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7081_3ch_6ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
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





echo "====================Starting $TESTCASE test with OTE===================="
cp -R $CWD/../OTE $CWD/../../../fabric/
$TESTCASE

docker logs -f OTE
echo "====== OTE test execution finished. Save OTE test logs."
if [ ! -d logs ];then
       mkdir logs
fi
docker cp -a OTE:/opt/gopath/src/github.com/hyperledger/fabric/OTE/ote.log ./logs/${TESTCASE}.log

# Collect data ################################################################
echo "====== Collect data on host machine:"
echo "====== $ df"
df
echo "====== $ free"
free
echo "====== $ top"
top -b -n 1 | head -n 20

# Check the output OTE test logs for the string "RESULT=PASSED' which ote.go prints for each
# successfully passed testcase. If an error occurred, collect container logs and host data.
if [ `grep -c RESULT=PASSED ./logs/${TESTCASE}.log` -eq 0 ]
then
    echo "====== Saving all docker container logs in logs/ for the ${TESTCASE} test failure."
    saveOrdLogs
    saveLogs "kafka" $KBS
    saveLogs "zookeeper" $ZKS
fi

# Clean up ####################################################################
if ( $CLEANUP )
then
  numChannels="" testcase="" docker-compose -f ote-compose.yml down
  cd ../../fabric-test/tools/NL
  ./networkLauncher.sh -a down
else
  echo "====== Test network remains running, as requested, for debugging. $ docker ps"
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

sleep 10
echo "====================Completed $TESTCASE test===================="
