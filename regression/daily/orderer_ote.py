# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import unittest
import subprocess
import os

tool_directory = '../../tools/OTE'
logs_directory = './ote_logs'
TEST_PASS_STRING = "RESULT=PASSED"

if not os.path.exists(logs_directory):
    os.makedirs(logs_directory)

class perf_orderer(unittest.TestCase):

    def test_FAB_6996_30ktx_1ch_solo(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-6996_30ktx_1ch_solo.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-6996_30ktx_1ch_solo 2>&1",
                                            shell=True,
                                            #stderr=subprocess.STDOUT,  #Uncomment this two lines to see the stdout
                                            #stdout=subprocess.STDOUT,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7070_30ktx_1ch_solo_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7070_30ktx_1ch_solo_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7070_30ktx_1ch_solo_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7024_30ktx_1ch_solo_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7024_30ktx_1ch_solo_500batchsize.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7024_30ktx_1ch_solo_500batchsize 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7071_30ktx_1ch_solo_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7071_30ktx_1ch_solo_500batchsize_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7071_30ktx_1ch_solo_500batchsize_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)


    def test_FAB_7026_30ktx_3ch_solo(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7026_30ktx_3ch_solo.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7026_30ktx_3ch_solo 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7072_30ktx_3ch_solo_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7072_30ktx_3ch_solo_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7072_30ktx_3ch_solo_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7027_30ktx_3ch_solo_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7027_30ktx_3ch_solo_500batchsize.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7027_30ktx_3ch_solo_500batchsize 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7073_30ktx_3ch_solo_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7073_30ktx_3ch_solo_500batchsize_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7073_30ktx_3ch_solo_500batchsize_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7036_30ktx_1ch_3ord_5kb(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7036_30ktx_1ch_3ord_5kb.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7036_30ktx_1ch_3ord_5kb 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7074_15ktx_1ch_3ord_5kb_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7074_15ktx_1ch_3ord_5kb_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7074_15ktx_1ch_3ord_5kb_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7037_30ktx_1ch_3ord_5kb_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7037_30ktx_1ch_3ord_5kb_500batchsize.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7037_30ktx_1ch_3ord_5kb_500batchsize 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7075_15ktx_1ch_3ord_5kb_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7075_15ktx_1ch_3ord_5kb_500batchsize_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7075_15ktx_1ch_3ord_5kb_500batchsize_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7038_30ktx_3ch_3ord_5kb(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7038_30ktx_3ch_3ord_5kb.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7038_30ktx_3ch_3ord_5kb 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7076_15ktx_3ch_3ord_5kb_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7076_15ktx_3ch_3ord_5kb_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7076_15ktx_3ch_3ord_5kb_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7039_30ktx_3ch_3ord_5kb_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7039_30ktx_3ch_3ord_5kb_500batchsize.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7039_30ktx_3ch_3ord_5kb_500batchsize 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7077_15ktx_3ch_3ord_5kb_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7077_15ktx_3ch_3ord_5kb_500batchsize_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7077_15ktx_3ch_3ord_5kb_500batchsize_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7058_30ktx_1ch_6ord_5kb(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7058_30ktx_1ch_6ord_5kb.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7058_30ktx_1ch_6ord_5kb 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7078_15ktx_1ch_6ord_5kb_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7078_15ktx_1ch_6ord_5kb_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7078_15ktx_1ch_6ord_5kb_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7059_30ktx_1ch_6ord_5kb_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7059_30ktx_1ch_6ord_5kb_500batchsize.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7059_30ktx_1ch_6ord_5kb_500batchsize 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7079_15ktx_1ch_6ord_5kb_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7079_15ktx_1ch_6ord_5kb_500batchsize_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7079_15ktx_1ch_6ord_5kb_500batchsize_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7060_30ktx_3ch_6ord_5kb(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7060_30ktx_3ch_6ord_5kb.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7060_30ktx_3ch_6ord_5kb 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7080_15ktx_3ch_6ord_5kb_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7080_15ktx_3ch_6ord_5kb_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7080_15ktx_3ch_6ord_5kb_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7061_30ktx_3ch_6ord_5kb_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7061_30ktx_3ch_6ord_5kb_500batchsize.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7061_30ktx_3ch_6ord_5kb_500batchsize 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7081_15ktx_3ch_6ord_5kb_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 15000 transactions through the ordering service with batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7081_15ktx_3ch_6ord_5kb_500batchsize_10kpayload.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7081_15ktx_3ch_6ord_5kb_500batchsize_10kpayload 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)
