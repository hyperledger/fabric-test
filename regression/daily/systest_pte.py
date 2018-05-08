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

scenarios_directory = '../../fabric-sdk-node/test/PTE/CITest/scenarios'

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

        Logs Artifacts Locations:
        - Scenario ResultLogs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/scenarios/result_FAB-3833-2i.log
        - PTE Testcase Logs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3833-2i-<MMDDHHMMSS>.log
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3810-2q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario, including both the invokes and query tests.
        # We do these two testcases together in this one test scenario, with
        # one network, because the query test needs to query all those same
        # transactions that were done with the invokes.
        returncode = subprocess.call("./FAB-3833-2i.sh",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; check for errors in fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/")

        # Check the result log file for one line of output from every peer
        # that is used for traffic, since those are the peers (typically
        # one per org) from which we will collect stats of the number of
        # TX written to the ledger. The summary line should contain
        #     "Channel: all, tx Num: <number>,"
        # This testcase uses one channel, one thread per channel, on one peer
        # of each org (total 2 threads). Since all peers are joined to all
        # channels, then all the TX in all threads will be received and written
        # to the ledgers on all peers. Since each thread sends 10000,
        # then the total tx Num for all channels on each peer is 20000.
        # For most typical tests, compute the per-peer invoke tx number as
        # (#orgs * #chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     2*1*1*1*10000=20000
        # and the expected count of occurances will be the number of orgs:
        #     2
        invokeTxSucceeded = subprocess.check_output(
                "grep -c \"Channel: all, tx Num: 20000,\" result_FAB-3833-2i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(invokeTxSucceeded.strip()), 2)

        # Check the result log file for an output line containing
        # "Total QUERY transaction <number>,"
        # This is seen on the same line as "Aggregate Test Summary".
        # If the query testcase ran to completion and the results were
        # tabulated ok, then we should see one line printed for each
        # chaincode and channel (multiplied by number of threads of each),
        # appended onto the same result_*.log file as the invokes test used.
        # We use an equal number of threads for queries as were used for
        # the accompanying invokes test, above. In this testcase, the total
        # number of threads is 2, each sending 10000 queries.
        # Compute the per-chaincode per-channel query tx number on one peer as
        # (#chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     1*1*1*10000=10000
        # and compute the count of occurances as (#orgs * #threads per org * #channels):
        #     2*1*1=2
        queryTxSucceeded = subprocess.check_output(
                "grep -c \"Total QUERY transaction 10000,\" result_FAB-3833-2i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(queryTxSucceeded.strip()), 2)

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

        Logs Artifacts Locations:
        - Scenario ResultLogs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/scenarios/result_FAB-3832-4i.log
        - PTE Testcase Logs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3832-4i-<MMDDHHMMSS>.log
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3834-4q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario, including both the invokes and query tests.
        # We do these two testcases together in this one test scenario, with
        # one network, because the query test needs to query all those same
        # transactions that were done with the invokes.
        returncode = subprocess.call("./FAB-3832-4i.sh",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; check for errors in fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/")

        # (#orgs * #chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     2*1*1*2*10000=40000
        # and the expected count of occurances will be the number of orgs:
        #     2
        invokeTxSucceeded = subprocess.check_output(
                "grep -c \"Channel: all, tx Num: 40000,\" result_FAB-3832-4i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(invokeTxSucceeded.strip()), 2)

        # (#chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     1*1*2*10000=20000
        # and compute the count of occurances as (#orgs * #threads per org * #channels):
        #     2*1*1=2
        queryTxSucceeded = subprocess.check_output(
                "grep -c \"Total QUERY transaction 20000,\" result_FAB-3832-4i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(queryTxSucceeded.strip()), 2)




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

        Logs Artifacts Locations:
        - Scenario ResultLogs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/scenarios/result_FAB-3808-2i.log
        - PTE Testcase Logs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3808-2i-<MMDDHHMMSS>.log
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3811-2q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario, including both the invokes and query tests.
        # We do these two testcases together in this one test scenario, with
        # one network, because the query test needs to query all those same
        # transactions that were done with the invokes.
        returncode = subprocess.call("./FAB-3808-2i.sh",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; check for errors in fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/")

        # (#orgs * #chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     2*1*1*1*10000=20000
        # and the expected count of occurances will be the number of orgs:
        #     2
        invokeTxSucceeded = subprocess.check_output(
                "grep -c \"Channel: all, tx Num: 20000,\" result_FAB-3808-2i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(invokeTxSucceeded.strip()), 2)

        # (#chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     1*1*1*10000=10000
        # and compute the count of occurances as (#orgs * #threads per org * #channels):
        #     2*1*1=2
        queryTxSucceeded = subprocess.check_output(
                "grep -c \"Total QUERY transaction 10000,\" result_FAB-3808-2i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(queryTxSucceeded.strip()), 2)

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

        Logs Artifacts Locations:
        - Scenario ResultLogs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/scenarios/result_FAB-3807-4i.log
        - PTE Testcase Logs:
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3807-4i-<MMDDHHMMSS>.log
            fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/FAB-3835-4q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario, including both the invokes and query tests.
        # We do these two testcases together in this one test scenario, with
        # one network, because the query test needs to query all those same
        # transactions that were done with the invokes.
        returncode = subprocess.call("./FAB-3807-4i.sh",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; check for errors in fabric-test/fabric-sdk-node/test/PTE/CITest/Logs/")

        # (#orgs * #chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     2*1*1*2*10000=40000
        # and the expected count of occurances will be the number of orgs:
        #     2
        invokeTxSucceeded = subprocess.check_output(
                "grep -c \"Channel: all, tx Num: 40000,\" result_FAB-3807-4i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(invokeTxSucceeded.strip()), 2)

        # (#chaincodes * #channels * #threads per org * 10,000 TX per thread):
        #     1*1*2*10000=20000
        # and compute the count of occurances as (#orgs * #threads per org * #channels):
        #     2*1*1=2
        queryTxSucceeded = subprocess.check_output(
                "grep -c \"Total QUERY transaction 20000,\" result_FAB-3807-4i.log",
                cwd=scenarios_directory, shell=True)
        self.assertEqual(int(queryTxSucceeded.strip()), 2)
