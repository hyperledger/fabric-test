#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import os
import sys
import datetime
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
    context.composition.environ["ORDERER_GENERAL_TLS_ENABLED"] = "true"
    context.composition.environ["CORE_PEER_TLS_ENABLED"] = "true"
