#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

function printHelp {

   echo "Tool to manage HLF test network in IKS cluster"
   echo "Usage: "
   echo "    -s: Stop an orderer. Must be used with -o, -k and -l"
   echo "    -p: Resume all stooped orderers. Must be used with -c, -k and -l"
   echo "    -f: Find the current raft leader by looking at an orderer log. Must be used with -o, -h, -k and -l"
   echo "        The INFO logs must have been enabled upon startup in the specified orderer"
   echo " "
   echo "    -o: Name of the orderer."
   echo "    -c: Location of the cello services file."
   echo "    -h: channel name"
   echo "    -k: Kubeconfig file."
   echo "    -l: Location of the kubectl command (omit '/kubectl' at the end)."


   echo " "
   echo " example: "
   echo " (orderer stop) "
   echo "./fabkubemgr.sh -s -o orderer1st-ordererorg -k ~/cello/src/agent/ansible/vars/kubeconfig.regression -l ~/cello/src/agent/ansible/vars"
   echo ""
   echo "(find leader)"
   echo "./fabkubemgr.sh -f -o orderer1st-ordererorg -k ~/cello/src/agent/ansible/vars/kubeconfig.regression -l ~/cello/src/agent/ansible/vars -h testchannel1"

}

CWD=$PWD

while getopts ":srfo:c:h:k:l:" opt; do
  case $opt in
    s)
      ifStopOrderer=true
      echo "Stopping orderer."
      ;;

    r)
      ifResumeServices=true
      echo "Resuming all stopped orderers."
      ;;

    f)
      ifFindRaftLeader=true
      echo "Finding Raft leader."
      ;;

    o)
      Orderer=$OPTARG
      echo "Orderer: $Orderer"
      ;;

    c)
      ServiceFile=$OPTARG
      echo "Cello service file: $ServiceFile"
      ;;

    h)
      Channel=$OPTARG
      echo "Channel name: $Channel"
      ;;

    k)
      KubeFile=$OPTARG
      echo "kube config file: $KubeFile"
      ;;

    l)
      KubeCTL=$OPTARG
      echo "kubectl file location: $KubeCTL"
      ;;

    \?)
      echo "Invalid option: -$OPTARG" >&2
      printHelp
      exit 1
      ;;

    :)
      echo "Option -$OPTARG requires an argument." >&2
      printHelp
      exit 1
      ;;

  esac
done



if [ -z "$KubeFile" ] ||  [ -z "$KubeCTL" ];
then
  echo "Error: either kube-config file (-k) or kubectl location (-l) is not provided."
  printHelp
  exit 1
fi

if [ "$ifStopOrderer" = true ];
then
  cmd="$KubeCTL/kubectl --kubeconfig=$KubeFile delete pods $Orderer"
  eval $cmd
fi

if [ "$ifResumeServices" = true ];
then
  cmd="$KubeCTL/kubectl ./kubectl --kubeconfig=$KubeFile apply -f $ServiceFile"
  eval $cmd
fi

if [ ! -z "$ifFindRaftLeader"  ]
then
  output=$($KubeCTL/kubectl --kubeconfig=$KubeFile logs $Orderer | grep "Leader Changed" | grep "$Channel" | tail -1)
  LeaderNum=$(echo $output | cut -d ">" -f 1)
  echo "Leader is $LeaderNum"
fi


