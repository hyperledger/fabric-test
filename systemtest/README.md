# Daily Test Suite

- How to Run the Tests
- Where to View the Results produced by the daily automation tests
- Where to Find Existing Tests
- How to Add New Tests to the Automated Test Suite
  * Why Test Output Format Must Be **xml** and How to Make It So

## How to Run the Tests, and Where to View the Results

The script [runPteTestSuite.sh](./runPteTestSuite.sh) invokes a set of traffic tests using PTE. You can manually execute this in its entirety via the command line, or you may simply view the results generated daily by an automated Continuous Improvement (CI) tool. Reports are displayed on the [Results Page](https://dev.azure.com/Hyperledger/Fabric-Test/_build/results?buildId=5968&view=results).

#### Where to Find Existing Tests

Examine the driver scripts to find the individual tests, which are actually stored in several locations under */path/to/fabric-test/*. Some tests are located in test suite subdirectories such as

- *fabric-test/regression/smoke/* - simple tests used for Verify jobs
- *fabric-test/regression/daily/* - tests used in automated test suites

whereas other tests are located in the tools directories themselves, such as

- *fabric-test/tools/PTE/* - Performance Traffic Engine **(PTE)** tool and tests
- *fabric-test/tools/operator/* - Operator: Launcher, Network Client, Test Client, testdata/ with network-spec.yml config files and test-input.yml tests

Each testcase title should provide the test objective and a Jira FAB issue which can be referenced for more information. Test steps and specific details can be found in the summary comments of the test scripts themselves. Additional information can be found in the README files associated with the various test directories.

## How to Add New Tests to the Automated Test Suite

We love contributors! Anyone may add a new test to an existing test driver script, or even create a new tool and new test driver script. First, a few things to note:

- Before linking a test case into the CI automation tests, please merge your (tool and) testcase into github, and create a Jira task, as follows:

  1. First merge your tool and tests to github in appropriate folders under */path/to/fabric-test/*.
  1. Of course, all tests must pass before being submitted. We do not want to see any false positives for test case failures.
  1. To integrate your new tests into the CI automation test suite, create a new Jira task FAB-nnnnn for each testcase.
  1. Use this new Jira task to submit a changeset to github, to invoke your testcase from a driver script similar to */path/to/fabric-test/regression/daily/runPteTestSuite.sh. In the comments of the github merge request submission, include the
      - Jira task FAB-nnnnn
      - the testcase title and objective
  1. Follow the steps below to include the test in a test suite that is executed from the Makefile by a daily test job, and the test will be executed automatically as part of the next running of the CI daily test suite. The results will show up on the daily test suite display board - which can be viewed by following the link at the top of the main [fabric-test/README](https://github.com/hyperledger/fabric-test/blob/master/README.md).

#### Why Test Output Format Must Be **xml** and How to Make It So

The Continuous Improvement (CI) team utilizes a Jenkins job to execute the full test suite, *runDailyTestSuite.sh*. The CI job consumes xml output files, creates reports, and displays them. **Note:** When adding new scripts that generate new xml files, if you do not see the results displayed correctly, please contact us on [Rocket.Chat channel #fabric-ci](https://chat.hyperledger.org). For this reason, we execute tests by invoking the individual testcase from within a test driver script in *regression/daily/*, such as runPteTestSuite.sh which uses ginkgo to execute golang test drivers in this directory, including pte_daily_suite_test.go, and generates the xml.

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
s
