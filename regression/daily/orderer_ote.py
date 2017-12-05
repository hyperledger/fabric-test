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

    def test_FAB_6996_solo_1ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-6996.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-6996 2>&1",
                                            shell=True,
                                            #stderr=subprocess.STDOUT,  #Uncomment this two lines to see the stdout
                                            #stdout=subprocess.STDOUT,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7070_solo_1ch_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7070.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7070 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7024_solo_1ch_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7024.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7024 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7071_solo_1ch_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7071.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7071 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)


    def test_FAB_7026_solo_3ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7026.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7026 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7072_solo_3ch_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7072.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7072 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7027_solo_3ch_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7027.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7027 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7073_solo_3ch_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service in 3 channels,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7073.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7073 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7036_3ord_kafka_1ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7036.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7036 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7074_3ord_kafka_1ch_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7074.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7074 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7037_3ord_kafka_1ch_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7037.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7037 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7075_3ord_kafka_1ch_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7075.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7075 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7038_3ord_kafka_3ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7038.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7038 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7076_3ord_kafka_3ch_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7076.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7076 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7039_3ord_kafka_3ch_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7039.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7039 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7077_3ord_kafka_3ch_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7077.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7077 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7058_6ord_kafka_1ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7058.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7058 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7078_6ord_kafka_1ch_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7078.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7078 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7059_6ord_kafka_1ch_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7059.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7059 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7079_6ord_kafka_1ch_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7079.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7079 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7060_6ord_kafka_3ch(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7060.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7060 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7080_6ord_kafka_3ch_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering service, and verify
         delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7080.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7080 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7061_6ord_kafka_3ch_500batchsize(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7061.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7061 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)

    def test_FAB_7081_6ord_kafka_3ch_500batchsize_10kpayload(self):
        '''
         Using one broadcast client thread per channel per orderer,
         send 30000 transactions through the ordering servicewith batchsize 500,
         and verify delivery using an equal number of deliver clients.
         Refer to the logs to also see the TPS throughput rate.
        '''
        with open(os.path.join(logs_directory, "ote_FAB-7081.log"), "w") as logfile:
            result = subprocess.check_output("./runote.sh -t FAB-7081 2>&1",
                                            shell=True,
                                            cwd=tool_directory)
            print(result)
            logfile.write(result)
            self.assertIn(TEST_PASS_STRING, result)
