# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import unittest
import subprocess

tool_directory = '../../tools/LTE/scripts'

class smoke_ledger(unittest.TestCase):

    def test_FAB_9708_LevelDB_VaryNumTxs(self):
        '''
         In this smoke test, we conduct a single, hopefully short-lived,
         test-run to verify LTE with LevelDB is working

         Passing criteria: Underlying LTE test completed successfully with
         exit code 0
        '''
        logfile = open("output_Smoke_LevelDB_VaryNumTxs.log", "w")
        returncode = subprocess.call(
                "./runbenchmarks.sh -f parameters_smoke_CI.sh "
                "varyNumTxs",
                shell=True, stderr=subprocess.STDOUT, stdout=logfile,
                cwd=tool_directory)
        logfile.close()
        self.assertEqual(returncode, 0, msg="VaryNumTxs "
                "performance test failed. \nPlease check the logfile "
                +logfile.name+" for more details.")

    def test_FAB_9708_CouchDB_VaryNumTxs(self):
        '''
         In this smoke test, we conduct a single, hopefully short-lived,
         test-run to verify LTE with CouchDB is working

         Passing criteria: Underlying LTE test completed successfully with
         exit code 0
        '''
        logfile = open("output_Smoke_CouchDB_VaryNumTxs.log", "w")
        returncode = subprocess.call(
                "./runbenchmarks.sh -f parameters_couchdb_smoke_CI.sh "
                "varyNumTxs",
                shell=True, stderr=subprocess.STDOUT, stdout=logfile,
                cwd=tool_directory)
        logfile.close()
        self.assertEqual(returncode, 0, msg="VaryNumTxs "
                "performance test failed. \nPlease check the logfile "
                +logfile.name+" for more details.")
