#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

import os
import sys
import datetime
import subprocess
import compose_util

def changeFormat(value):
    '''
    Here is the function that returns by changing the format of time. For example 'Seconds' to "s"
    '''
    changedString = value
    toChangeUnits = value.split(" ")
    if len(toChangeUnits) == 2:
       if "minute" in toChangeUnits[1]:
           changedString = toChangeUnits[0]+"m"
       elif "second" in toChangeUnits[1]:
           changedString = toChangeUnits[0]+"s"
       elif "hour" in toChangeUnits[1]:
           changedString = toChangeUnits[0]+"h"
    return changedString

def convertBoolean(boolean):
    return str(boolean).lower()

def enableTls(context, tlsEnabled):
    if not hasattr(context, "composition"):
        context.composition = compose_util.Composition(context, startContainers=False)
    context.composition.environ["ORDERER_GENERAL_TLS_ENABLED"] = convertBoolean(tlsEnabled)
    context.composition.environ["CORE_PEER_TLS_ENABLED"] = convertBoolean(tlsEnabled)

def convertToSeconds(envValue):
    if envValue[-1] == 'm':
        value = 60 * int(envValue[:-1])
    elif envValue[-1] == 's':
        value = int(envValue[:-1])
    elif envValue[-1] == 'h':
        value = 3600 * int(envValue[:-1])
    else:
        raise "'{0}' is not in the expected format".format(envValue)
    return value

def is_in_log(container, keyText):
    rc = subprocess.call(
            "docker logs "+container+" 2>&1 | grep "+"\""+keyText+"\"",
            shell=True)
    if rc==0:
        return True
    return False
