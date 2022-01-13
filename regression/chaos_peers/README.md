This chaos test tries to test the scenario where so long as there are enough peers that are up in the network that everything should work without an issue.

These scenarios are designed for a 3 org, 2 peer network, with a chaincode deployed with a majority endorsement policy and a client from one org going via it's gateway peer.

The client's gateway peer is never killed, peers are killed but there will be enough peers and enough orgs that endorsement should always work.