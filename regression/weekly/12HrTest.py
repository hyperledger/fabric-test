# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

######################################################################
# To execute:
# Install: sudo apt-get install python python-pytest
# Run on command line: py.test -v --junitxml results.xml ./12HrTest.py

import unittest
import subprocess

scenarios_directory = '../../tools/PTE/CITest/scenarios'
nl_directory = '../../tools/NL'
logs_directory = '../../tools/PTE/CITest/Logs'

class TimedRun_12Hr(unittest.TestCase):
    #@unittest.skip("skipping")
    def test_FAB_7204_samplejsCC_2chan_x_2_x_10tps(self):
        # Assert and confirm that the sh script finished and exited cleanly,
        # else suggest where to find the logs
        returncode = subprocess.call("./FAB-7204-4i.sh", cwd=scenarios_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; check for errors in fabric-test/tools/PTE/CITest/Logs/")

        returncode = subprocess.call("./networkLauncher.sh -a down", cwd=nl_directory, shell=True)

        # We should see "pte-main:completed" in the PTE output log
        # exactly once for each test driver that completes successfully.
        # For this testcase, there are two drivers, as defined in
        # PTE/CITest/FAB-7204-4i/samplejs/PTEMgr-FAB-7204-4i-TLS.txt
        # Thus we must assert 2.
        allThreadsCompleted = subprocess.check_output(
                "grep \"pte-main:completed:\" FAB-7204-4i*.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(allThreadsCompleted.strip()), 2)

        # Since all threads completed, we know the output logfile must contain a line
        # for each thread, containing "pte-exec:completed". (There could actually
        # be many lines with pte-exec:completed, more than one per thread.) We
        # can determine if the test PASSED (which is better than merely completed)
        # if we received a notification event for every transaction sent); this
        # means there can be no errors or timeouts. We know the test passed if
        # there is NO trailing colon with suffix string, such as:
        #     pte-exec:completed:error
        #     pte-exec:completed:timeout
        threadsWithProblems = subprocess.check_output(
                "grep \"pte-exec:completed:\" FAB-7204-4i*.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(threadsWithProblems.strip()), 0)

        # Note: grep command returns exit code 1 whenever the grepped count is
        # zero, which would cause a CallProcessError and prevent us from
        # reaching the assertion statement. Since we are hoping for a zero
        # count, instead we must pipe the grep result to 'wc -l', a wordcounter
        # command which correctly returns an exit code 0 whenever the command
        # completes successfully, including if the linecount is zero

        # Note: This test uses runDur parameter to specify a run duration,
        # rather than specifying a specific number of transactions to send.
        # Consequently, we cannot do further checks (as done with some other
        # testcases) to verify exact transaction totals, since we cannot know
        # exactly how many to expect. The only additional thing a tester
        # could do is to manually look for reasonable numbers in the
        # Test Summary Report in the output file, result_FAB-7204-4i.log.
        # Note: we do expect each thread to send SIMILAR numbers of TXs.
