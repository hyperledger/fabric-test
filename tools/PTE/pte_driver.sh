#!/bin/bash
set -e
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

#
# usage: ./pte_driver.sh <user input file>
# example: ./pte_driver.sh runCases.txt
#
#    runCases.txt:
#    sdk=node userInputs/userInput-samplecc-i.json
#    sdk=node userInputs/userInput-samplecc-q.json
#

#echo "input vars: $# "
inFile=$1
iPTE=0
tStart=0

# if called from pte_mge.sh, then set vars from inputs
if [ $# -gt 1 ]; then
    iPTE=$2
    tStart=$3
fi

echo "$0 inFile= $inFile, tStart=$tStart iPTE=$iPTE "
EXENODE=pte-main.js
nInstances=0
PIDS=""

while read line
do
   #echo $line
   tt=$(echo $line | awk '{print $1}')
   #echo " tt  $tt"
   sdkType=$(echo $tt | awk '{print tolower($tt)}')
   #echo "tt $tt sdkType $sdkType"
   userinput=$(echo $line | awk '{print $2}')

   case $sdkType in
     sdk=node)
       echo "sdk type supported: $sdkType"
       nodeArray[${#nodeArray[@]}]=$userinput
       ;;

     sdk=python)
       echo "sdk type unsupported: $sdkType"
       pythonArray[${#pythonArray[@]}]=$userinput
       ;;

     sdk=java)
       echo "sdk type unsupported: $sdkType"
       javaArray[${#javaArray[@]}]=$userinput
       ;;

     *)
       echo "sdk type unknown: $sdkType"
       ;;

   esac

done < $1

echo "Node Array: ${nodeArray[@]}"

nanoOpt=""
myOS=`uname -s`
if [ "$myOS" != 'Darwin' ]; then
   # Linux supports nanoseconds option of date command, but not mac/freebsd/Darwin.
   # Use this detail to put millisecs into the tCurr, to prevent collisions if starting multiple PTEs at same time.
   nanoOpt="%N"
fi
echo "$0: nanoOpt $nanoOpt, myOS $myOS"

# node requests
function nodeProc {
    nInstances=${#nodeArray[@]}
    if [ $tStart -eq 0 ]; then
        tWait=$[nInstances*4000+10000]
        tCurr=`date +%s$nanoOpt | cut -b1-13`
        tStart=$[tCurr+tWait]
    fi
    echo "iPTE: $iPTE, nInstances: $nInstances, tStart: $tStart"

    BCN=0
    for i in ${nodeArray[@]}; do
        echo "execution: $i"
        node $EXENODE $BCN $i $tStart $iPTE &
        PIDS="$PIDS $!"
        let BCN+=1
    done
}

# python requests
function pythonProc {
    echo "python has not supported yet."
}

# java requests
function javaProc {
    echo "java has not supported yet."
}

# node
if [ ${#nodeArray[@]} -gt 0 ]; then
    echo "executing ${#nodeArray[@]} node requests"
    nodeProc
else
    echo "no node requests"
fi

# python
if [ ${#pythonArray[@]} -gt 0 ]; then
    echo "executing ${#pythonArray[@]} python requests"
    pythonProc
else
    echo "no python requests"
fi

# java
if [ ${#javaArray[@]} -gt 0 ]; then
    echo "executing ${#javaArray[@]} java requests"
    javaProc
else
    echo "no java requests"
fi

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
