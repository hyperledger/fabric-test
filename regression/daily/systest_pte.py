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

logs_directory = '../../tools/PTE/CITest/Logs'
scenarios_directory = '../../tools/PTE/CITest/scenarios'
nl_directory = '../../tools/NL'

# error messages
testScriptFailed =      "Test Failed with non-zero exit code; check for errors in fabric-test/tools/PTE/CITest/Logs/"
noTxSummary =           "Error: pteReport.log does not contain INVOKE Overall transactions"
invokeFailure =         "Error: incorrect number of INVOKE transactions sent or received"
invokeSendFailure =     "Error sending INVOKE proposal to peer or sending broadcast transaction to orderer"
eventReceiveFailure =   "Error: event receive failure: INVOKE TX events arrived late after eventOpt.timeout, and/or transaction events were never received"
invokeCheckError =      "Error during invokeCheck: query result error when validating transaction"
queryCountFailure =     "Error: incorrect number of QUERY transactions sent or received"


######################################################################
### COUCHDB
######################################################################

class Perf_Stress_CouchDB(unittest.TestCase):

    #@unittest.skip("skipping")
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
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3833-2i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 20000 received 20000\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 20000 timeout 0 unreceived 0\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 20000 received 20000 failures 0\" FAB-3833-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)


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
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3832-4i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 40000 received 40000\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 40000 timeout 0 unreceived 0\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 40000 received 40000 failures 0\" FAB-3832-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)


    def test_FAB6813_4i_marbles_FAB8199_4q_FAB8200_4q_FAB8201_4q(self):
        '''
        Description:

        Launch standard network with couchdb using 1 channel and marbles02 cc.
            FAB-6813-4i 4 threads x 1000 invokes (initMarble)
        followed by three sets of queries:
            FAB-8199-4q: 4 threads queries: readMarble
            FAB-8200-4q: 4 threads rich queries: queryMarblesByOwner
            FAB-8201-4q: 4 threads rich queries: queryMarbles

        This test uses indexing for the rich queries, by including a metadataPath
        for index files during the install step. This is the only difference between
        this and FAB8192, which does not use indexing for the queries and runs much slower.
        '''

        # Run the test scenario: launch network and run the tests
        returncode = subprocess.call("./FAB-6813-4i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if logfiles were created and contain the desired output, and check counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)

        # FAB-6813-4i
        self.assertIn("FAB-6813-4i_", logfilelist)
        self.assertIn("FAB-6813-4i-pteReport.log", logfilelist)

        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-6813-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 4000 received 4000\" FAB-6813-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-6813-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 4000 timeout 0 unreceived 0\" FAB-6813-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)
        # invokeCheck - verify there were no errors from query requests
        # in the detailed pte output log (note: the underscore in the log filename)
        count = subprocess.check_output(
                "grep \"query result: Error:\" FAB-6813-4i_*.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 0, msg=invokeCheckError)

        # FAB-8199-4q
        self.assertIn("FAB-8199-4q-pteReport.log", logfilelist)
        count = subprocess.check_output(
                "grep \"QUERY Overall transactions:\" FAB-8199-4q-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)
        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 4000 received 4000 failures 0\" FAB-8199-4q-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)

        # FAB-8200-4q
        self.assertIn("FAB-8200-4q-pteReport.log", logfilelist)
        count = subprocess.check_output(
                "grep \"QUERY Overall transactions:\" FAB-8200-4q-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)
        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 4000 received 4000 failures 0\" FAB-8200-4q-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)

        # FAB-8201-4q
        self.assertIn("FAB-8201-4q-pteReport.log", logfilelist)
        count = subprocess.check_output(
                "grep \"QUERY Overall transactions:\" FAB-8201-4q-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)
        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 4000 received 4000 failures 0\" FAB-8201-4q-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)


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
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3808-2i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 20000 received 20000\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 20000 timeout 0 unreceived 0\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 20000 received 20000 failures 0\" FAB-3808-2i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)


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
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-3807-4i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 40000 received 40000\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 40000 timeout 0 unreceived 0\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 40000 received 40000 failures 0\" FAB-3807-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)


    def test_FAB7329_4i_channel_events(self):
        '''
        Description:

        FAB-7329 channel events, 1 ch NodeJS cc, 4 thrds x 10000
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-7329-4i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-7329-4i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-7329-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 40000 received 40000\" FAB-7329-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-7329-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 40000 timeout 0 unreceived 0\" FAB-7329-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        # There is no separate test step for queries. After each thread finishes all invokes,
        # it uses the invokeCheck capability (with default settings for the invokeCheckOpt options)
        # to query and validate the last invoke sent. The only thing we can do is check the PTE
        # output log file for errors; if none then can assume the query worked and all is good.
        # (Note the underscore in the log file name; this means we are looking for errors in the
        # pte output log, not the pteReport.log file. The '*' represents a timestamp.)
        count = subprocess.check_output(
                "grep \"query result: Error:\" FAB-7329-4i_*.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 0, msg=invokeCheckError)


    def test_FAB7333_4i_filtered_block_events(self):
        '''
        Description:

        FAB-7333 filtered block events, 1 ch NodeJS cc, 4 thrds x 10000
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-7333-4i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-7333-4i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-7333-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall transactions: sent 40000 received 40000\" FAB-7333-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-7333-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall event: received 40000 timeout 0 unreceived 0\" FAB-7333-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        # There is no separate test step for queries. After each thread finishes all invokes,
        # it uses the invokeCheck capability (with default settings for the invokeCheckOpt options)
        # to query and validate the last invoke sent. The only thing we can do is check the PTE
        # output log file for errors; if none then can assume the query worked and all is good.
        # (Note the underscore in the log file name; this means we are looking for errors in the
        # pte output log, not the pteReport.log file. The '*' represents a timestamp.)
        count = subprocess.check_output(
                "grep \"query result: Error:\" FAB-7333-4i_*.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 0, msg=invokeCheckError)


    def test_FAB7647_1i_latency(self):
        '''
        Description:

        FAB-7647-1i.sh latency for single thread, 1 transaction at a time sequentially, batchsize 1
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        returncode = subprocess.call("./FAB-7647-1i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg=testScriptFailed)
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # check if the test created the report file
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-7647-1i-pteReport.log", logfilelist)

        # check if the test finished and printed the Overall summary
        count = subprocess.check_output(
                "grep \"INVOKE Overall transactions:\" FAB-7647-1i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=noTxSummary)

        # check the counts
        count = subprocess.check_output(
                "grep \"LATENCY INVOKE Overall transactions: sent 10000 received 10000\" FAB-7647-1i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeFailure)

        count = subprocess.check_output(
                "grep \"LATENCY INVOKE Overall failures: proposal 0 transactions 0\" FAB-7647-1i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=invokeSendFailure)

        count = subprocess.check_output(
                "grep \"LATENCY INVOKE Overall event: received 10000 timeout 0 unreceived 0\" FAB-7647-1i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=eventReceiveFailure)

        # Check the query counts, which are in the one and the same FAB-7647-1i-pteReport.log.
        # Note: A latency test for QUERY uses Constant transMode. ("Latency" does not work.)
        # PTE normally waits for a query response before sending the next query. Someday,
        # if we were to change PTE behavior to "send and forget", for higher throughput,
        # then we would have to also tweak this testcase to properly support a true
        # latency transMode for Query transactions.
        count = subprocess.check_output(
                "grep \"CONSTANT QUERY Overall transactions: sent 10000 received 10000 failures 0\" FAB-7647-1i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg=queryCountFailure)


