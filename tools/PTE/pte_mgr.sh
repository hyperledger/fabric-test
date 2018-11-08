#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./pte_mgr.sh <PTE Mgr input file>
# example: ./pte_mgr.sh PTEMgr.txt
# example: ./pte_mgr.sh PTEMgr.txt 1507234227470
#
#    PTEMgr.txt:
#    driver=pte userInputs/runCases-constant-i.txt
#    driver=pte userInputs/runCases-constant-q.txt
#

inFile=$1
EXEPTE=pte_driver.sh
nPTE=0
tStart=0
PIDS=""

echo "num $#"

if [ $# -gt 1 ]; then
    tStart=$2
fi

while read line
do
   #echo $line
   tt=$(echo $line | awk '{print $1}')
   #echo " tt  $tt"
   driverType=$(echo $tt | awk '{print tolower($tt)}')
   #echo "tt $tt driverType $driverType"
   userinput=$(echo $line | awk '{print $2}')

   case $driverType in
     driver=pte)
       echo "driver type supported: $driverType"
       pteArray[${#pteArray[@]}]=$userinput
       ;;

     *)
       echo "driver type unknown: $driverType"
       ;;

   esac

done < $1

echo "PTE Array: ${pteArray[@]}"

nanoOpt=""
myOS=`uname -s`
if [ "$myOS" != 'Darwin' ]; then
   # Linux supports nanoseconds option of date command, but not mac/freebsd/Darwin.
   # Use this detail to put millisecs into the tCurr, to prevent collisions if starting multiple PTEs at same time.
   nanoOpt="%N"
fi
echo "$0: nanoOpt $nanoOpt, myOS $myOS"

# PTE requests
function pteProc {
    nPTE=${#pteArray[@]}
    if [ $tStart -eq 0 ]; then
        tWait=$[nPTE*4000+10000]
        tCurr=`date +%s$nanoOpt | cut -b1-13`
        tStart=$[tCurr+tWait]
    fi
    echo "nPTE: $nPTE, tStart: $tStart"

    iPTE=0
    for i in ${pteArray[@]}; do
        echo "./$EXEPTE $i $iPTE $tStart &"
        ./$EXEPTE $i $iPTE $tStart &
        PIDS="$PIDS $!"
        let iPTE+=1
    done
}

# PTE
if [ ${#pteArray[@]} -gt 0 ]; then
    echo "executing ${#pteArray[@]} PTE requests"
    pteProc
else
    echo "no PTE requests"
fi

# wait for pte_driver.sh to complete
RET=0
for p in $PIDS; do
	wait $p
	# return the error code of the process failed last if any
	if [ $? -ne 0 ]; then
		RET=$?
	fi
done

exit $RET
