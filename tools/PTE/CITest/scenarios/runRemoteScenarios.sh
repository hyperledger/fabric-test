#!/bin/bash -e

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# purpose:
# to execute a scenarios PTE script on multiple remote systems

# default vars
remoteUser="root"
remoteTask="none"
RHOSTLIST=""

#printUsage ()
printUsage () {
    echo "Description:"
    echo "Execute a task [specified by option -t] simultaneously on a group of remote hosts. The task is a bash test script that has been previously installed in each remote host in path $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/scenarios/<task>"
    echo "Requirements:"
    echo "1. setup remote access, see https://github.com/hyperledger/fabric-test/blob/master/tools/PTE/README.md#remote-pte on how to setup remote access"
    echo "2. git clone fabric-test under $GOPATH/src/github.com/hyperledger/"
    echo "3. on each remote host, create a bash script in fabric-test/tools/PTE/CITest/scenarios"
    echo
    echo -e "\nUsage:\t./runRemoteScenarios.sh -t <remote task> -r <list of remote hosts> [options] [value]"
    echo
    echo -e "\t-h, --help\tView this help message"
    echo
    echo -e "\t-u, --userid\tremote host userid [userid]"
    echo -e "\t\tDefault: root, the same userid is used for all remote hosts"
    echo
    echo -e "\t-t, --task\tremote task [required]"
    echo -e "\t\tDefault: none"
    echo
    echo -e "\t-r, --rhost\tremote hosts [list of remote host addresses]"
    echo -e "\t\tDefault: none. Note: Cannot be used with --rhostfile"
    echo
    echo -e "\t--rhostfile\ta text file contains remote hosts addresses, one address per line"
    echo -e "\t\tDefault: none. Note: Cannot be used with -r or --rhost"
    echo
    echo "Example:"
    echo "   ./runRemoteScenarios.sh -u admin -t FAB-14230.sh"
    echo "   ./runRemoteScenarios.sh -u admin -r 10.11.12.13 10.11.12.14 -t FAB-14230.sh"
    echo "   ./runRemoteScenarios.sh -u admin --rhostfile rhosts.txt -t FAB-14230.sh"
    echo
}

#kill all remote PTE Proc if any remote PTE failed
killRemotePTEProc () {
    echo "kill remote PTE processes ..."
    for rh in "${RHOSTLIST[@]}"
    do
        echo "kill remote PTE processes: $rh"
        ssh -l $remoteUser $rh "kill -9 \$(ps -ef | grep pte | grep node | awk '{print \$2}')"
    done
}

# input parameters
while [[ $# -gt 0 ]]; do
    arg="$1"

    case $arg in

      -h | --help)
          printUsage               # displays usage info
          exit 0                   # exit cleanly, since the use just asked for help/usage info
          ;;

      -u | --userid)
          shift
          remoteUser=$1            # remote host userid
          echo "input remote user: $remoteUser"
          shift
          ;;

      -t | --task)
          shift
          remoteTask=$1                 # PTE task
          echo "input remoteTask: $remoteTask"
          shift
          ;;

      -r | --rhost)
          if [ "$RHOSTLIST" != "" ]; then
              echo -e "\tError: option -r or --rhost cannot be used with --rhostfile"
              echo -e ""
              printUsage
              exit 1
          fi

          shift
          i=0
          until [[ $(eval "echo \$1") =~ ^-.* ]] || [ -z $(eval "echo \$1") ]; do
              RHOSTLIST[$i]=$1
              i=$[ i + 1]
              shift
          done
          echo -e "\t- Specify remote hosts: ${RHOSTLIST[@]}"
          echo -e ""
          ;;

      --rhostfile)
          if [ "$RHOSTLIST" != "" ]; then
              echo -e "\tError: option --rhostfile cannot be used with -r or --rhost"
              echo -e ""
              printUsage
              exit 1
          fi

          shift
          rfile=$1
          echo -e "\t- Specify remote hosts file: $rfile"
          i=0
          #RHOSTLIST[$i]=$1  # Channels
          while read line
          do
             RHOSTLIST[$i]=$(echo $line | awk '{print $1}')
             i=$[ i + 1]
          done < $rfile

          echo -e "\t- Specify remote hosts: ${RHOSTLIST[@]}"
          shift
          ;;

      *)
          echo "Error: Unrecognized command line argument: $1"
          printUsage
          exit 1
          ;;

    esac
done

# sanity check
if [ $remoteTask == "none" ]; then
    echo "Error: missing remote task"
    echo
    printUsage
    exit 1
fi

if [ "$RHOSTLIST" == "" ]; then
    echo "Error: missing remote host addresses"
    echo
    printUsage
    exit 1
fi


#execute remote task
for remotehost in "${RHOSTLIST[@]}"
do
    echo "remotehost: $remotehost"
    ssh -l $remoteUser $remotehost /bin/bash << EOF
    if [ -e .nvm/nvm.sh ]; then
        source .nvm/nvm.sh
    fi
    node -v
    cd $GOPATH/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/scenarios
    nohup ./$remoteTask > nohup.log 2>&1 &
    exit 0

EOF
    CMDResult="$?"
    if [ $CMDResult -ne "0" ]; then
        echo "Error: Failed to ssh remote host $remotehost"
        killRemotePTEProc
        exit 1
    fi

done

exit 0
