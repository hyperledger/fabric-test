#!/bin/bash
echo 'waiting 30 seconds for network to discover itself'
sleep 30
echo 'Starting Client'
# start the client, we will be in the subdir of regression
node ../../tools/chaos/client/node/dist/app.js &
last_pid=$!
# Give the client time to start
sleep 10

# Start the chaos engine, peer0-org1 is the docker name of the gateway peer
echo 'Starting chaos engine'
node ../../tools/chaos/engine/dist/start.js ./scenarios peer0-org1 random 1200s

echo 'Chaos engine completed, waiting 60 secs before terminating client'
sleep 60
kill -s SIGINT $last_pid
wait $last_pid
client_exit=$?
echo 'Client exited to RC='$client_exit
exit $client_exit