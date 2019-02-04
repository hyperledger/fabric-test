#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# printSummary
printSummary() {

    echo "Purpose:"
    echo "This script executes transactions using PTE based on the specified testcase scenarios."
    echo "The testcase scenarios contains the number of channels, numbers of org, chaincode,"
    echo "number of thread, number of transactions, target peers, and target orderer etc."

    echo "Pre-requisite:"
    echo "The test requires a PTE service credential json file which contains the information of"
    echo "the network, such as certificates and endpoints of orderers, peers etc."
    echo "This PTE service credential json file must be placed in a subdirectory under PTE."
    echo "The default directory of this service credential json file is PTE/PTEScaleTest-SC."

}

# usage
usage () {
    printSummary
    echo -e "\nUsage:\t./runScaleTraffic.sh [options] -h | -i | -q | --preconfig"
    echo
    echo -e "\t-h, --help\tView this help message"
    echo
    echo -e "\t--scdir\tservica credential directory, relative path to PTE dir"
    echo -e "\t\tDefault: PTEScaleTest-SC"
    echo
    echo -e "\t--chaincode\tchaincode [samplecc|samplejs|marblecc]"
    echo -e "\t\tDefault: samplecc"
    echo
    echo -e "\t--testcase\ttestcase [FAB-xxxxx]"
    echo -e "\t\tDefault: PTEScaleTest."
    echo
    echo -e "\t-n, --network\tlaunch network"
    echo -e "\t\tDefault: none."
    echo
    echo -e "\t--nchan\tnumber of channels [integer]"
    echo -e "\t\tDefault: 1."
    echo
    echo -e "\t--norg\tnumber of org [integer]"
    echo -e "\t\tDefault: 1."
    echo
    echo -e "\t--preconfig\tpreconfiguration includes create/join channels and install/instantiate chaincode"
    echo -e "\t\tDefault: none."
    echo
    echo -e "\t--txmode\ttransaction mode [Constant|Latency]"
    echo -e "\t\tDefault: Constant"
    echo
    echo -e "\t--nproc\tnumber of processes per org [integer]"
    echo -e "\t\tDefault: 1."
    echo
    echo -e "\t--nreq\tnumber of transactions per process [integer]"
    echo -e "\t\tDefault: 10000."
    echo
    echo -e "\t--rundur\tduration of execution in sec [integer]"
    echo -e "\t\tDefault: 0."
    echo
    echo -e "\t--freq\ttransaction sending frequency in ms [integer]"
    echo -e "\t\tDefault: 0."
    echo
    echo -e "\t--keystart\tstarting key of transactions [integer]"
    echo -e "\t\tDefault: 0."
    echo
    echo -e "\t--targetpeers\ttarget peers [ROUNDROBIN|ORGANCHOR|ALLANCHORS|ORGPEERS|ALLPEERS|DISCOVERY]"
    echo -e "\t\tDefault: ROUNDROBIN."
    echo
    echo -e "\t--targetorderers\ttarget orderers [ROUNDROBIN|USERDEFINED]"
    echo -e "\t\tDefault: ROUNDROBIN."
    echo
    echo -e "\t-p, --prime\tpriming"
    echo -e "\t\tDefault: none"
    echo
    echo -e "\t-i, --invoke\tinvokes"
    echo -e "\t\tDefault: none"
    echo
    echo -e "\t-q, --query\tqueries"
    echo -e "\t\tDefault: none"
    echo
    echo -e "\tExamples:"
    echo -e "\t    ./runScaleTraffic.sh -a samplecc --preconfig -p -i -q"
    echo -e "\t    ./runScaleTraffic.sh --nchan 100 --norg 3 -a samplecc --preconfig"
    echo -e "\t    ./runScaleTraffic.sh -a samplecc --preconfig --txmode Latency -p -i -q"
    echo -e "\t    ./runScaleTraffic.sh -a samplecc -i -q --txmode Constant"
    echo
}

printVars() {
    echo ""
    echo "input parameters: TESTCASE=$TESTCASE"
    echo "input parameters: NETWORK=$NETWORK, chaincode=$chaincode, PRECONFIG=$PRECONFIG"
    echo "input parameters: NCHAN=$NCHAN, NORG=$NORG, LSCDIR=$LSCDir"
    echo "input parameters: TXMODE=$TXMODE, NPROC=$NPROC"
    echo "input parameters: targetpeers=$targetpeers, targetorderers=$targetorderers"
    echo "input parameters: NREQ=$NREQ, RUNDUR=$RUNDUR, FREQ=$FREQ, key0=$key0"
    echo "input parameters: PRIME=$PRIME, INVOKE=$INVOKE, QUERY=$QUERY"
    echo ""
}

# default testcase
CWD=$PWD
TESTCASE="PTEScaleTest"

# default vars
NETWORK="none"
LSCDir="PTEScaleTest-SC"
chaincode="samplecc"
PRECONFIG="none"
PRIME="none"
INVOKE="none"
QUERY="none"
TXMODE="Constant"

NTHREAD=1
NCHAN=1
CHANPREFIX="testorgschannel"
NREQ=10000
RUNDUR=0
FREQ=0
NORG=1
targetpeers="RoundRobin"
targetorderers="RoundRobin"
key0=0

if [ $# -eq 0 ]; then
    echo "Error: no options found"
    usage
    exit 1
fi

# input parameters
while [[ $# -gt 0 ]]; do
    arg="$1"

    case $arg in

      -h | --help)
          usage                    # displays usage info
          exit 0                   # exit cleanly, since the use just asked for help/usage info
          ;;

      --scdir)
          shift
          LSCDir=$1                # service credential directory
          shift
          ;;

      -a | --chaincode)
          shift
          chaincode=$1             # application chaincode
          shift
          ;;

      --testcase)
          shift
          TESTCASE=$1              # testcase
          shift
          ;;

      -n | --network)
          NETWORK="yes"
          shift
          ;;

      --nchan)
          shift
          NCHAN=$1                 # number of channels
          shift
          ;;

      --norg)
          shift
          NORG=$1                  # number of org
          shift
          ;;

      --preconfig)
          PRECONFIG="yes"
          shift
          ;;

      --txmode)
          shift
          TXMODE=$1                # transaction mode
          shift
          ;;

      --nproc)
          shift
          NPROC=$1                 # number of processes per org
          shift
          ;;

      --nreq)
          shift
          NREQ=$1                  # number of transactions per process
          shift
          ;;

      --rundur)
          shift
          RUNDUR=$1                # execution duration
          shift
          ;;

      --freq)
          shift
          FREQ=$1                  # transaction sending freq
          shift
          ;;

      --keystart)
          shift
          key0=$1                  # starting key of transactions
          shift
          ;;

      --targetpeers)
          shift
          targetpeers=$1           # target peers
          shift
          ;;

      --targetorderers)
          shift
          targetorderers=$1         # target orderer
          shift
          ;;

      -p | --prime)
          PRIME="yes"
          shift
          ;;

      -i | --invoke)
          INVOKE="yes"
          shift
          ;;

      -q | --query)
          QUERY="yes"
          shift
          ;;

      *)
          echo "Error: Unrecognized command line argument: $1"
          usage
          exit 1
          ;;

    esac
done

#print vars
printVars

# source PTE CI utils
source PTECIutils.sh

CIpteReport=$LOGDir"/"$TESTCASE"-pteReport.log"
pteReport=$PTEDir"/pteReport.txt"

# PTE execution
function PTEexec() {
    invoke=$1
    report="yes"

    # prime
    if [ $invoke == "prime" ]; then
        targetpeers="ALLPEERS"
        invoke="query"
        report="no"
    fi

    echo "[$0] PTE invoke: $invoke"
    tCurr=`date +%m%d%H%M%S`
    if [ ! -e $LOGDir ]; then
        mkdir -p $LOGDir
    fi
    PTELOG=$LOGDir/$TESTCASE"-ch"$NCHAN"-th"$NTHREAD"-"$invoke"-"$tCurr".log"
    if [ -e $pteReport ]; then
       rm -f $pteReport
    fi

    set -x
    ./gen_cfgInputs.sh -d $LSCDir --nchan $NCHAN --chanprefix $CHANPREFIX --norg $NORG -a $chaincode --nreq $NREQ --rundur $RUNDUR --freq $FREQ --keystart $key0 --targetpeers $targetpeers --targetorderers $targetorderers --nproc $NTHREAD --txmode $TXMODE -t $invoke >& $PTELOG
    CMDResult="$?"
    set +x
    if [ $CMDResult -ne "0" ]; then
        echo "Error: Failed to execute gen_cfgInputs.sh"
        exit 1
    fi
    sleep 30

    # PTE report
    if [ $report == "yes" ]; then
        echo "$TESTCASE Channels=$NCHAN Threads=$NTHREAD $invoke" >> $CIpteReport
        set -x
        PTEReport $pteReport $CIpteReport
        CMDResult="$?"
        set +x
        if [ $CMDResult -ne "0" ]; then
            echo "Error: Failed to execute PTEReport"
            exit 1
        fi
    fi
}


### bring up network
if [ $NETWORK != "none" ]; then
    SCDir=$PTEDir/$LSCDir

    if [ -e $SCDir ]; then
        echo "[$0] clean up $SCDir"
        rm -rf $SCDir
    fi
    echo "[$0] mkdir $SCDir"
    mkdir -p $SCDir

    cd $NLDir
    rm -f config-chan*

    #### bring down network
    echo "[$0] bring down network"
    ./networkLauncher.sh -a down

    #### bring up network
    echo "[$0] bring up network"
    set -x
    ./networkLauncher.sh -o 3 -x 3 -r $NORG -p 2 -n 1 -k 3 -z 3 -t kafka -f test -w localhost -S enabled -c 2s -l INFO -B 500
    CMDResult="$?"
    set +x

    if [ $CMDResult -ne "0" ]; then
        echo "Error: Failed to bringup network"
        exit 1
    fi

    echo "[$0] cp config-chan*-TLS.json $SCDir"
    cp config-chan*-TLS.json $SCDir
    sleep 60
fi

cd $CMDDir

### preconfiguration
# PTE: create/join channel, install/instantiate chaincode
if [ $PRECONFIG != "none" ]; then
    timestamp=`date`
    echo "[$0 $timestamp] create/join channel, install/instantiate chaincode started"
    set -x
    ./gen_cfgInputs.sh -d $LSCDir -c -i --nchan $NCHAN --chanprefix $CHANPREFIX --norg $NORG -a $chaincode
    set +x
    timestamp=`date`
    echo "[$0 $timestamp] create/join channel, install/instantiate chaincode completed"
    sleep 30
fi

# PTE: prime to synch-up peer ledgers
if [ $PRIME != "none" ]; then
    PTEexec "prime"
fi


if [ $INVOKE == "none" ] && [ $QUERY == "none" ]; then
    exit 0
fi


NTHREAD=$NPROC
echo ""
echo "          *****************************************************************************"
echo "                                      PTE: CHANNELS=$NCHAN THREADS=$NTHREAD"
echo "          *****************************************************************************"
echo ""
timestamp=`date`
if [ $NREQ > 0 ]; then
    echo "[$0] $TESTCASE with $NCHAN channels, each channel has $NTHREAD threads x $NREQ transactions start at $timestamp"
else
    echo "[$0] $TESTCASE with $NCHAN channels, each channel has $NTHREAD threads x $RUNDUR seconds start at $timestamp"
fi

cd $CMDDir

# PTE: invokes
if [ $INVOKE != "none" ]; then
    PTEexec "move"
fi

# PTE: queries
if [ $QUERY != "none" ]; then
    PTEexec "query"
fi

cd $CWD

timestamp=`date`
echo "[$0] $TESTCASE completes at $timestamp"
