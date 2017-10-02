#!/bin/bash

CMD=$1

function printHelp {

   echo " "
   echo "Usage: "
   echo " ./$CMD <TestCase>"
   echo "      where TestCase must be the name of the dircetory where the test case resides"
   echo " "
   echo " available TestCase:"
   echo "    FAB-query-TLS: 4 processes X 1000 queries, TLS"
   echo "    FAB-3983-i-TLS: FAB-3983, longrun: 4 processes X 60 hours invokes, constant mode, 1k payload, TLS"
   echo "    FAB-4162-i-TLS: FAB-4162, longrun: 4 processes X 60 hours mix mode, vary 1k-2k payload, TLS"
   echo "    FAB-4229-i-TLS: FAB-4229, longrun: 8 processes X 36 hours mix mode, vary 1k-2k payload, TLS"
   echo "    FAB-3989-4i-TLS: FAB-3989, stress: 4 processes X 1000 invokes, constant mode, 1k payload, TLS"
   echo "    FAB-3989-4q-TLS: FAB-3989, stress: 4 processes X 1000 queries, constant mode, 1k payload, TLS"
   echo "    FAB-3989-8i-TLS: FAB-3989, stress: 8 processes X 1000 invokes, constant mode, 1k payload, TLS"
   echo "    FAB-3989-8q-TLS: FAB-3989, stress: 8 processes X 1000 queries, constant mode, 1k payload, TLS"
   echo "    marbles-i-TLS: marbles chaincode: 4 processes X 1000 invokes, constant mode, TLS"
   echo "    marbles-q-TLS: marbles chaincode: 4 processes X 1000 queries, constant mode, TLS"
   echo "    robust-i-TLS: FAB-????, robustness: 4 processes X invokes, constant mode, 1k payload, TLS"
   echo " "
   echo " example: "
   echo " ./$CMD -t FAB-3983-i-TLS"
   echo " ./$CMD -t FAB-3989-4i-TLS"
   exit

}

printHelp
