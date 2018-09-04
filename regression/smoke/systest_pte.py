# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import unittest
import subprocess

TEST_PASS_STRING="RESULT=PASS"

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

        Logs Artifacts Locations:
        - Scenario ResultLogs:
            fabric-test/tools/PTE/CITest/scenarios/result_FAB-7929-8i.log
        - PTE Testcase Logs:
            fabric-test/tools/PTE/CITest/Logs/FAB-7929-8i-<MMDDHHMMSS>.log
            fabric-test/tools/PTE/CITest/Logs/FAB-7929-8q-<MMDDHHMMSS>.log
        '''

        # Run the test scenario: launch network and run the invokes and query tests.
        # We do these two testcases together in this one test scenario, with
        # one network, because the query test needs to query all those same
        # transactions that were done with the invokes.
        returncode = subprocess.call("./FAB-7929-8i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; check for errors in fabric-test/tools/PTE/CITest/Logs/")
        # tear down the network, including all the nodes docker containers
        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # Check the result log file for one line of output from every peer
        # that is used for traffic, since those are the peers (typically
        # one per org) from which we will collect stats of the number of
        # TX written to the ledger. The summary line should contain
        #     "Channel: all, tx Num: <number>,"
        # This testcase uses 4 channels, one thread per channel, on one peer
        # of each org (total 8 threads). Since all peers are joined to all
        # channels, then all the TX in all threads will be received and written
        # to the ledgers on all peers. Since each thread sends 100,
        # then the total tx Num for all channels on each peer is 4x200=800.
        # For most typical tests, compute the per-peer invoke tx number as
        # (#orgs * #chaincodes * #channels * #threads per org * 100 TX per thread):
        #     2*1*4*1*100=800
        invokeTxSucceeded = subprocess.check_output(
                "grep \"Channel: all, tx Num: 800,\" result_FAB-7929-8i.log | wc -l",
                cwd=scenarios_directory, shell=True)
        # And the expected count of occurances is the number of orgs:
        #     2
        self.assertEqual(int(invokeTxSucceeded.strip()), 2)

        # Check the result log file for output lines containing string
        # "Total QUERY transaction <number>".
        # This is seen on the same line as "Aggregate Test Summary".
        # We use an equal number of threads for queries as were used for
        # the accompanying invokes test, above. In this testcase, the total
        # number of threads is 8, each sending 100 queries. However, note
        # only 2 threads (i.e. one per each org) are used for each channel.
        # Compute the per-channel query tx number (which is the same number
        # for every channel, on every peer) as follows.
        # Note: if your test selects AllPeers instead of AnchorPeer, then
        # multiply by the number of peers per org (since all are used for
        # endorsements, rather than just one, which means more tx threads are used).
        # ( #ChainCodesPerChan * #Orgs * #nProcPerOrg *
        #   #PeersPerOrgUsedForEndorsements * 100 TX per thread)
        #     1*2*1*1*100=200
        queryTxSucceeded = subprocess.check_output(
                "grep \"Total QUERY transaction 200 received 200,\" result_FAB-7929-8i.log | wc -l",
                cwd=scenarios_directory, shell=True)
        # When the query testcase runs to completion and the results are
        # tabulated ok, then we should see one line printed for each
        # chaincode and channel combination, i.e. for each "[PTE n main]",
        # appended onto the same result_*.log file as the invokes test used.
        # Compute the count of occurances as (#chaincodes * #channels):
        #     1*4=4
        self.assertEqual(int(queryTxSucceeded.strip()), 4)

