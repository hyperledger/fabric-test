#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


tCurr=`date +%s%N | cut -b1-13`
echo "[$0] called at $tCurr"

while getopts ":b:h:" opt; do
  case $opt in
    # parse environment options
    b)
      tStart=$OPTARG
      echo "[$0] tStart: $tStart"
      ;;

    h)
      userHost=$OPTARG
      echo "[$0] userHost: $userHost"
      ;;

    *)
      echo "[$0] unsupported option: $opt"
      ;;

  esac
done

echo "[$0] userHost: $userHost "

# remote execution
ssh $userHost  << EOF
echo $GOPATH

cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric-sdk-node/test/PTE/CITest/scripts
./test_driver.sh -t FAB-3989-8q-TLS -b $tStart &

EOF

echo "[$0] completed"

exit

