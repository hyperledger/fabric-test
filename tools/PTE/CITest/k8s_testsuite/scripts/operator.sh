#!/bin/bash -e
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
#
if [ -f /tmp/nws.txt ]; then
   nws=$(cat /tmp/nws.txt)
fi
while getopts ":f:a:t:pci" opt;
  do
    case $opt in
      a) # action with up/down
        action="${OPTARG}"
        ;;
      t)  # Execute test case
        testCase="${OPTARG}"
        ;;
      p)  # install npm node modules
        preReq="y"
        ;;
      c)  # Create channel & join
        createc="y"
        ;;
      i)  # Install & Instantiate
        insta="y"
        ;;
      f)  # network spec file
        nws="${OPTARG}"
        echo "$nws" > /tmp/nws.txt
        ;;
      \?)
        echo "Error: Unrecognized command line argument:"
        exit 1
        ;;
    esac
done

# common test directories
CurrentDirectory=$(cd `dirname $0` && pwd)
FabricTestDir="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-test"
OperatorDir="$FabricTestDir"/tools/operator
PTEDir="$FabricTestDir"/tools/PTE
LogsDir="$FabricTestDir"/tools/PTE/CITest/Logs
ConnProfile=CITest/CIConnProfiles/test-network
Chantxpath="github.com/hyperledger/fabric-test/fabric/internal/cryptogen/ordererOrganizations"

# Create Logs directory
mkdir -p "$LogsDir"

startNw() {
  # Create fabric network on k8s cluster
  cd "$OperatorDir"/launcher || exit 1
  # export kubeconfig file to KUBECONFIG
  go run launcher.go -i "$PTEDir"/CITest/k8s_testsuite/networkSpecFiles/"$1" -k "$KUBECONFIG"
  # list k8s pods
  kubectl get pods
  cd "$FabricTestDir"/fabric/internal/cryptogen || exit 1
  ls
  mkdir -p ordererOrganizations
  # Delete default connection profile to avoid reading this file for k8s tests
  rm -f ../../../tools/PTE/CITest/CIConnProfiles/test-network/config.yaml
  # Copy connection profile to sub directories under PTE (PTE script appends connection profile to PTE directory)
  cp -r connection-profile/*.* ../../../tools/PTE/CITest/CIConnProfiles/test-network/
  # Copy channel-artifacts to satisfy the default path of genconfig
  cp -r channel-artifacts/*.* ordererOrganizations/
  ls "$FabricTestDir"/fabric/internal/cryptogen/ordererOrganizations
  cd -
}

# Stop Network
stopNw() {
  ArchiveLogsDir="$FabricTestDir"/regression/systemtest/PTELogs

  cd "$OperatorDir"/launcher || exit 1
  # provide networkspec 1 and kubeconfig 1 here
  go run launcher.go -i "$PTEDir"/CITest/k8s_testsuite/networkSpecFiles/"$1" -k "$KUBECONFIG" -a down
  # list k8s pods
  kubectl get pods
  rm -f /tmp/nws.txt
  # Create Archive Directory for CI
  mkdir -p "$ArchiveLogsDir"
  # Copy logs into networkspec directory
  cp -r "$LogsDir" "$ArchiveLogsDir"/"$2" || true
  # Remove Logs directory
  rm -rf "$LogsDir"
  cd -
}

# install npm node modules
npmInstall() {
  cd "$PTEDir" || exit 1
  npm install
}

# create/join channel
createJoinChannel() {
  sleep 10
  cd "$PTEDir/CITest/scripts" || exit 1
  echo "-------> Create & Join Channel"
  export hfc_logging='{"debug":"console"}'
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 5 --chan0 0 --chantxpath "$Chantxpath" --tls "$1" --chanprefix testorgschannel --norg 4 -c > "$LogsDir"/"$2"_createChannel.log
  sleep 30
}

# install/instantiate chaincode: samplecc samplejs marbles02
installInstantiate() {
  cd "$PTEDir/CITest/scripts" || exit 1
  # Install and Instantiate chaincode
  echo "-------> Install & Instantiate Chaincode"
  export hfc_logging='{"debug":"console"}'
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 5 --chan0 0 --chantxpath "$Chantxpath" --chanprefix testorgschannel --norg 4 --tls "$1" -a sample_cc sample_js -i > "$LogsDir"/"$2"_installInstantiate.log
  sleep 60
}

# Execute samplecc(go) chaincode 2 channel with 2 threads send 4000 tx's to OrgAnchors
samplecc_go_2chan() {
  # Execute Test Case
  cd "$PTEDir"/CITest/scripts || exit 1
  echo "-------> Execute Invoke"
  export hfc_logging='{"debug":"console"}'
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 2 --chan0 0 --norg 2 --chanprefix testorgschannel --chantxpath "$Chantxpath" --tls "$1" --payloadmin 0 --payloadmax 1024 -a sample_cc --freq 100 --nreq 1000 --nproc 2 --targetpeers ORGANCHOR -t move > "$LogsDir"/"$2"_samplecc_go_2chan_i.log
  sleep 30
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplecc_go_2chan_i_pteReport.txt
  node get_pteReport.js "$LogsDir"/samplecc_go_2chan_i_pteReport.txt
  rm -f "$PTEDir"/pteReport.txt
  echo "-------> Execute Query"
  export hfc_logging='{"debug":"console"}'
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 2 --chan0 0 --norg 2 --chanprefix testorgschannel --chantxpath "$Chantxpath" --tls "$1" -a sample_cc --freq 100 --nreq 1000  --nproc 2 --targetpeers ORGANCHOR -t query > "$LogsDir"/"$2"_samplecc_go_2chan_q.log
  sleep 30
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplecc_go_2chan_q_pteReport.txt
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/samplecc_go_2chan_q_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
}

# Execute samplejs(node) chaincode 2 channels with 2 threads send 4000 tx's to OrgAnchors
samplejs_node_2chan() {
  cd "$PTEDir"/CITest/scripts || exit 1
  echo "-------> Execute Invoke"
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 2 --chan0 0 --norg 2 --chantxpath "$Chantxpath" --chanprefix testorgschannel --tls "$1" --payloadmin 1024 --payloadmax 10240 -a sample_js --freq 100 --nreq 1000 --nproc 2 --targetpeers ORGANCHOR -t move > "$LogsDir"/"$2"_samplejs_node_2chan_i.log
    cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplejs_node_2chan_i_pteReport.txt
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/samplejs_node_2chan_i_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
  sleep 30
  echo "-------> Execute Query"
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 2 --chan0 0 --norg 2 --chantxpath "$Chantxpath" --chanprefix testorgschannel --tls "$1" -a sample_js --freq 100 --nreq 1000  --nproc 2 --targetpeers ORGANCHOR -t query > "$LogsDir"/"$2"_samplejs_node_2chan_q.log
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplejs_node_2chan_q_pteReport.txt
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/samplejs_node_2chan_q_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
}

# Execute sbe chaincode 2 channels (testorgschannel3 and testorgschannel4) with an endorsement policy enabled
# Send tx's to list of peers (one peer in each org with 4 orgs)
sbecc_go_2chan_endorse() {

  cd "$PTEDir" || exit 1
  echo "-------> Install SBE chaincode"
  ./pte_driver.sh CITest/FAB-11615-2i/preconfig/sbe_cc/runCases-chan-install-TLS.txt >& "$LogsDir"/"$2"_sbeinstall.log
  sleep 30
  echo "-------> Instantiate SBE chaincode"
  ./pte_driver.sh CITest/FAB-11615-2i/preconfig/sbe_cc/runCases-chan-instantiate-TLS.txt >& "$LogsDir"/"$2"_sbeInstantiate.log
  sleep 60
  echo "-------> Invoke"
  ./pte_driver.sh CITest/FAB-11615-2i/sbe_cc/runCases-constant-iVal-TLS.txt >& "$LogsDir"/"$2"_sbecc_go_2chan_endorse_i.log
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/sbecc_go_2chan_endorse_i_pteReport.txt
  cd CITest/scripts
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/sbecc_go_2chan_endorse_i_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
}

# Execute samplecc(go) chaincode 2 channel with 2 threads for 12hrs
samplecc_go_12hr() {
  cd "$PTEDir"/CITest/scripts || exit 1
  echo "-------> Execute Invoke"
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 2 --chan0 0 --norg 2 --chanprefix testorgschannel --chantxpath "$Chantxpath" --tls "$1" --payloadmin 0 --payloadmax 1024 -a sample_cc --freq 100 --rundur 43200 --nproc 2 --targetpeers ORGANCHOR -t move > "$LogsDir"/"$2"_samplecc_go_2chan_12hr_i.log
  sleep 30
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplecc_go_2chan_12hr_i_pteReport.txt
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/samplecc_go_2chan_12hr_i_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
}

# Execute samplecc(go) chaincode 2 channel with 2 threads on 8MB TX size
# Note: the TX is about double the size of the proposal payload because the TX includes the proposal payload PLUS the proposal response which itself contains the ReadWriteSet (including a copy of the original payload).
samplecc_go_8MB_TX() {
  cd "$PTEDir"/CITest/scripts || exit 1
  echo "-------> Execute Invoke"
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 2 --chan0 0 --norg 2 --chanprefix testorgschannel --chantxpath "$Chantxpath" --tls "$1" --payloadmin 4194304 --payloadmax 4194304 -a sample_cc --freq 1000 --nreq 10 --nproc 1 --targetpeers ORGANCHOR -t move > "$LogsDir"/"$2"_samplecc_go_8MB_i.log
  sleep 30
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplecc_go_8MB_i_pteReport.txt
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/samplecc_go_8MB_i_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
}

# Execute samplecc(go) chaincode 1 channel with 1 thread on 98MB TX size
# Note: the TX is about double the size of the proposal payload because the TX includes the proposal payload PLUS the proposal response which itself contains the ReadWriteSet (including a copy of the original payload).
samplecc_go_98MB_TX() {
  cd "$PTEDir"/CITest/scripts || exit 1
  echo "-------> Execute Invoke"
  ./gen_cfgInputs.sh -d "$ConnProfile" --nchan 1 --chan0 0 --norg 1 --chanprefix testorgschannel --chantxpath "$Chantxpath" --tls "$1" --payloadmin 51380224 --payloadmax 51380224 -a sample_cc --freq 10000 --nreq 1 --nproc 1 --targetpeers ORGANCHOR -t move > "$LogsDir"/"$2"_samplecc_go_98MB_i.log
  sleep 60
  cp -r "$PTEDir"/pteReport.txt "$LogsDir"/samplecc_go_98MB_i_pteReport.txt
  # Convert Test Report into Aggregate summary
  node get_pteReport.js "$LogsDir"/samplecc_go_98MB_i_pteReport.txt
  # remove PTE Report
  rm -f "$PTEDir"/pteReport.txt
}

# Install npm
if [ "$preReq" == "y" ]; then
  npmInstall
fi
# tls value from the networkspec file
tls=$(cat "$nws" | grep tls: | awk '{print $2}')
# strip off the .yaml file extension
nwspec_name=$(cat /tmp/nws.txt | cut -d "/" -f3 | cut -d "." -f1)
case "$action" in
  up)
    echo "Start Network"
    startNw "$nws"
    exit
    ;;
  down)
    echo "Down Network"
    stopNw "$nws" "$nwspec_name"
    exit
    ;;
esac
case "$tls" in
  true)
    echo "tls mode: $tls"
    tls_mode=serverauth
    ;;
  mutual)
    echo "tls mode: $tls"
    tls_mode=clientauth
    ;;
  false)
    echo "tls mode: $tls"
    tls_mode=disabled
    ;;
esac

if [ "$createc" == "y" ]; then
  createJoinChannel "$tls_mode" "$nwspec_name"
fi
if [ "$insta" == "y" ]; then
  installInstantiate "$tls_mode" "$nwspec_name"
fi
# Execute Input testcase
if [ ! -z "$testCase" ]; then
  $testCase "$tls_mode" "$nwspec_name"
fi
