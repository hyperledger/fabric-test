#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# USAGE:  ./get_peerStats.sh [options][values]

# FUNCTION: usage
#           Displays usage command line options; examples; exits.
usage () {
    echo -e "get_peerStats.sh:"
    echo -e " 1. uses docker command to retrieve peers logs"
    echo -e " 2. parses block information in the peers logs"
    echo -e " 3. calculates TPS"
    echo
    echo -e " requirement: set CORE_LOGGING_LEVEL to INFO for peers"
    echo
    echo -e "\nUSAGE:\t./get_peerStats.sh [options] [values]"
    echo -e "\tThe output file is <output dir>/<prefix name>_<runid>.txt"
    echo
    echo -e "-h, --help\tView this help message."
    echo
    echo -e "-n, --name\tPrefix to logfile name."
    echo -e "\t\t(Default: peer)"
    echo
    echo -e "-o, --output\t Directory of output files."
    echo -e "\t\t(Default: peerStatsOutput)"
    echo
    echo -e "-p, --peer\tSpecify peers for which to search for peer logs."
    echo -e "\t\t(required)"
    echo
    echo -e "-r, --runid\t RUNID of the run."
    echo -e "\t\t(Default: CITest)"
    echo
    echo -e "-v, --verbose\tDisplay output to terminal during runtime."
    echo -e "\t\t(Output will be written to files regardless.)"
    echo
    echo -e "examples:"
    echo -e " ./get_peerStats.sh -r myTestID -p peer0.org1.example.com peer0.org2.example.com -n myTest -o myDir -v"
    echo -e "\tThe output file is myDir/myTest_myTestID.txt"
    echo
    exit
}


# FUNCTION: error
#           Displays error message; exits.
#     ARGS: 1: error message
error () {
    # 1: error message
    echo -e "\nERROR: $1"
    exit
}


# FUNCTION: output
#           Outputs text to file & terminal.
#     ARGS: 1: text to output; 2: outfile
output () {
    # 1: text to output; 2: outfile
    if [ $VERBOSE = "True" ]; then
        echo -e "$1"                # show output in terminal during runtime
    fi
    echo -e "$1" >> $2              # output data to outfile
}


# FUNCTION: readLog
#           Reads a single file; gathers and outputs data.
#     ARGS: 1: file to read from; 2: file to write to
readLog () {
    # SETUP VARIABLES
    infile="$1"
    outfile="$2"

    lines=$(cat "$infile" | grep "Committed block")  # only look at lines when block created
    preLines=$OUTPUTPATH"/prelines"
    if [ -e $preLines ]; then
       rm -f $preLines
    fi
    echo "$lines" >> $preLines
    sTime=0
    eTime=0
    txNum=0
    blkNum=0
    sLine=1
    while IFS= read line
    do
        iBlk=$(echo $line | awk '{print $13}' | sed 's/\[\(.*\)\].*/\1/')
        if [ "$iBlk" == "0" ] || [ "$iBlk" == "1" ]; then
           sLine=$[ sLine + 1 ]
        else
           blkNum=$[ blkNum + 1 ]
           tTmp=$(echo $line | awk '{print $15}')
           txNum=$[ txNum + tTmp ]
        fi
    done < $preLines

    sTime=$(cat $preLines | head -n$sLine | tail -n1 | awk '{print $2}')
    eTime=$(cat $preLines | tail -n1 | awk '{print $2}')
    sTime=`echo ${sTime/"."/":"}`
    eTime=`echo ${eTime/"."/":"}`
    sMSec=$(echo "$sTime" | awk -F ':' '{print (((($1*60)+$2)*60)+$3)*1000+$4}')
    eMSec=$(echo "$eTime" | awk -F ':' '{print (((($1*60)+$2)*60)+$3)*1000+$4}')
    #echo "sTime: $sTime, sMSec: $sMSec, eTime: $eTime, eMSec: $eMSec"
    #output "sTime: $sTime, sMSec: $sMSec, eTime: $eTime, eMSec: $eMSec" "$2"
    totalMSec=$(( (eMSec - sMSec + 86400000) % 86400000 ))
    TPS=$(echo "$txNum" "$totalMSec" | awk '{printf "%.2f", $1/$2*1000}')
    BPS=$(echo "$blkNum" "$totalMSec" | awk '{printf "%.2f", $1/$2*1000}')
    #output "peer: $peer" "$2"
    output "\tstart time: $sTime, end time: $eTime, total time: $totalMSec ms" "$2"
    output "\tblk Num: $blkNum, BPS: $BPS" "$2"
    output "\ttx Num: $txNum, TPS: $TPS\n" "$2"

    #echo "[readLog] remove $preLines"
    rm -f $preLines
}


# FUNCTION: getPeerStats
#           Gathers data for a set of containers.
#     ARGS: 1: outfile
getPeerStats () {
    # examine peer log for every peer listed (default: peer1)
    i=0
    for peer in "${PEERS[@]}"; do
    #for peer in "$1"; do
        echo "[getPeerStats] peer: $peer"
        peerlog="tmpPeerLog$i"
        docker logs $peer >& $peerlog
        i=$[ i + 1 ]
        infile="$peerlog"
        if [ -f "$infile" ]; then
            # confirm file contains key phrase
            if [ "$(cat $infile | grep "Committed block")" = "" ]; then
                echo -e "\nERROR: Log does not appear to have any blocks recorded."
                echo "Searched: $infile"
            # gather data
            else
                output "\nPeer:\t$peer" "$1"
                readLog "$infile" "$1"
            fi
        else
            echo -e "\nERROR: Log file does not exist: $infile"
        fi
        # echo "[getPeerStats] remove tmp log file."
        rm -f $peerlog
    done
}

# FUNCTION: getAllStats
#           Gathers data for an entire run.
getAllStats () {

    outfile=$OUTPUTPATH/$LOGNAME"_"$RUNID".txt"
    echo -e "[getAllStats] outfile:  $outfile"
    # output headers
    echo -n "" > $outfile
    output "Peer Log Data Summary Report" "$outfile"

    getPeerStats "$outfile"
}


# CHECK FOR RUNID
# not enough args or looking for help
if [ $# -lt 1 -o "$1" = "-h" -o "$1" = "--help" ]; then
    usage                        # displays usage info; exits
fi

# SET DEFAULT VALUES
VERBOSE="False"                  # display output to terminal?
OUTPUTPATH="peerStatsOutput"     # path to output files
LOGNAME="peer"                   # prefix name of logfiles
RUNID="CITest"

# GET CUSTOM OPTIONS
echo -e "\nAny optional arguments chosen:\n"
while [[ $# -gt 0 ]]; do
    arg="$1"

    case $arg in

      -h | --help)
          usage        # displays usage info; exits
          ;;

      -r | --runid)
          shift
          RUNID=$1 # ID for run being examined
          echo -e "\t- Specify RUNID: $RUNID\n"
          shift
          ;;

      -p | --peer)
          shift
          i=0
          PEERS[$i]=$1
          shift
          until [[ $(eval "echo \$1") =~ ^-.* ]] || [ -z $(eval "echo \$1") ]; do
              i=$[ i + 1]
              PEERS[$i]=$1
              shift
          done
          echo -e "\t- Specify peers: ${PEERS[@]}"
          echo -e ""
          ;;

      -n | --name)
          shift
          LOGNAME=$1
          echo -e "\t- Specify prefix log name: $LOGNAME\n"
          shift
          ;;

      -o | --output)
          shift
          OUTPUTPATH=$1
          shift
          ;;

      -v | --verbose)
          VERBOSE="True"
          echo -e "\t- Verbose; displaying output to terminal.\n"
          shift
          ;;

      *)
          echo "Unrecognized command line argument: $1"
          usage
          ;;
    esac
done

# VERIFY RUN DIRECTORY
if [ ! -d $RUNPATH ]; then
    error "Cannot locate run directory $RUNPATH.\n"
fi

# GET LOGS TO EXAMINE
if [ "${#PEERS[@]}" = "0" ]; then
    echo "error: no peer is specified."
    usage
fi

# check output directory, create output dir if not exist
if [ -d "$OUTPUTPATH" ]; then
    echo -e "\t- Specify output path; storing output files in this directory:  $OUTPUTPATH\n"
else
    mkdir $OUTPUTPATH
    echo "Directory [$OUTPUTPATH] does not exist. Create it ..."
fi

printf ' * %.0s' {1..25}    # mark end of options
echo -e "\n"

# COLLECT ALL LOG DATA
getAllStats

#echo "[main] remove $peerlog"
#rm -f $peerlog
