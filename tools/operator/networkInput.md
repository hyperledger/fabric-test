   # Network Input File

   - Network input file consists of information needed in generating configuration
   files of fabric network and launching it. Many of these values are required;
   those that are optional will default to disabled/false or whatever default
   values used by fabric software. For more information, refer to yaml files in
   <https://github.com/hyperledger/fabric/tree/master/sampleconfig>. Here is
   a sample network input file:

   ```yaml
   fabric_version: 1.4.2
   db_type: couchdb
   peer_fabric_logging_spec: error
   orderer_fabric_logging_spec: error
   tls: true
   metrics: false

   artifacts_location: /home/testuser/go/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/

   orderer:
      orderertype: kafka
      batchsize:
         maxmessagecount: 500
         absolutemaxbytes: 10 MB
         preferredmaxbytes: 2 MB
      batchtimeout: 2s

      etcdraft_options:
         TickInterval: 500ms
         ElectionTick: 10
         HeartbeatTick: 1
         MaxInflightBlocks: 5
         SnapshotIntervalSize: 100 MB

   kafka:
      num_kafka: 5
      num_kafka_replications: 3
      num_zookeepers: 3

   orderer_organizations:
    - name: ordererorg1
      msp_id: OrdererOrgExampleCom
      num_orderers: 1
      num_ca: 1

   peer_organizations:
   - name: org1
     msp_id: Org1ExampleCom
     num_peers: 2
     num_ca: 1
   - name: org2
     msp_id: Org2ExampleCom
     num_peers: 2
     num_ca: 1

   orderer_capabilities:
      V1_4_2: true

   channel_capabilities:
      V1_4_2: true

   application_capabilities:
      V1_4_2: true

   num_channels: 10

   k8s:
      service_type: NodePort
      data_persistence: true
      storage_class: default
      storage_capacity: 20Gi
      resources:
         orderers:
            limits:
               pu: "1"
               memory: 1Gi
            requests:
               cpu: "0.5"
               memory: 1Gi
         peers:
            limits:
               cpu: "0.5"
               memory: 2Gi
            requests:
               cpu: "0.5"
               memory: 2Gi
      #! dind will be used to run all chaincode containers of a peer
         dind:
            limits:
               cpu: "1"
               memory: 1Gi
            requests:
               cpu: "1"
               memory: 1Gi
         couchdb:
            limits:
               cpu: "0.2"
               memory: 1Gi
            requests:
               cpu: "0.1"
               memory: 1Gi
         kafka:
            limits:
               cpu: "0.2"
               memory: 1Gi
            requests:
               cpu: "0.1"
               memory: 1Gi
   ```

   ## Options in Network Input

   ### **fabric_version**

   - Description: Fabric version to be used in launching fabric network.
   If `fabric_version` is given without stable in it, for example: `1.4.2` or
   `latest`, it will use images from `hyperledger/` docker hub.
   If fabric_version is given with stable in the value, it will pull images
   from `nexus3.hyperledger.org:10001/hyperledger/`
   - Supported Values: `1.4.2` or later
   - Example: `fabric_version: 1.4.2`
   `fabric_version: 1.4.2-stable`

   ### **db_type**

   - Description: Peer state ledger type to be used while launching peers
   - Supported Values: couchdb, goleveldb
   - Example: `db_type: couchdb`

   ### **peer_fabric_logging_spec**

   - Description: Desired fabric logging spec to be used for all peers.
   - Supported Values: Refer to <https://hyperledger-fabric.readthedocs.io/en/latest/logging-control.html>
   to set peer fabric logging spec value
   - Example: `peer_fabric_logging_spec: error`
   `peer_fabric_logging_spec: info:lockbasedtxmgr,couchdb,statecouchdb,gossip.privdata=debug`

   ### **orderer_fabric_logging_spec**

   - Description: Desired fabric logging spec to be used for all orderers
   - Supported Values: Refer to <https://hyperledger-fabric.readthedocs.io/en/latest/logging-control.html>
   to set orderer fabric logging spec value
   - Example: `orderer_fabric_logging_spec: info`
   `orderer_fabric_logging_spec: info:policies=debug`

   ### **tls**

   - Description: `tls` is used for server authentication between fabric nodes.
   Set to `true` to enable tls; set to `mutual` to use server-client authentication;
   set to `false` to not enable tls between fabric nodes
   - Supported Values: `true`, `false`, `mutual`
   - Example: `tls: true`

   ### **metrics**

   - Description: `metrics` is used to enable fabric metrics scraping to prometheus
   in kubernetes cluster. To scrape fabric metrics, prometheus has to be launched
   prior to fabric network. Set to `true` to enable scraping of fabric metrics;
   set to `false` to disable scraping of fabric metrics
   - Supported Values: `true`, `false`
   - Example: `metrics: true`

   ### **artifacts_location**

   - Description: `artifacts_location` is used to specify location in local file
   system to which crypto-config, channel-artifacts and connection profiles will be
   saved
   - Supported Values: absolute path to location in your local
   - Example:
   `artifacts_location: /home/testuser/go/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/`

   ### **orderer**

   - Description: `orderer` section is used to define configuration settings for orderer
   system channel

      #### *orderertype*

      - Description: `orderertype` is used to define consensus type to be used in fabric
      network
      - Supported Values: solo, kafka, etcdraft
      - Example: `orderertype: kafka`

      #### *batchsize*

      - Description: `batchsize` section is used to define block settings in fabric
      network

         ##### *maxmessagecount*

         - Description: `maxmessagecount` is used to set maximum messages per block in
         fabric network
         - Supported Values: Integer to set maximum messages allowed in a batch
         - Example: `maxmessagecount: 10`

         ##### absolutemaxbytes

         - Description: `absolutemaxbytes` is used to set absolute maximum number
         of bytes
         allowed for the serialized messages in a batch
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set value for `absolutemaxbytes`
         - Example: `absolutemaxbytes: 10 MB`

         ##### preferredmaxbytes

         - Description: `preferredmaxbytes` is used to set preferred maximum number
         of bytes
         allowed for the serialized messages in a batch
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set value for `preferredmaxbytes`
         - Example: `preferredmaxbytes: 2 MB`

      #### *batchtimeout*

      - Description: `batchtimeout` is used to wait before creating a batch in fabric
      network
      - Supported Values: Value in time units to wait before creating a batch
      - Example: `batchtimeout: 2s`

      #### *etcdraft_options*

      - Description: `etcdraft_options` section is referred and used only when
      `orderertype` is set as `etcdraft`. The following are `etcdfraft` configurations:

         ##### TickInterval

         - Description: `TickInterval` is the time interval between two Node.Tick
         invocations
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set tick interval between raft nodes
         - Example: `TickInterval: 500ms`

         ##### ElectionTick

         - Description: `ElectionTick` is the number of Node.Tick invocations that
         must pass between elections
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set election tick between raft nodes
         - Example: `ElectionTick: 10`

         ##### HeartbeatTick

         - Description: `HeartbeatTick` is the number of Node.Tick invocations that must
         pass between heartbeats
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set heartbeat tick between raft nodes
         - Example: `HeartbeatTick: 1`

         ##### MaxInflightBlocks

         - Description: `MaxInflightBlocks` limits the max number of in-flight append
         messages during optimistic replication phase
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set   maximum inflight blocks between raft nodes
         - Example: `MaxInflightBlocks: 5`

         ##### SnapshotIntervalSize

         - Description: `SnapshotIntervalSize` defines number of bytes per which a
         snapshot is taken
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml> to set   snapshot interval size in raft
         - Example: `SnapshotIntervalSize: 100 MB`

   ### **kafka**

   - Description: `kafka` section is used when `orderertype` as `kafka` and to
   define number of kafka's, number of zookeeper's to be launched and number
   of kafka replications to have in kafka cluster. Refer to
   <https://kafka.apache.org/documentation/> for more information about kafka

      #### *num_kafka*

      - Description: `num_kafka` is used to set number of kafka to be launched
      in fabric network
      - Supported Values: Value to launch number of kafka in fabric network.
      Supports value to be 3 or higher
      - Example: `num_kafka: 5`

      #### *num_kafka_replications*

      - Description: `num_kafka_replications` is used to set
      `KAFKA_DEFAULT_REPLICATION_FACTOR` while launching fabric network
      - Supported Values: Value to set number of kafka replications.
      Value should be <= `num_kafka`
      - Example: `num_kafka_replications: 3`

      #### *num_zookeepers*

      - Description: `num_zookeepers` is used to set number of zookeepers
      to be launched in fabric network
      - Supported Values: Value to launch number of zookeepers in fabric network
      - Example: `num_zookeepers: 3`

   ### **orderer_organizations**

   - Description: `orderer_organizations` section is used to list all orderer
   organizations in fabric network. All orderers in all orderer organizations
   will participate in every channel

      #### *name*

      - Description: `name` is used to set orderer organization name
      - Supported Values: Any unique string which should start with smaller case
      letter, can contain smaller case letters, capital letters, numbers and
      `-` special character only in string
      - Example: `- name: ordererorg1`

      #### *msp_id*

      - Description: `msp_id` is used to set mspID for listed orderer organization
      - Supported Values: Any unique string which can contain smaller case letters,
      capital letters, numbers
      - Example: `msp_id: OrdererOrgExampleCom`

      #### *num_orderers*

      - Description: `num_orderers` is used to set number of orderers in listed orderer
      organization
      - Supported Values: Value to launch number of orderers in listed orderer organization
      in fabric network. Supports value to be >= 1
      - Example: `num_orderers: 1`

      #### *num_ca*

      - Description: `num_ca` is used to set number of ca in listed orderer organization
      - Supported Values: Value to launch number of ca in listed orderer organization
      in fabric network. Supports value to be >= 0
      - Example: `num_ca: 1`

   For example:
   ```yaml
   orderer_organizations:
      - name: ordererorg1
         msp_id: OrdererOrg1ExampleCom
         num_orderers: 3
         num_ca: 0
      - name: ordererorg2
         msp_id: OrdererOrg2ExampleCom
         num_orderers: 2
         num_ca: 0
   ```

   ### **peer_organizations**

   - Description: `peer_organizations` section is used to list all peer organizations in
   fabric network. All peers in all peer organizations will participate in every channel.

      #### *name*

      - Description: `name` is used to set peer organization name
      - Supported Values: Any unique string which should start with smaller case letter,
      can contain smaller case letters, capital letters, numbers and `-` special character
      only in string
      - Example: `- name: org1`

      #### *msp_id*

      - Description: `msp_id` is used to set mspID for listed peer organization
      - Supported Values: Any unique string which can contain smaller case letters,
      capital letters, numbers
      - Example: `msp_id: Org1ExampleCom`

      #### *num_peers*

      - Description: `num_peers` is used to set number of peers in listed peer organization
      - Supported Values: Value to launch number of peers in listed peer organization
      in fabric network. Supports value to be >= 1
      - Example: `num_peers: 1`

      #### *num_ca*

      - Description: `num_ca` is used to set number of ca in listed peer organization
      - Supported Values: Value to launch number of ca in listed peer organization
      in fabric network. Supports value to be >= 0
      - Example: `num_ca: 1`

   For example:
   ```yaml
   peer_organizations:
   - name: org1
      msp_id: Org1ExampleCom
      num_peers: 2
      num_ca: 1
   - name: org2
      msp_id: Org2ExampleCom
      num_peers: 2
      num_ca: 1
   ```
   ### **orderer_capabilities**

   - Description: `orderer_capabilities` is used to set orderer group capabilities in
   orderer system channel and application channels
   - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml>
   to set orderer group capabilities
   - Example:

   ```yaml
   orderer_capabilities:
         V1_4_2: true
   ```

   ### **channel_capabilities**

   - Description: `channel_capabilities` is used to set channel group capabilities in
   fabric network
   - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml>
   to set channel group capabilities
   - Example:

   ```yaml
   channel_capabilities:
         V1_4_2: true
   ```

   ### **application_capabilities**

   - Description: `application_capabilities` is used to set application group capabilities in
   fabric network
   - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/master/sampleconfig/configtx.yaml>
   to set application group capabilities
   - Example:

   ```yaml
   application_capabilities:
         V1_4_2: true
   ```

   ### **num_channels**

   - Description: `num_channels` is used to set number of channel configuration
   transactions to be created using `testorgschannel` as base name. Any fabric sdk
   client can be used to submit them to create channels
   - Supported Values: Number of channels needed in fabric network
   - Example: `num_channels: 10`

   ### **k8s**

   - Description: `k8s` section is used while launching fabric network in kubernetes
   cluster. This section will be ignored while launching fabric network locally

      #### *service_type*

      - Description: `service_type` is used to set type of service to be used for
      pods in kubernetes. Refer to <https://kubernetes.io/docs/concepts/services-networking/service/>
      for types of services
      - Supported Values: ClusterIP, NodePort, LoadBalancer
      - Example: `service_type: NodePort`

      #### *data_persistence*

      - Description: `data_persistence` is used to enable data persistence for fabric
      network. If it is set to `true`, it uses persistent volume claims using
      `storage_class` and `storage_capacity`. If it is set to `local`, it uses local
      storage on the worker nodes in kubernetes cluster. If it is set to `false`. it
      will not enable data persistence in fabric network
      - Supported Values: true, false, local
      - Example: `data_persistence: true`

      #### *storage_class*

      - Description: `storage_class` is used to determine which storage class to be
      used for creating persistent volume claims when `data_persistence` is set
      to `true`
      - Supported Values: Name of storage class available in kubernetes cluster
      - Example: `storage_class: default`

      #### *storage_capacity*

      - Description: `storage_capacity` is used to determine how much capacity in GB
      to be allocated for each persistent volume claim when `data_persistence` is set
      to `true`
      - Supported Values: Any number in Gi
      - Example: `storage_capacity: 20Gi`

      #### *resources*

      - Description: `resources` section is used to list pod resources for fabric
      components like orderers, peers, kafka, couchdb and dind (part of the peer pod
      which runs all chaincode containers of a peer). Refer to
      <https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/>
      for more information about allocating resources to containers in pods. User has
      to tune resources for different components if needed to achieve desired results
      for any traffic run in case with higher payloads, multiple chaincodes

         ##### limits

         - Description: `limits` is used to set maximum limits on cpu and memory of
         a container in pod

            ###### cpu

            - Description: `cpu` is used to set maximum cpu limits of a container
            in pod
            - Supported Values: Refer to <https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/> for setting cpu resources
            - Example: `cpu: "1"`

            ###### memory

            - Description: `memory` is used to set maximum memory limits of a container
            in pod
            - Supported Values: Refer to <https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/> for setting memory resources
            - Example: `memory: 1Gi`

         ##### requests

         - Description: `requests` is used to set minimum resources required for a container
         in pod to start

            ###### cpu

            - Description: `cpu` in `requests` is used to set minimum cpu's required for a
            container in pod to get started
            - Supported Values: Refer to <https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/> for setting cpu resources
            - Example: `cpu: "1"`

            ###### memory

            - Description: `memory` in `requests` is used to set minimum memory required for a
            container in pod to get started
            - Supported Values: Refer to <https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/> for setting memory resources
            - Example: `memory: 1Gi`

         ##### orderers:

         - Description: `orderer` Section is used to list pod resources for all orderers in
         fabric network
         For example:
         ```
         orderers:
            limits:
               cpu: "1"
               memory: 1Gi
            requests:
               cpu: "0.5"
               memory: 1Gi
         ```

         ##### peers:

         - Description: `peers` Section is used to list pod resources for all peers in
         fabric network
         For example:
         ```yaml
         peers:
            limits:
               cpu: "1"
               memory: 2Gi
            requests:
               cpu: "0.5"
               memory: 1Gi
         ```

         ##### dind:

         - Description: `dind` Section is used to list pod resources for all dind's
         inside peer pods in fabric network. In cases like multiple chaincodes or higher
         payloads or to achieve high performance with complex chaincode, one has to
         allocate more resources to dind container in peer pod
         For example:
         ```yaml
         dind:
            limits:
               cpu: "1"
               memory: 2Gi
            requests:
               cpu: "0.5"
               memory: 1Gi
         ```

         ##### couchdb:

         - Description: `couchdb` Section is used to list pod resources for couchdb
         container inside peer pods in fabric network when `db_type` is set as `couchdb`.
         In case of higher payload or during a higher traffic run, resources to `couchdb`
         container should be increased
         For example:
         ```yaml
         couchdb:
            limits:
               cpu: "1"
               memory: 2Gi
            requests:
               cpu: "0.5"
               memory: 1Gi
         ```

         ##### kafka:

         - Description: `kafka` Section is used to list pod resources for all
         kafka's in fabric network when `orderertype` is set as `kafka`
         For example:
         ```yaml
         kafka:
            limits:
               cpu: "1"
               memory: 2Gi
            requests:
               cpu: "0.5"
               memory: 1Gi
         ```