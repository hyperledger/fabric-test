#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########
CWD=$PWD
PREFIX="result"   # result log prefix

cd ../scripts

#### move the old index files and put the new index file in the chaincode installation folder
#### purpose is to restore the index directory as it was, once the test is done
indexDir="../../../../fabric/examples/chaincode/go/marbles02/META-INF/statedb/couchdb/indexes"
backupDir=backup_"$(date +"%T-%d-%m-%Y")"
mkdir $backupDir
mv $indexDir/*.* $backupDir/

indexFile2Field="index-2field.json"
indexFile4Field="index-4field.json"

#### Launch network
./test_driver.sh -n -m FAB-9575-4i -p -c marbles02 >& ../Logs/FAB-8252-4i-precfg.log

#### synch-up ledger
./test_driver.sh -t marbles02-4q
#### remove PTE log from synch-up ledger run
rm -f ../Logs/marbles02-4q*.log

#### prerequisite: testcase FAB-8694-4i: 1M (4x250000) invokes: initMarble, couchDB
./test_driver.sh -t FAB-8694-4i

#### Put the index files in the chaincode installation folder prior to upgrade
#### note that this test reuses the index files in FAB-8251
cp ../FAB-8251/indexes/$indexFile2Field $indexDir/
cp ../FAB-8251/indexes/$indexFile4Field $indexDir/

#### install and upgrade cc, which will force index builds for both indexes
#### note that only the second one will get used for the 4-field queries below
./test_driver.sh -m FAB-8251/upgrade  -u marbles02 >& ../Logs/FAB-8252-4i-precfg.log &

#### execute testcase FAB-9575-4i: 1M (4x250000) invokes and 2M (4x500000) 4-field queries simultaneously
./test_driver.sh -t FAB-9575-4i
./get_peerStats.sh -r FAB-9575-4i -p peer0.org1.example.com peer0.org2.example.com -c testorgschannel1 testorgschannel2 -n $PREFIX -o $CWD -v

#### return the original index files
rm -f $indexDir/$indexFile2Field $indexDir/$indexFile4Field
mv $backupDir/*.* $indexDir/
rmdir $backupDir
