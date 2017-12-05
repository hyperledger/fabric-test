#!/bin/bash

CWD=$PWD
OTE_DIR=$CWD/../../../fabric/OTE

function printHelp {

   echo "Usage: "
   echo " ./runote.sh [opt] [value] "
   echo "    -t: testcase number, default=FAB-6996"
   echo " "
   echo " example: "
   echo " ./runote.sh -t FAB-6996"
   exit
}

#defaults
TESTCASE="FAB-6996"

while getopts "t:" opt;
do
        case $opt in
                t)
                  TESTCASE=$OPTARG
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


FAB-6996 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB6996_1ch_1ord_solo docker-compose -f ote-compose.yml up -d
}

FAB-7070 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7070_1ch_1ord_solo_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7024 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7024_1ch_1ord_solo_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7071 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 1 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7071_1ch_1ord_solo_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7026 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 3 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7026_3ch_1ord_solo docker-compose -f ote-compose.yml up -d
}

FAB-7072 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 3 -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7072_3ch_1ord_solo_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7027 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 3 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7027_3ch_1ord_solo_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7073 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 1 -x 1 -r 1 -p 1 -n 3 -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7073_3ch_1ord_solo_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7036 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 0 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7036_1ch_3ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7074 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 0 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7074_1ch_3ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7037 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 1 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7037_1ch_3ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7075 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 1 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7075_1ch_3ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7038 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7038_3ch_3ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7076 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7076_3ch_3ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7039 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7039_3ch_3ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7077 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 3 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7077_3ch_3ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7058 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 0 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7058_1ch_6ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7078 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 0 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7078_1ch_6ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7059 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 1 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7059_1ch_6ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7079 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 1 -r 1 -p 1 -n 1 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=1 testcase=Test_FAB7079_1ch_6ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7060 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7060_3ch_6ord_5kb docker-compose -f ote-compose.yml up -d
}

FAB-7080 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7080_3ch_6ord_5kb_10kpayload docker-compose -f ote-compose.yml up -d
}

FAB-7061 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7061_3ch_6ord_5kb_500batchsize docker-compose -f ote-compose.yml up -d
}

FAB-7081 () {
        cd $CWD/../NL
        ./networkLauncher.sh -o 6 -x 1 -r 1 -p 1 -n 3 -k 5 -z 3 -t kafka -f test -w localhost -B 500 -S enabled
        cd $OTE_DIR
        # run testcase
        numChannels=3 testcase=Test_FAB7081_3ch_6ord_5kb_500batchsize_10kpayload docker-compose -f ote-compose.yml up -d
}

echo "====================Starting $TESTCASE test with OTE===================="
cp -R $CWD/../OTE $CWD/../../../fabric/
$TESTCASE
docker logs -f OTE
# Now look for test results logs in ./logs/${testcase}.log
docker-compose -f ote-compose.yml down
cd ../../fabric-test/tools/NL
./networkLauncher.sh -a down
sleep 10
echo "====================Completed $TESTCASE test===================="
