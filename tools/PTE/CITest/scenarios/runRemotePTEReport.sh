#!/bin/bash -e

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# purpose:
# to fetch PTE report from remote systems and calculate overall test result

#default var
RHOSTLIST=""

#printUsage ()
printUsage () {
    echo "Description:"
    echo "Fetch PTE reports from a group of remote hosts and calculate the overall PTE report."
    echo
    echo "Requirements:"
    echo "1. setup remote access, see https://github.com/hyperledger/fabric-test/blob/master/tools/PTE/README.md#remote-pte on how to setup remote access"
    echo "2. git clone fabric-test under $GOPATH/src/github.com/hyperledger/"
    echo
    echo -e "\nUsage:\t./runRemotePTEReport.sh -r <list of remote hosts>"
    echo
    echo -e "\t-h, --help\tView this help message"
    echo
    echo -e "\t-r, --rhost\tremote hosts [list of remote host addresses]"
    echo -e "\t\tDefault: none. Note: Cannot be used with --rhostfile"
    echo
    echo -e "\t--rhostfile\ta text file contains remote hosts addresses, one address per line"
    echo -e "\t\tDefault: none. Note: Cannot be used with -r or --rhost"
    echo
    echo "Example:"
    echo "   ./runRemotePTEReport.sh -r 10.11.12.13 10.11.12.14"
    echo "   ./runRemotePTEReport.sh --rhostfile rhosts.txt"
    echo
}

# input parameters
while [[ $# -gt 0 ]]; do
    arg="$1"

    case $arg in

      -h | --help)
          printUsage               # displays usage info
          exit 0                   # exit cleanly, since the use just asked for help/usage info
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
if [ "$RHOSTLIST" == "" ]; then
    echo "Error: missing remote host addresses"
    echo
    printUsage
    exit 1
fi


RCWD=$PWD/../..
echo "RCWD=$RCWD"
RFILE="pteReport.txt"
LFILE="pteReport.txt"
if [ -e $LFILE ]; then
   rm -f $LFILE
fi

#execute remote jobs
echo "fething remote PTE report ..."
set -x
for remotehost in "${RHOSTLIST[@]}"
do
    rsh $remotehost cat $RCWD/$RFILE >> $LFILE
    CMDResult="$?"
    if [ $CMDResult -ne "0" ]; then
        echo "Error: Failed to rsh remote host $remotehost"
        exit 1
    fi
done

echo "calculating overall PTE report ..."
node ../scripts/get_pteReport.js pteReport.txt

set +x
exit 0
