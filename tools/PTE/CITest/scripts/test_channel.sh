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

runCreate=`ls CITest/$PrecfgDir/preconfig/channels/runCases*create*`
if [ -n $runCreate ]; then
    echo "[$0] create channel, runCreate $runCreate"
    for ri in $runCreate; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
    done
else
    echo "[$0] warning: CITest/$PrecfgDir/preconfig/channels/runCases*create* file NOT found; skipping channel creation"
fi

runJoin=`ls CITest/$PrecfgDir/preconfig/channels/runCases*join*`
if [ -n $runJoin ]; then
    echo "[$0] join channel, runJoin $runJoin"
    for ri in $runJoin; do
       echo "./pte_driver.sh $ri"
       ./pte_driver.sh $ri
       sleep 60s
    done
else
    echo "[$0] warning: CITest/$PrecfgDir/preconfig/channels/runCases*join* file NOT found; skipping joining any peers to channel"
fi

# Although it is recommended for all tests, only the sidedb tests such as those using marbles02-private
# with multiple orgs participating in a private collection (eg FAB-10135) actually NEED to connect the
# orgs of each a channal using anchor-peer channel-updates. Thus, we can hide and ignore an error like
#   ls: cannot access 'CITest/FAB-8192-4i/preconfig/channels/runCases*update*': No such file or directory
# in the output logs for those tests that simply do not send channel config updates for anchor peers.
runUpdate=`ls CITest/$PrecfgDir/preconfig/channels/runCases*update* 2>/dev/null`
if [ -n $runUpdate ]; then
    echo "[$0] update channel, runUpdate: $runUpdate"
    for ri in $runUpdate; do
        echo "./pte_driver.sh $ri"
        ./pte_driver.sh $ri
        sleep 60s
    done
else
    echo "[$0] warning: CITest/$PrecfgDir/preconfig/channels/runCases*update* file NOT found; skipping channel config updates for anchor peers; (it is required for most sidedb tests; it is recommended but not required for many other tests)"
fi

cd $CWD
echo "[$0] cd back to dir: $PWD"
