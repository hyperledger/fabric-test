#!/bin/bash

#
# usage: ./pte_mgr.sh <PTE Mgr input file>
# example: ./pte_mgr.sh PTEMgr.txt
#
#    PTEMgr.txt:
#    driver=pte userInputs/runCases-constant-i.txt
#    driver=pte userInputs/runCases-constant-q.txt
#

inFile=$1
EXEPTE=pte_driver.sh
nPTE=0

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

# PTE requests
function pteProc {
    nPTE=${#pteArray[@]}
    tWait=$[nPTE*4000+10000]
    tCurr=`date +%s%N | cut -b1-13`
    tStart=$[tCurr+tWait]
    echo "nPTE: $nPTE, tStart: $tStart"

    iPTE=0
    for i in ${pteArray[@]}; do
        echo "./$EXEPTE $i $iPTE $tStartE &"
        ./$EXEPTE $i $iPTE $tStart &
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

exit
