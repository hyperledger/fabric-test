# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

######################################################################
# To execute:
# Install: sudo apt-get install python python-pytest
# Run on command line: py.test -v --junitxml results_systest_pte.xml ./systest_pte.py

import unittest
import subprocess

TEST_PASS_STRING="RESULT=PASS"

######################################################################
### COUCHDB
######################################################################

logs_directory = '../../tools/PTE/CITest/Logs'
scenarios_directory = '../../tools/PTE/CITest/scenarios'
nl_directory = '../../tools/NL'

class Perf_Stress_CouchDB(unittest.TestCase):

    def test_FAB3833_2i_FAB3810_2q(self):
        '''
        Description:

        TPS performance measurement test with CouchDB and TLS.
        - This scenario launches a network, as defined below,
          and runs two tests - for invokes, and for queries -
          on single host using networkLauncher (after removing
          any existing network and artifacts).

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
          1 Channel, 1 chaincode (sample_cc), 2 threads, TLS enabled

        Part 1: FAB-3833
        - Use PTE in Stress Mode to continuously send INVOKE
          transactions concurrently to 1 peer in both orgs,
        - Ensure events are raised for each Tx (indicating
          each was written to ledger)

        Part 2: FAB-3810
        - Same as Part 1 - but use QUERY instead of INVOKE

        Part 3: Count TXs and calculate results for both testcases in this scenario

        Logs Artifacts Locations, PTE Testcase Logs:
            fabric-test/tools/PTE/CITest/Logs/FAB-3833-2i-pteReport.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3833-2i-<MMDDHHMMSS>.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3810-2q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-3833-2i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed with non-zero exit code; check for errors in fabric-test/tools/PTE/CITest/Logs/")
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # First check if the test finished and created the report file; then check it for accurate counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3833-2i-pteReport.log", logfilelist)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 20000 received 20000\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 20000 timeout 0 unreceived 0\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 20000 received 20000\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)


    def test_FAB3832_4i_FAB3834_4q(self):
        '''
        Description:

        TPS performance measurement test with CouchDB and TLS.
        - This scenario launches a network, as defined below,
          and runs two tests - for invokes, and for queries -
          on single host using networkLauncher (after removing
          any existing network and artifacts).

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
          1 Channel, 1 chaincode (sample_cc), 4 threads, TLS enabled

        Part 1: FAB-3832
        - Use PTE in Stress Mode to continuously send INVOKE
          transactions concurrently to 1 peer in both orgs,
        - Ensure events are raised for each Tx (indicating
          each was written to ledger)

        Part 2: FAB-3834
        - Same as Part 1 - but use QUERY instead of INVOKE

        Part 3: Count TXs and calculate results for both testcases in this scenario

        Logs Artifacts Locations, PTE Testcase Logs:
            fabric-test/tools/PTE/CITest/Logs/FAB-3832-4i-pteReport.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3832-4i-<MMDDHHMMSS>.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3834-4q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-3832-4i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed with non-zero exit code; check for errors in fabric-test/tools/PTE/CITest/Logs/")
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # First check if the test finished and created the report file; then check it for accurate counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3832-4i-pteReport.log", logfilelist)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 40000 received 40000\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 40000 timeout 0 unreceived 0\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 40000 received 40000\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)


######################################################################
### LEVELDB
######################################################################

class Perf_Stress_LevelDB(unittest.TestCase):

    def test_FAB3808_2i_FAB3811_2q(self):
        '''
        Description:

        TPS performance measurement test with levelDB and TLS.
        - This scenario launches a network, as defined below,
          and runs two tests - for invokes, and for queries -
          on single host using networkLauncher (after removing
          any existing network and artifacts).

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
          1 Channel, 1 chaincode (sample_cc), 2 threads, TLS enabled

        Part 1: FAB-3808
        - Use PTE in Stress Mode to continuously send INVOKE
          transactions concurrently to 1 peer in both orgs,
        - Ensure events are raised for each Tx (indicating
          each was written to ledger)

        Part 2: FAB-3811
        - Same as Part 1 - but use QUERY instead of INVOKE

        Part 3: Count TXs and calculate results for both testcases in this scenario

        Logs Artifacts Locations, PTE Testcase Logs:
            fabric-test/tools/PTE/CITest/Logs/FAB-3808-2i-pteReport.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3808-2i-<MMDDHHMMSS>.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3811-2q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-3808-2i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed with non-zero exit code; check for errors in fabric-test/tools/PTE/CITest/Logs/")
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # First check if the test finished and created the report file; then check it for accurate counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3808-2i-pteReport.log", logfilelist)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 20000 received 20000\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 20000 timeout 0 unreceived 0\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 20000 received 20000\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)


    def test_FAB3807_4i_FAB3835_4q(self):
        '''
        Description:

        TPS performance measurement test with levelDB and TLS.
        - This scenario launches a network, as defined below,
          and runs two tests - for invokes, and for queries -
          on single host using networkLauncher (after removing
          any existing network and artifacts).

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org,
          1 Channel, 1 chaincode (sample_cc), 4 threads, TLS enabled

        Part 1: FAB-3807
        - Use PTE in Stress Mode to continuously send INVOKE
          transactions concurrently to 1 peer in both orgs,
        - Ensure events are raised for each Tx (indicating
          each was written to ledger)

        Part 2: FAB-3835
        - Same as Part 1 - but use QUERY instead of INVOKE

        Part 3: Count TXs and calculate results for both testcases in this scenario

        Logs Artifacts Locations, PTE Testcase Logs:
            fabric-test/tools/PTE/CITest/Logs/FAB-3807-4i-pteReport.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3807-4i-<MMDDHHMMSS>.log
            fabric-test/tools/PTE/CITest/Logs/FAB-3835-4q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-3807-4i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed with non-zero exit code; check for errors in fabric-test/tools/PTE/CITest/Logs/")
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # First check if the test finished and created the report file; then check it for accurate counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3807-4i-pteReport.log", logfilelist)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 40000 received 40000\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 40000 timeout 0 unreceived 0\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 40000 received 40000\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)


