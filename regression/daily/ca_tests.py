#!/usr/bin/python
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

import subprocess
import unittest
from subprocess import check_output

class FabricCaTests(unittest.TestCase):

    def test_FAB6863_BasicCAClustering(self):
        createLog = 'mkdir -p /tmp/logs/FAB6863; chmod 777 /tmp/logs/FAB6863'
        startContainer = 'docker run -v /tmp/logs/FAB6863:/tmp -v $PWD/../../fabric-ca:/opt/gopath/src/github.com/hyperledger/fabric-ca hyperledger/fabric-ca-fvt ./scripts/fvt/cluster_test.sh 4 4 8 128'
        command = createLog + ';' + startContainer
        output = check_output([command], shell=True)
        print output
        self.assertIn('RC: 0, ca_cluster PASSED', output)

    def test_FAB7206_GenCrlWindows(self):
        createLog = 'mkdir -p /tmp/logs/FAB7206; chmod 777 /tmp/logs/FAB7206'
        startContainer = 'docker run -v $PWD/../../tools/CTE/:/tmp/test -v /tmp/logs/FAB7206:/tmp -v $PWD/../../fabric-ca:/opt/gopath/src/github.com/hyperledger/fabric-ca hyperledger/fabric-ca-fvt /tmp/test/crl_test.sh'
        command = createLog + ';' + startContainer
        output = check_output([command], shell=True)
        print output
        self.assertIn('RC: 0, gencrl PASSED', output)
