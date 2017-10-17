# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import unittest
import subprocess


######################################################################
### COUCHDB
######################################################################

class Perf_Stress_CouchDB(unittest.TestCase):

    @unittest.skip("skipping; WIP")
    def test_FAB3833_2i(self):
        '''
        Description:

        TPS performance measurement test with CouchDB and TLS.
        - Launch network, as defined below
        - Use PTE in Stress Mode to continuously send invoke
          transactions concurrently to 1 peer in both orgs,
        - Ensure events are raised for each Tx (indicating
          each was written to ledger)
        - Calculate tps
        - Remove network and cleanup.

        Artifact Locations: fabric-test/tools/PTE/CITest/FAB-3833-2i
        Logs Location: fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org, 1 Chan, 1 chaincode (sample_cc), 2 thrds, TLS enabled

        Client Driver: PTE: systest_pte.py, test_pte.sh, test_driver.sh.
        '''
        returncode = subprocess.call("./test_setup.sh", cwd='../../tools/PTE/CITest/scripts', shell=True)
        self.assertEqual(returncode, 0, msg="Failed to set up environment for test FAB-3833-2i")
        returncode = subprocess.call("./test_nl.sh", cwd='../../fabric-sdk-node/test/PTE/CITest/FAB-3833-2i', shell=True)
        self.assertEqual(returncode, 0, msg="Failed to create network for test FAB-3833-2i")
        result = subprocess.check_output("./test_driver.sh -e -p FAB3833-2i", cwd='../../fabric-sdk-node/test/PTE/CITest/scripts', shell=True)

        # Make sure no errors or timeouts occurred for any of the PTE test driver processes
        self.assertNotIn("pte-exec:completed:error", result)
        self.assertNotIn("pte-exec:completed:timeout", result)
        # Check for completion of all of the PTE test-driver processes.
        self.assertIn("info: [PTE 0 main]: [performance_main] pte-main:completed", result)


######################################################################
### LEVELDB
######################################################################

class Perf_Stress_LevelDB(unittest.TestCase):

    @unittest.skip("skipping")
    def test_FAB3808_2i(self):
        '''
        Description:

        TPS performance measurement test with LevelDB and TLS.
        - Launch network
        - Use PTE in Stress Mode to continuously send invoke
          transactions concurrently to 1 peer in both orgs
        - Ensure events are raised for each Tx (indicating
          each was written to ledger)
        - Calculate TPS (transactions per second)
        - Remove network and cleanup.

        Artifact Locations: fabric-test/tools/PTE/CITest/FAB-3808-2i
        Logs Location: fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org, 1 Chan, 1 chaincode (sample_cc), 2 thrds, TLS enabled

        Client Driver: PTE: systest_pte.py, test_pte.sh, test_driver.sh.
        '''
        returncode = subprocess.call("./test_setup.sh", cwd='../../tools/PTE/CITest/scripts', shell=True)
        self.assertEqual(returncode, 0, msg="Failed to set up environment for test FAB-3808-2i")
        returncode = subprocess.call("./test_nl.sh", cwd='../../fabric-sdk-node/test/PTE/CITest/FAB-3808-2i', shell=True)
        self.assertEqual(returncode, 0, msg="Failed to create network for test FAB-3808-2i")
        result = subprocess.check_output("./test_driver.sh -e -p FAB3808-2i", cwd='../../fabric-sdk-node/test/PTE/CITest/scripts', shell=True)

        # Make sure no errors or timeouts occurred for any of the PTE test driver processes
        self.assertNotIn("pte-exec:completed:error", result)
        self.assertNotIn("pte-exec:completed:timeout", result)
        # Check for completion of all of the PTE processes.
        self.assertIn("info: [PTE 0 main]: [performance_main] pte-main:completed", result)

