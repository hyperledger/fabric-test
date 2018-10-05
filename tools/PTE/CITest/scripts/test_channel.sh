#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

PrecfgDir=$1
echo "[$0] PrecfgDir: $PrecfgDir"
# PTE: create/join channels
CWD=$PWD

# cd PTE dir
cd ../../
echo "[$0] PTE dir= $PWD"

echo "[$0] create channel"
echo " ./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-create-TLS.txt"

    runCreate=`ls CITest/$PrecfgDir/preconfig/channels/runCases*create*`
    echo "runCreate $runCreate"
    for ri in $runCreate; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
    done

echo "[$0] join channel"
echo " ./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-join-TLS.txt"

    runJoin=`ls CITest/$PrecfgDir/preconfig/channels/runCases*join*`
    echo "runJoin $runJoin"
    for ri in $runJoin; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
    done

echo "[$0] update channel"
echo " ./pte_driver.sh CITest/$PrecfgDir/preconfig/channels/runCases-chan-update-TLS.txt"

    # We could redirect stderr of the following "ls" to /dev/null, but that would make debugging
    # more difficult in testcases where it is absolutely needed but forgotten by the test writer.
    # Although it is recommended for all tests, only the sidedb tests such as those using marbles02-private
    # actually NEED to connect the orgs of each a channal using anchor-peer channel-updates. Thus, it is OK
    # to ignore the following error msg in the output logs for those tests that simply do not do it:
    #   ls: cannot access 'CITest/FAB-8192-4i/preconfig/channels/runCases*update*': No such file or directory
    runUpdate=`ls CITest/$PrecfgDir/preconfig/channels/runCases*update*`
    echo "runUpdate $runUpdate"
    for ri in $runUpdate; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
    done


cd $CWD
echo "[$0] current dir: $PWD"
