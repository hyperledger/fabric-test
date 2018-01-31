# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#


import unittest
import subprocess


TEST_PASS_STRING="RESULT=PASSED"


class OTE_Orderer_Traffic_Engine(unittest.TestCase):

    # @unittest.skip("skipping; WIP")
    def test_FAB7936_100tx_3ch_3ord_3kb(self):
        '''
        Description:
        Broadcast a total of 100 Transactions,
        distributed to the 3 channels on the 3 orderers.
        Use NetworkLauncher to create a network with the
        topology detailed below, using the defaults for
        payload size (small) and batchsize (10).

        Orderer smoke test, using NetworkLauncher.
        - Launch network, as defined below
        - Use OTE broadcast clients to continuously send
          invoke transactions concurrently on all 3 channels
          to all 3 orderers, and use OTE deliver clients to
          receive all blocks from all orderers.
        - Ensure all TXs, and the correct number of blocks,
          are received on each channel on each orderer
        - Calculate tps
        - Remove network and cleanup.

        Artifact Locations: fabric-test/tools/OTE/
        Logs Location: fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/

        Network Topology: 3 Ord, 3 KB, 1 ZK, 3 Chan, 9 thrds

        Client Driver: OTE: systest_ote.py, tools/OTE/runote.sh
        '''
        result = subprocess.check_output("./runote.sh -t FAB-7936_100tx_3ch_3ord_3kb", cwd='../../tools/OTE', shell=True)
        self.assertIn(TEST_PASS_STRING, result)


