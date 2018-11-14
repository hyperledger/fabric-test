#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

########## CI test ##########

# Launch network, priming, and invokes
# FAB-6813-4i: 4 threads invokes - initMarble ; using marbles02 couchdb
./run_scenarios.sh -a marbles02 -n FAB-6813-4i -p marbles02-4q -i FAB-6813-4i

# FAB-8199-4q: 4 threads queries - readMarble
./run_scenarios.sh -a marbles02 -q FAB-8199-4q

# FAB-8200-4q: 4 threads rich queries - queryMarblesByOwner
./run_scenarios.sh -a marbles02 -q FAB-8200-4q

# FAB-8201-4q: 4 threads rich queries - queryMarbles
./run_scenarios.sh -a marbles02 -q FAB-8201-4q
