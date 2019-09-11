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

        # We should see a logfile created
        returncode = subprocess.call("ls FAB-7204-4i_*.log", cwd=logs_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed to run; cannot find log file fabric-test/tools/PTE/CITest/Logs/FAB-7204-4i_*.log")

        # We should see "pte-main:completed" in the PTE output log
        # exactly once for each test driver that completes successfully.
        # For this testcase, there are two drivers, as defined in
        # PTE/CITest/FAB-7204-4i/samplejs/PTEMgr-FAB-7204-4i-TLS.txt
        # Thus we must assert 2.
        mainCompleted = subprocess.check_output(
                "grep \"pte-main:completed:\" FAB-7204-4i_*.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(mainCompleted.strip()), 2)

        # We should also see "pte-exec:completed" for each thread.
        # (There could actually be more than one per thread.)
        # Ensure we can grep at least one as a sanity check.

        returncode = subprocess.call(
                "grep \"pte-exec:completed\" FAB-7204-4i_*.log",
                cwd=logs_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; threads did not complete; check for errors in fabric-test/tools/PTE/CITest/Logs/FAB-7204-4i_*.log")

        # check if the test finished and created the report file; then check it for accurate counts
        logfilelist = subprocess.check_output("ls", cwd=logs_directory, shell=True)
        self.assertIn("FAB-7204-4i-pteReport.log", logfilelist, msg="Test did not finish; fabric-test/tools/PTE/CITest/Logs/FAB-7204-4i-pteReport.log file not found")

        # ensure the summary report lines were generated, including the line listing the invoke failures
        returncode = subprocess.call(
                "grep \"INVOKE Overall failures:\" FAB-7204-4i-pteReport.log",
                cwd=logs_directory, shell=True)
        self.assertEqual(returncode, 0, msg="Test Failed; pteReport does not contain expected output summary lines; check for errors in fabric-test/tools/PTE/CITest/Logs/FAB-7204-4i*.log")

        # ensure there were no failures with the proposals (responses from peers) or the transactions (responses from orderers)
        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall failures: proposal 0 transactions 0\" FAB-7204-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg="Test Failed: INVOKE failures; refer to fabric-test/tools/PTE/CITest/Logs/FAB-7204-4i*.log for details")

        count = subprocess.check_output(
                "grep \"CONSTANT INVOKE Overall TEST RESULTS PASSED\" FAB-7204-4i-pteReport.log | wc -l",
                cwd=logs_directory, shell=True)
        self.assertEqual(int(count.strip()), 1, msg="TEST RESULTS FAILED; refer to fabric-test/tools/PTE/CITest/Logs/FAB-7204-4i*.log for details")

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
        # Test Summary Report in the output file, FAB-7204-4i-pteReport.log.
        # Note: we do expect each thread to send SIMILAR numbers of TXs.
