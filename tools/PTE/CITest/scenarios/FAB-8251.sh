#!/bin/bash

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########
CWD=$PWD
PREFIX="result"   # result log prefix


#### move the old index files and put the new index file in the chaincode installation folder
#### purpose is to restore the index directory as it was, once the test is done
indexDir="../../../../chaincodes/marbles02/go/META-INF/statedb/couchdb/indexes"
backupDir=backup_"$(date +"%T-%d-%m-%Y")"
mkdir $backupDir
mv $indexDir/*.* $backupDir/

indexFile2Field="index-2field.json"
indexFile4Field="index-4field.json"

#### Launch network, priming, and
#### prerequisite: testcase FAB-8694-4i: 1M (4x250000) invokes: initMarble, couchDB
cd $CWD
./run_scenarios.sh -a marbles02 -n FAB-9575-4i -p marbles02-4q -i FAB-8694-4i

#### Put the index files in the chaincode installation folder prior to upgrade
cd ../scripts
cp ../FAB-8251/indexes/$indexFile2Field $indexDir/
cp ../FAB-8251/indexes/$indexFile4Field $indexDir/

#### install and upgrade cc, which will force index builds for both indexes
#### note that only the first one will get used for the 2-field queries below
./test_driver.sh -m FAB-8251/upgrade  -u marbles02 >& ../Logs/FAB-8251-4i-precfg.log &

#### execute testcase FAB-8251: 1M (4x250000) invokes and 2M (4x500000) 2-field queries simultaneously
cd $CWD
./run_scenarios.sh -i FAB-8251

#### return the original index files
rm -f $indexDir/$indexFile2Field $indexDir/$indexFile4Field
mv $backupDir/*.* $indexDir/
rmdir $backupDir
