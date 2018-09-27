# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import unittest
import subprocess

TEST_PASS_STRING="RESULT=PASS"

logs_directory = '../../tools/PTE/CITest/Logs'
scenarios_directory = '../../tools/PTE/CITest/scenarios'
nl_directory = '../../tools/NL'


class PTE_Functions(unittest.TestCase):

    def test_FAB7929_8i(self):
        '''
        Description:

        Functional and TPS performance measurement test.
        - This scenario launches a network, as defined below,
          and runs two tests - for invokes, and for queries -
          on single host using networkLauncher (after removing
          any existing network and artifacts).

        Network Topology: 3 Ord, 4 KB, 3 ZK, 2 Org, 2 Peers/Org, TLS enabled
          LevelDB, 4 Channels, 1 chaincode (sample_cc), 8 threads total

        Part 1:
        - Use PTE in Constant Stress Mode to continuously send INVOKE
          transactions concurrently to 1 peer in both orgs,
          for each of the 4 channels (8 threads total, each
          send 100 transaction proposals)
        - Register a listener to receive an event for each
          Block (not per transaction) per
          Channel (full block events - not filtered blocks)
        - Count TXs and ensure events are received for each one (indicating
          each was written to ledger successfully) and calculate TPS results

        Part 2:
        - QUERY all the invoked transactions
        - Count successes and calculate TPS results

        Logs Artifacts Locations, PTE Testcase Logs:
            fabric-test/tools/PTE/CITest/Logs/FAB-7929-8i-pteReport.log
            fabric-test/tools/PTE/CITest/Logs/FAB-7929-8i-<MMDDHHMMSS>.log
            fabric-test/tools/PTE/CITest/Logs/FAB-7929-8q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        # We do these two testcases together in this one test scenario, with
        # one network, because the query test needs to query all those same
        # transactions that were done with the invokes.
        returncode = subprocess.call("./FAB-7929-8i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed with non-zero exit code; check for errors in fabric-test/tools/PTE/CITest/Logs/")
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # Check log file for the expected output lines.
        #
        # Output Summary should include lines like these for the Invokes portion of the test:
        #    CONSTANT INVOKE Overall number of PTE: 4
        #    CONSTANT INVOKE Overall processes: 8
        #    CONSTANT INVOKE Overall transactions: sent 800 received 800
        #    CONSTANT INVOKE Overall failures: proposal 0 transactions 0
        #    CONSTANT INVOKE Overall event: received 800 timeout 0 unreceived 0
        #    CONSTANT INVOKE Overall time: start 1536676220165 end 1536676228702 duration 8537
        #    CONSTANT INVOKE Overall CONSTANT INVOKE TPS 93.71
        #    CONSTANT INVOKE Overall latency summary
        #        CONSTANT INVOKE Overall proposals latency 800 min 4 ms max 178ms avg 19.35 ms
        #        CONSTANT INVOKE Overall transactions latency 800 min 5 ms max 158 ms avg 44.10 ms
        #        CONSTANT INVOKE Overall events latency 800 min 468 ms max 3097 ms avg 1652.28 ms
        #
        # Output Summary should include lines like these for the Query portion of the test:
        #    CONSTANT QUERY Overall number of PTE: 4
        #    CONSTANT QUERY Overall processes: 8
        #    CONSTANT QUERY Overall transactions: sent 800 received 800 failures 0
        #    CONSTANT QUERY Overall time: start 1536676374892 end 1536676376872 duration 1980
        #    CONSTANT QUERY Overall CONSTANT QUERY TPS 404.04

        # First check if the test finished and created the report file; then check it for accurate counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-7929-8i-pteReport.log", logfilelist)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 800 received 800\" FAB-7929-8i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-7929-8i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 800 timeout 0 unreceived 0\" FAB-7929-8i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 800 received 800 failures 0\" FAB-7929-8i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1)

