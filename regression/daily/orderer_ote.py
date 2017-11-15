# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import unittest
import subprocess

tool_directory = '../../tools/OTE'
TEST_PASS_STRING = "PASS"
class perf_orderer(unittest.TestCase):

    def test_FAB_6996_solo_1ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open("ote_FAB-6996.log", "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-6996 2>&1",
                                            shell=True,
                                            #stderr=subprocess.STDOUT,
                                            #stdout=subprocess.STDOUT,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)
