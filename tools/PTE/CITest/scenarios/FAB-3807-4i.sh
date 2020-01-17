#!/bin/bash -e

#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

./run_scenarios.sh -a samplejava -n FAB-3807-4i -p FAB-3835-4q -i FAB-3807-4i -q FAB-3835-4q
