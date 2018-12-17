#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# runPTE.sh
# purpose:
#   1. npm install
#   2. convert the connection profile to PTE service credential json
#   3. install and instantiate chaincode
#   4. execute testcases using PTE

# FUNCTION: usage
#           Displays usage command line options; examples; exits.
usage () {
    echo -e "\nUSAGE:\t./runPTE.sh [options] [values]"
    echo
    echo -e "-h, --help\tView this help message"
    echo

    echo -e "--no-npm \tskip npm re-install fabric-client packages"
    echo

    echo -e "--dir\t\tabsolute path or relative path from .../fabric-test/tools/networktest/ to the directory that contains the network connection profiles to be converted"
    echo -e "\t\t(Default: ./connectionprofile/)"
    echo

    echo -e "--channel <channel name>"
    echo -e "\t\t(Must match channel name in connection profile. Default: defaultchannel)"
    echo

    echo -e "--org <list of org names>"
    echo -e "\t\t(Must match org names in connection profile. Default: org1 org2)"
    echo

    echo -e "--ccver <chaincode version to instantiate>"
    echo -e "\t\t(Default: v0. Note: cannot be used with --ccupgrade)"
    echo

    echo -e "--ccname <chaincode name>"
    echo -e "\t\t(Default: the name defined in each testcase.)"
    echo

    echo -e "--ccupgrade <chaincode version to upgrade>"
    echo -e "\t\t(Note: cannot be used with --ccver)"
    echo

    echo -e "--txtarget <OrgAnchor|AllAnchors|OrgPeers|AllPeers>"
    echo -e "\t\t(Default: OrgAnchor)"
    echo

    echo -e "-t, --testcase <list of testcases>"
    echo

    echo -e "-s, --sanity\texecute a sanity test of 2 predefined testcases: FAB-3808-2i FAB-3811-2q (~30 min)"
    echo

    echo -e "-a, --all\texecute all predefined testcases (~3.5 hrs)"
    echo

    echo -e "Examples:"
    echo -e "./runPTE.sh --dir connectionprofile -t FAB-3808-2i FAB-3811-2q"
    echo -e "./runPTE.sh -s"
    echo -e "./runPTE.sh -a"
    echo

    echo -e "Available predefined testcases: FAB-3808-2i FAB-3811-2q FAB-3807-4i FAB-3835-4q FAB-4038-2i FAB-4036-2q FAB-7329-4i FAB-7333-4i"
    echo -e "For more details, refer to jira or ../PTE/CITest/."
    echo
    echo -e "Notes:"
    echo -e "All the listed testcases require only one channel and 2 orgs."
    echo -e "Use options --channel and --org only if your connection profile uses something other than defaultchannel and org1 and org2."
    echo -e "To run additional predefined testcases, or custom testcases, that are not listed here, use care to join peers to all the correct channels as used by the testcases."
    echo
    echo -e "The tool installs/instantiates chaincode every time, so you may ignore these errors if the chaincode is already installed/instantiated:"
    echo
    echo -e "    error: [client-utils.js]: sendPeersProposal - Promise is rejected: Error: 2 UNKNOWN: chaincode error (status: 500, message: Error installing chaincode code ... chaincodes/sample_cc_ch1.v0 exists))"
    echo
    echo -e "    error: [client-utils.js]: sendPeersProposal - Promise is rejected: Error: 2 UNKNOWN: chaincode error (status: 500, message: chaincode exists sample_cc_ch1)"
    echo

}


# current working dir
CWD=$PWD
# PTE dir
PTEDir=$CWD/../PTE
# Logs dir
LOGSDir=$CWD/Logs
if [ ! -e $LOGSDir ]; then
    mkdir -p $LOGSDir
fi

tCurr=`date +%Y%m%d%H%M%S`
testPTEReport=$LOGSDir"/pteReport-"$tCurr".log"
if [ -e $testPTEReport ]; then
    rm -rf $testPTEReport
fi

# default
ConnProfDir=$CWD"/connectionprofile"
NPMInstall="yes"
Channel=""
Organization=""
TestCases="FAB-3808-2i"
Chaincodes=""
CProfConv="yes"
CCProc="yes"
CHANNEL="defaultchannel"
CCVER="v0"
CCVERUPD="no"
CCNAME=""
CCNAMEUPD="no"
CCUPGRADE="no"
TXTARGET=""


### error message handler
# #1=caller
# #2=command
errMsg() {

    echo "[$1] Error: failed to execute: $2"
    usage
    exit 1
}

### install npm packages: fabric-client and fabric-ca-client
npmProc() {

    echo
    echo -e "          *****************************************************************************"
    echo -e "          *                              NPM installation                             *"
    echo -e "          *****************************************************************************"
    echo

    cd $PTEDir
    rm -rf node_modules
    npm install
    if [ "$?" -ne "0" ]; then
        errMsg "npmProc" "npm install"
    fi

    npm list | grep fabric
}



### generate connection profile and convert to PTE SC file
cProfConversion() {

    echo
    echo -e "          *****************************************************************************"
    echo -e "          *                       connection profile conversion                       *"
    echo -e "          *****************************************************************************"
    echo

    # convert to PTE service credential json
    cd $CWD
    node $PTEDir/cprof-convert/convert.js $ConnProfDir
    if [ "$?" -ne "0" ]; then
        errMsg "cProfConversion" "node convert.js"
    fi

    cd $PTEDir
    rm -rf CITest/CISCFiles/*.json
    cp cprof-convert/pte-config.json CITest/CISCFiles/config-chan1-TLS.json
    if [ "$?" -ne "0" ]; then
        errMsg "cProfConversion" "cp"
    fi
}


# set PTE transaction configuration key with new value in testcase
# $1: key
# $2: new key val
# $3: testcase
# $4: chaincode
setCfgKeyVal() {
    key=$1
    keyValNew=$2
    tc=$3
    cc=$4
    echo "[setCfgKeyVal] key: $key, tc: $tc, cc: $cc"

    cd $PTEDir/CITest

    # search for key val in the testcase
    tmpFile="/tmp/runPTEtmp.txt"
    keyValCurr="none"
    if [ -e $tmpFile ]; then
        echo "rm -f $tmpFile"
        rm -f $tmpFile
    fi
    grep $key $tc/$cc/* >& $tmpFile
    keyValCurr=`tail -1 $tmpFile | cut -f 4 -d '"'`
    echo "[setCfgKeyVal] key: $key, val: $keyValCurr"
    rm -f $tmpFile

    if [ "$keyValCurr" == "none" ]; then
        echo "Error: [setCfgKeyVal] $key not found"
        exit 1
    fi

    # set key val
    echo -e "[setCfgKeyVal] replace $keyValCurr with $keyValNew"
    ### Note: "sed -i pattern filename" works fine on linux (gnu) - but not on
    ### mac (OSX, freebsd) which requires a string parameter for the -i option.
    ### Without going into details, we need to make this work on both platforms.
    ### Refer to the jira FAB-12629 comments for explanation of why we are using
    ### the -e option and then removing backup files (named with -e extension).
    sed -i -e "s/$keyValCurr/$keyValNew/g" $tc/$cc/*
    sed -i -e "s/$keyValCurr/$keyValNew/g" $tc/preconfig/channels/*
    sed -i -e "s/$keyValCurr/$keyValNew/g" $tc/preconfig/$cc/*
    rm -f $tc/$cc/*-e
}

# pre-process
# $1: test case, e.g., FAB-3807-4i
# $2: chaincode, e.g., samplecc
testPreProc() {
    tcase=$1
    tcc=$2

    # restore testcase first in case the testcase was changed
    # by the way, if advanced users want to run a modified testcase, comment out this line
    restoreCITestcase $tcase

    cd $PTEDir

    # channel
    for (( idx=0; idx<${#Channel[@]}; idx++ ))
    do
        idx1=$[ idx + 1 ]
        echo -e "[testPreProc] replace testorgschannel$idx1 with ${Channel[@]}"
        if [ -e CITest/$tcase/preconfig ]; then
            sed -i -e "s/testorgschannel$idx1/${Channel[$idx]}/g" CITest/$tcase/preconfig/channels/*
            sed -i -e "s/testorgschannel$idx1/${Channel[$idx]}/g" CITest/$tcase/preconfig/$tcc/*
        fi
        sed -i -e "s/testorgschannel$idx1/${Channel[$idx]}/g" CITest/$tcase/$tcc/*
        rm -f CITest/$tcase/preconfig/channels/*-e CITest/$tcase/preconfig/$tcc/*-e CITest/$tcase/$tcc/*-e
    done

    # chaincode version and prefix
    if [ $CCVERUPD == "yes" ]; then
        echo -e "[testPreProc] replace v0 with $CCVER"
        if [ -e CITest/$tcase/preconfig ]; then
            sed -i -e "s/v0/$CCVER/g" CITest/$tcase/preconfig/$tcc/*
        fi
        sed -i -e "s/v0/$CCVER/g" CITest/$tcase/$tcc/*
        rm -f CITest/$tcase/preconfig/$tcc/*-e CITest/$tcase/$tcc/*-e
    fi

    if [ $CCNAMEUPD == "yes" ]; then
        echo -e "[testPreProc] set chaincodeID with $CCNAME"
        key="chaincodeID"
        setCfgKeyVal $key $CCNAME $tcase $tcc
    fi

    if [ $CCUPGRADE == "yes" ]; then
        echo -e "[testPreProc] chaincode upgrade"
        if [ -e CITest/$tcase/preconfig ]; then
            sed -i -e "s/instantiate/upgrade/g" CITest/$tcase/preconfig/$tcc/sample*
            rm -f CITest/$tcase/preconfig/$tcc/sample*-e
        fi
    fi

    # orgs
    for (( idx=0; idx<${#Organization[@]}; idx++ ))
    do
        idx1=$[ idx + 1 ]
        echo -e "[testPreProc] replace org$idx1 with ${Organization[$idx]}"
        if [ -e CITest/$tcase/preconfig ]; then
            sed -i -e "s/org$idx1/${Organization[$idx]}/g" CITest/$tcase/preconfig/channels/*
            sed -i -e "s/org$idx1/${Organization[$idx]}/g" CITest/$tcase/preconfig/$tcc/*
        fi
        sed -i -e "s/org$idx1/${Organization[$idx]}/g" CITest/$tcase/$tcc/*
        rm -f CITest/$tcase/preconfig/channels/*-e CITest/$tcase/preconfig/$tcc/*-e CITest/$tcase/$tcc/*-e
    done

    # target peer
    if [ "$TXTARGET" != "" ]; then
        key="targetPeers"
        setCfgKeyVal $key $TXTARGET $tcase $tcc
    fi
}

# restore changes
# $1: test case, e.g., FAB-3807-4i
restoreCITestcase() {
    tcase=$1
    echo -e "[restoreCITestcase] restore testcase $tcase"
    cd $PTEDir
    git checkout CITest/$tcase
    if [ "$?" -ne "0" ]; then
        errMsg "restoreCITestcase" "git checkout"
    fi

}

# priming
# $1: chaincode, e.g., samplejs
primeProc() {

    cc=$1
    pcase="FAB-query-TLS"
    echo
    echo -e "          *****************************************************************************"
    echo -e "          *                  executing priming: $pcase/$cc                            *"
    echo -e "          *****************************************************************************"
    echo

    # pre process testcase
    testPreProc $pcase $cc
    cd $PTEDir
    tCurr=`date +%Y%m%d%H%M%S`
    testLogs=$LOGSDir/$pcase"-"$tCurr".log"
    ./pte_driver.sh CITest/$pcase/$cc"/runCases-FAB-query-q1-TLS.txt" >& $testLogs
    if [ "$?" -ne "0" ]; then
        restoreCITestcase $pcase
        return 1
    fi

    # restore changes made by testPreProc()
    restoreCITestcase $pcase
}

# install/instantiate chaincode
# $1: test case, e.g., FAB-3807-4i
# $2: chaincode, e.g., samplecc
ccProc() {
    tcase=$1
    chaincode=$2
    echo -e "[ccProc] executes test chaincode process: $tcase $chaincode"

    if [[ "${Chaincodes[@]}" =~ "$chaincode" ]]; then
       echo -e "[ccProc] $chaincode was installed/instantiated"
       return
    fi

    j=${#Chaincodes[@]}
    j=$[ j + 1 ]
    Chaincodes[$j]=$chaincode

    cd $PTEDir
    # install chaincode
    installTXT=CITest/$tcase/preconfig/$chaincode/runCases-$chaincode"-install-TLS.txt"
    echo -e "[ccProc] ./pte_driver.sh $installTXT"
    ./pte_driver.sh $installTXT
    if [ "$?" -ne "0" ]; then
        echo -e "[ccProc] Warning: installation failed, chaincode: $chaincode (can ignore this warning if done during previous test or prior to running this test)"
    fi

    # instantiate/upgrade chaincode
    ccAction="instantiation"
    if [ $CCUPGRADE == "yes" ]; then
        ccAction="upgrade"
    fi
    echo -e "[ccProc] instantiate/upgrade chaincode: $chaincode"
    instantiateTXT=CITest/$tcase/preconfig/$chaincode/runCases-$chaincode"-instantiate-TLS.txt"
    echo -e "[ccProc] ./pte_driver.sh $instantiateTXT"
    ./pte_driver.sh $instantiateTXT
    if [ "$?" -ne "0" ]; then
        echo -e "[ccProc] Warning: $ccAction failed, chaincode: $chaincode (can ignore this warning if done during previous test or prior to running this test)"
    fi

    # priming ...
    primeProc $chaincode
    if [ "$?" -ne "0" ]; then
        # restore changes made by testPreProc
        restoreCITestcase $tcase
        errMsg "ccProc" "pte_driver.sh"
    fi
}

# get chaincode from the testcase
# $1: test case, e.g., FAB-3807-4i
getCCfromTestcase() {
    tc=$1

    cd $PTEDir/CITest

    # search for chaincode for each testcase
    ccDir=`ls $tc`
    for dd in ${ccDir[@]}; do
        if [ $dd == "samplecc" ] || [ $dd == "samplejs" ] || [ $dd == "marbles02" ]; then
            res=$dd
        fi
    done

}

#execute testcases
testProc(){
    pteReport=$PTEDir/pteReport.txt

    for testcase in "${TestCases[@]}"; do
        local res="none"
        getCCfromTestcase $testcase

        cd $PTEDir

        # pre process testcase
        testPreProc $testcase $res

        # install/instantiate chaincode
        if [ $CCProc != "none" ] && [ $res != "none" ]; then
            ccProc $testcase $res
        fi

        if [ -e $pteReport ]; then
            rm -rf $pteReport
        fi

        echo
        echo -e "          *****************************************************************************"
        echo -e "          *                  executing testcase: $testcase                            *"
        echo -e "          *****************************************************************************"
        echo
        echo -e "testcase: $testcase, chaincode: $res" >> $pteReport
        tCurr=`date +%Y%m%d%H%M%S`
        testLogs=$LOGSDir/$testcase"-"$tCurr".log"
        ###./pte_driver.sh CITest/$testcase/$res/run-$testcase"-TLS.txt"
        ./pte_mgr.sh CITest/$testcase/$res/PTEMgr-$testcase"-TLS.txt" >& $testLogs
        if [ "$?" -ne "0" ]; then
            restoreCITestcase $testcase
            errMsg "testProc" "pte_mgr.sh"
        fi

        # save pteReport
        cat $pteReport >> $testPTEReport

        # restore changes made by testPreProc
        restoreCITestcase $testcase

    done

}


# GET CUSTOM OPTIONS
while [[ $# -gt 0 ]]; do
    arg="$1"

    case $arg in

      -h | --help)
          usage        # displays usage info; exits
          exit 0
          ;;

      --no-npm)
          NPMInstall="none"     # skip npm installation
          shift
          ;;

      --dir)
          shift
          CProfConv="yes"     # connection profile conversion
          ConnProfDir=$1
          echo -e "\t- Specify ConnProfDir: $ConnProfDir\n"
          shift
          ;;

      --channel)
          shift
          i=0
          Channel[$i]=$1  # testcases
          shift
          until [[ $(eval "echo \$1") =~ ^-.* ]] || [ -z $(eval "echo \$1") ]; do
              i=$[ i + 1]
              Channel[$i]=$1
              shift
          done
          echo -e "\t- Specify Channel: ${Channel[@]}"
          ;;

      --org)
          shift
          i=0
          Organization[$i]=$1  # testcases
          shift
          until [[ $(eval "echo \$1") =~ ^-.* ]] || [ -z $(eval "echo \$1") ]; do
              i=$[ i + 1]
              Organization[$i]=$1
              shift
          done
          echo -e "\t- Specify Organization: ${Organization[@]}"
          ;;

      --ccver)
          # sanity check
          if [ $CCUPGRADE == "yes" ]; then
              echo -e "Error: cannot use option --ccupgrade with option --ccver"
              usage
              exit 1
          fi

          shift
          CCVER=$1            # chaincode version
          CCVERUPD="yes"      # cc version updated
          echo -e "\t- Specify CCVER to instantiate: $CCVER\n"
          shift
          ;;

      --ccname)
          shift
          CCNAME=$1         # chaincode name
          CCNAMEUPD="yes"   # chaincode name updated
          echo -e "\t- Specify CCNAME: $CCNAME\n"
          shift
          ;;

      --ccupgrade)
          # sanity check
          if [ $CCVERUPD == "yes" ]; then
              echo -e "Error: cannot use option --ccver with option --ccupgrade"
              usage
              exit 1
          fi

          shift
          CCVER=$1            # chaincode version
          CCVERUPD="yes"      # cc version upgraded
          CCUPGRADE="yes"     # chaincode name prefix
          echo -e "\t- Specify CCVER to upgrade: $CCVER\n"
          shift
          ;;

      --txtarget)
          shift
          TXTARGET=`echo $1 | tr a-z A-Z`         # transaction target peer
          echo -e "\t- Specify TXTARGET: $TXTARGET\n"
          if [ "$TXTARGET" != "ORGANCHOR" ] && [ "$TXTARGET" != "ALLANCHORS" ] && [ "$TXTARGET" != "ORGPEERS" ] && [ "$TXTARGET" != "ALLPEERS" ]; then
              echo -e "Error: txtarget value for target peer is unknown: $1"
              usage
              exit 1
          fi
          shift
          ;;

      -s | --sanity)
          CCProc="yes"         # install/instantiate chaincode
          TestCases=("FAB-3808-2i" "FAB-3811-2q")  # testcases
          echo -e "\t- Specify CProfConv: $CProfConv\n"
          shift
          ;;

      -a | --all)
          CCProc="yes"         # install/instantiate chaincode
          TestCases=("FAB-3808-2i" "FAB-3811-2q" "FAB-3807-4i" "FAB-3835-4q" "FAB-4038-2i" "FAB-4036-2q" "FAB-7329-4i" "FAB-7333-4i")  # testcases
          echo -e "\t- Specify CProfConv: $CProfConv\n"
          shift
          ;;

      -t | --testcase)
          shift
          i=0
          TestCases[$i]=$1  # testcases
          shift
          until [[ $(eval "echo \$1") =~ ^-.* ]] || [ -z $(eval "echo \$1") ]; do
              i=$[ i + 1]
              TestCases[$i]=$1
              shift
          done
          echo -e "\t- Specify TestCases: ${TestCases[@]}"
          ;;

      *)
          echo "Unrecognized command line argument: $1"
          usage
          exit 1
          ;;
    esac
done


tCurr=`date`
echo -e "[$0] starts at $tCurr"
echo
echo -e "test setup"
echo -e "CWD: $CWD"
echo -e "PTEDir: $PTEDir"
echo -e "LOGSDir: $LOGSDir"
echo -e "npm installation: $NPMInstall"
echo -e "TestCases: ${TestCases[@]}"
echo -e "chaincode installation/instantiation: $CCProc"

#sanity check ConnProfDir
if [ ! $ConnProfDir ]; then
    echo "[$0] Error: connection profile is required."
    usage
    exit 1
elif [ ! -e $ConnProfDir ]; then
    echo -e "[$0] Error: $ConnProfDir does not exist"
    usage
    exit 1
else
    jsonCnt=`ls $ConnProfDir/*.json | wc -l`
    if [ $jsonCnt == 0 ]; then
        echo -e "[$0] Error: no connection profile found in $ConnProfDir"
        usage
        exit 1
    fi
fi
echo -e "connection profile dir: $ConnProfDir"

if [ "$Channel" == "" ]; then
    echo -e "use default channel: defaultchannel"
    Channel="defaultchannel"      # default channel
fi
if [ "$Organization" == "" ]; then
    echo -e "use default org list: org1 org2"
    Organization=("org1" "org2")  # dafault org
fi

echo -e "Channel: ${Channel[@]}"
echo -e "Organizations: ${Organization[@]}"

# npm install fabric packages
if [ $NPMInstall != "none" ]; then
    npmProc
fi

# connection profile conversion
if [ $CProfConv != "none" ]; then
    cProfConversion
fi

echo "CCVER: $CCVER, CCNAMEUPD: $CCNAMEUPD, CCUPGRADE: $CCUPGRADE"

# execute PTE transactions
if [ ${#TestCases[@]} -gt 0 ]; then

    testProc

    echo
    echo -e "          *****************************************************************************"
    echo -e "          *                              TEST COMPLETED                               *"
    echo -e "          *****************************************************************************"
    echo
    echo
    echo -e "          *****************************************************************************"
    echo -e "          test logs dir: $LOGSDir"
    echo -e "          test results: $testPTEReport"
    echo -e "          *****************************************************************************"
    echo

fi


tCurr=`date`
echo -e "[$0] ends at $tCurr"
exit 0
