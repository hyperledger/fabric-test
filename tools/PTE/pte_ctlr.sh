#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./pte_mgr.sh <PTE Mgr input file>
# example: ./pte_mgr.sh PTEMgr.txt
#
#    PTEMgr.txt:
#    driver=pte userInputs/runCases-constant-i.txt
#    driver=pte userInputs/runCases-constant-q.txt
#

inFile=$1
PIDS=""

# set starting time for each pte
nanoOpt=""
myOS=`uname -s`
if [ "$myOS" != 'Darwin' ]; then
   # Linux supports nanoseconds option of date command, but not mac/freebsd/Darwin.
   # Use this detail to put millisecs into the tCurr, to prevent collisions if starting multiple PTEs at same time.
   nanoOpt="%N"
fi
echo "$0: nanoOpt $nanoOpt, myOS $myOS"
tCurr=`date +%s$nanoOpt | cut -b1-13`
tWait=50000
tStart=$[tCurr+tWait]
echo "tStart $tStart"

# read input file
while read line
do
   tt=$(echo $line | awk '{print $1}')
   driverType=$(echo $tt | awk '{print tolower($tt)}')
   #echo "tt $tt driverType $driverType"
#   rUser=$(echo $line | awk '{print $2}')
#   rHost=$(echo $line | awk '{print $3}')
   userHost=$(echo $line | awk '{print $2}')
   exeScript=$(echo $line | awk '{print $3}')

   echo "[$0] driverType: $driverType userHost: $userHost exeScript: $exeScript"
   case $driverType in
     driver=ctlr)
       echo "[$0] driver type supported: $driverType"
       #echo "[$0] ./$exeScript -b $tStart -u $rUser -h $rHost >& $exeScript.log &"
       ./$exeScript -b $tStart -h $userHost>& $exeScript.log &
       PIDS="$PIDS $!"
       echo ""
       ;;

     *)
       echo "driver type unknown: $driverType"
       ;;

   esac

done < $inFile

# wait for processes to complete
RET=0
for p in $PIDS; do
	wait $p
	# return the error code of the process failed last if any
	if [ $? -ne 0 ]; then
		RET=$?
	fi
done

exit $RET
