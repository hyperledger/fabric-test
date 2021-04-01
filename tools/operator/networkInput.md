   # Network Input File

   - Network input file consists of information needed in generating configuration
   files of fabric network and launching it. Many of these values are required;
   those that are optional will default to disabled/false or whatever default
   values used by fabric software. For more information, refer to yaml files in
   <https://github.com/hyperledger/fabric/tree/main/sampleconfig>. Here is
   a sample network input file:

   ```yaml
   fabricVersion: 1.4.2
   dbType: couchdb
   peerFabricLoggingSpec: error
   ordererFabricLoggingSpec: error
   tls: true
   metrics: false

   artifactsLocation: /home/testuser/go/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/

   orderer:
      ordererType: kafka
      batchSize:
         maxMessageCount: 500
         absoluteMaxBytes: 10 MB
         preferredMaxBytes: 2 MB
      batchTimeOut: 2s

      etcdraftOptions:
         tickInterval: 500ms
         electionTick: 10
         heartbeatTick: 1
         maxInflightBlocks: 5
         snapshotIntervalSize: 100 MB

   kafka:
      numKafka: 5
      numKafkaReplications: 3
      numZookeepers: 3

   ordererOrganizations:
    - name: ordererorg1
      mspId: OrdererOrgExampleCom
      numOrderers: 1
      numCa: 1

   peerOrganizations:
   - name: org1
     mspId: Org1ExampleCom
     numPeers: 2
     numCa: 1
   - name: org2
     mspId: Org2ExampleCom
     numPeers: 2
     numCa: 1

   ordererCapabilities:
      V1_4_2: true

   channelCapabilities:
      V1_4_2: true

   applicationCapabilities:
      V1_4_2: true

   numChannels: 10

   k8s:
      serviceType: NodePort
      dataPersistence: true
      storageClass: default
      storageCapacity: 20Gi
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

   ### **fabricVersion**

   - Description: Fabric version to be used in launching fabric network.
   If `fabricVersion` is given without stable in it, for example: `1.4.2` or
   `latest`, it will use images from `hyperledger/` docker hub.
   If fabricVersion is given with stable in the value, it will pull images
   from `hyperledger-fabric.jfrog.io`
   - Supported Values: `1.4.2` or later
   - Example: `fabricVersion: 1.4.2`
   `fabricVersion: 1.4.2-stable`

   ### **dbType**

   - Description: Peer state ledger type to be used while launching peers
   - Supported Values: couchdb, goleveldb
   - Example: `dbType: couchdb`

   ### **peerFabricLoggingSpec**

   - Description: Desired fabric logging spec to be used for all peers.
   - Supported Values: Refer to <https://hyperledger-fabric.readthedocs.io/en/latest/logging-control.html>
   to set peer fabric logging spec value
   - Example: `peerFabricLoggingSpec: error`
   `peerFabricLoggingSpec: info:lockbasedtxmgr,couchdb,statecouchdb,gossip.privdata=debug`

   ### **ordererFabricLoggingSpec**

   - Description: Desired fabric logging spec to be used for all orderers
   - Supported Values: Refer to <https://hyperledger-fabric.readthedocs.io/en/latest/logging-control.html>
   to set orderer fabric logging spec value
   - Example: `ordererFabricLoggingSpec: info`
   `ordererFabricLoggingSpec: info:policies=debug`

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

   ### **artifactsLocation**

   - Description: `artifactsLocation` is used to specify location in local file
   system to which crypto-config, channel-artifacts and connection profiles will be
   saved
   - Supported Values: absolute path to location in your local
   - Example:
   `artifactsLocation: /home/testuser/go/src/github.com/hyperledger/fabric-test/fabric/internal/cryptogen/`

   ### **orderer**

   - Description: `orderer` section is used to define configuration settings for orderer
   system channel

      #### *ordererType*

      - Description: `ordererType` is used to define consensus type to be used in fabric
      network
      - Supported Values: solo, kafka, etcdraft
      - Example: `ordererType: kafka`

      #### *batchSize*

      - Description: `batchSize` section is used to define block settings in fabric
      network

         ##### *maxMessageCount*

         - Description: `maxMessageCount` is used to set maximum messages per block in
         fabric network
         - Supported Values: Integer to set maximum messages allowed in a batch
         - Example: `maxMessageCount: 10`

         ##### absoluteMaxBytes

         - Description: `absoluteMaxBytes` is used to set absolute maximum number
         of bytes
         allowed for the serialized messages in a batch
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set value for `absoluteMaxBytes`
         - Example: `absoluteMaxBytes: 10 MB`

         ##### preferredMaxBytes

         - Description: `preferredMaxBytes` is used to set preferred maximum number
         of bytes
         allowed for the serialized messages in a batch
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set value for `preferredMaxBytes`
         - Example: `preferredMaxBytes: 2 MB`

      #### *batchTimeOut*

      - Description: `batchTimeOut` is used to wait before creating a batch in fabric
      network
      - Supported Values: Value in time units to wait before creating a batch
      - Example: `batchTimeOut: 2s`

      #### *etcdraftOptions*

      - Description: `etcdraftOptions` section is referred and used only when
      `ordererType` is set as `etcdraft`. The following are `etcdfraft` configurations:

         ##### tickInterval

         - Description: `tickInterval` is the time interval between two Node.Tick
         invocations
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set tick interval between raft nodes
         - Example: `tickInterval: 500ms`

         ##### electionTick

         - Description: `electionTick` is the number of Node.Tick invocations that
         must pass between elections
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set election tick between raft nodes
         - Example: `electionTick: 10`

         ##### heartbeatTick

         - Description: `heartbeatTick` is the number of Node.Tick invocations that must
         pass between heartbeats
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set heartbeat tick between raft nodes
         - Example: `heartbeatTick: 1`

         ##### maxInflightBlocks

         - Description: `maxInflightBlocks` limits the max number of in-flight append
         messages during optimistic replication phase
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set   maximum inflight blocks between raft nodes
         - Example: `maxInflightBlocks: 5`

         ##### snapshotIntervalSize

         - Description: `snapshotIntervalSize` defines number of bytes per which a
         snapshot is taken
         - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml> to set   snapshot interval size in raft
         - Example: `snapshotIntervalSize: 100 MB`

   ### **kafka**

   - Description: `kafka` section is used when `ordererType` as `kafka` and to
   define number of kafka's, number of zookeeper's to be launched and number
   of kafka replications to have in kafka cluster. Refer to
   <https://kafka.apache.org/documentation/> for more information about kafka

      #### *numKafka*

      - Description: `numKafka` is used to set number of kafka to be launched
      in fabric network
      - Supported Values: Value to launch number of kafka in fabric network.
      Supports value to be 3 or higher
      - Example: `numKafka: 5`

      #### *numKafkaReplications*

      - Description: `numKafkaReplications` is used to set
      `KAFKA_DEFAULT_REPLICATION_FACTOR` while launching fabric network
      - Supported Values: Value to set number of kafka replications.
      Value should be <= `numKafka`
      - Example: `numKafkaReplications: 3`

      #### *numZookeepers*

      - Description: `numZookeepers` is used to set number of zookeepers
      to be launched in fabric network
      - Supported Values: Value to launch number of zookeepers in fabric network
      - Example: `numZookeepers: 3`

   ### **ordererOrganizations**

   - Description: `ordererOrganizations` section is used to list all orderer
   organizations in fabric network. All orderers in all orderer organizations
   will participate in every channel

      #### *name*

      - Description: `name` is used to set orderer organization name
      - Supported Values: Any unique string which should start with smaller case
      letter, can contain smaller case letters, capital letters, numbers and
      `-` special character only in string
      - Example: `- name: ordererorg1`

      #### *mspId*

      - Description: `mspId` is used to set mspID for listed orderer organization
      - Supported Values: Any unique string which can contain smaller case letters,
      capital letters, numbers
      - Example: `mspId: OrdererOrgExampleCom`

      #### *numOrderers*

      - Description: `numOrderers` is used to set number of orderers in listed orderer
      organization
      - Supported Values: Value to launch number of orderers in listed orderer organization
      in fabric network. Supports value to be >= 1
      - Example: `numOrderers: 1`

      #### *numCa*

      - Description: `numCa` is used to set number of ca in listed orderer organization
      - Supported Values: Value to launch number of ca in listed orderer organization
      in fabric network. Supports value to be >= 0
      - Example: `numCa: 1`

   For example:
   ```yaml
   ordererOrganizations:
      - name: ordererorg1
         mspId: OrdererOrg1ExampleCom
         numOrderers: 3
         numCa: 0
      - name: ordererorg2
         mspId: OrdererOrg2ExampleCom
         numOrderers: 2
         numCa: 0
   ```

   ### **peerOrganizations**

   - Description: `peerOrganizations` section is used to list all peer organizations in
   fabric network. All peers in all peer organizations will participate in every channel.

      #### *name*

      - Description: `name` is used to set peer organization name
      - Supported Values: Any unique string which should start with smaller case letter,
      can contain smaller case letters, capital letters, numbers and `-` special character
      only in string
      - Example: `- name: org1`

      #### *mspId*

      - Description: `mspId` is used to set mspID for listed peer organization
      - Supported Values: Any unique string which can contain smaller case letters,
      capital letters, numbers
      - Example: `mspId: Org1ExampleCom`

      #### *numPeers*

      - Description: `numPeers` is used to set number of peers in listed peer organization
      - Supported Values: Value to launch number of peers in listed peer organization
      in fabric network. Supports value to be >= 1
      - Example: `numPeers: 1`

      #### *numCa*

      - Description: `numCa` is used to set number of ca in listed peer organization
      - Supported Values: Value to launch number of ca in listed peer organization
      in fabric network. Supports value to be >= 0
      - Example: `numCa: 1`

   For example:
   ```yaml
   peerOrganizations:
   - name: org1
      mspId: Org1ExampleCom
      numPeers: 2
      numCa: 1
   - name: org2
      mspId: Org2ExampleCom
      numPeers: 2
      numCa: 1
   ```
   ### **ordererCapabilities**

   - Description: `ordererCapabilities` is used to set orderer group capabilities in
   orderer system channel and application channels
   - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml>
   to set orderer group capabilities
   - Example:

   ```yaml
   ordererCapabilities:
         V1_4_2: true
   ```

   ### **channelCapabilities**

   - Description: `channelCapabilities` is used to set channel group capabilities in
   fabric network
   - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml>
   to set channel group capabilities
   - Example:

   ```yaml
   channelCapabilities:
         V1_4_2: true
   ```

   ### **applicationCapabilities**

   - Description: `applicationCapabilities` is used to set application group capabilities in
   fabric network
   - Supported Values: Refer to <https://github.com/hyperledger/fabric/blob/main/sampleconfig/configtx.yaml>
   to set application group capabilities
   - Example:

   ```yaml
   applicationCapabilities:
         V1_4_2: true
   ```

   ### **numChannels**

   - Description: `numChannels` is used to set number of channel configuration
   transactions to be created using `testorgschannel` as base name. Any fabric sdk
   client can be used to submit them to create channels
   - Supported Values: Number of channels needed in fabric network
   - Example: `numChannels: 10`

   ### **k8s**

   - Description: `k8s` section is used while launching fabric network in kubernetes
   cluster. This section will be ignored while launching fabric network locally

      #### *serviceType*

      - Description: `serviceType` is used to set type of service to be used for
      pods in kubernetes. Refer to <https://kubernetes.io/docs/concepts/services-networking/service/>
      for types of services
      - Supported Values: ClusterIP, NodePort, LoadBalancer
      - Example: `serviceType: NodePort`

      #### *dataPersistence*

      - Description: `dataPersistence` is used to enable data persistence for fabric
      network. If it is set to `true`, it uses persistent volume claims using
      `storageClass` and `storageCapacity`. If it is set to `local`, it uses local
      storage on the worker nodes in kubernetes cluster. If it is set to `false`. it
      will not enable data persistence in fabric network
      - Supported Values: true, false, local
      - Example: `dataPersistence: true`

      #### *storageClass*

      - Description: `storageClass` is used to determine which storage class to be
      used for creating persistent volume claims when `dataPersistence` is set
      to `true`
      - Supported Values: Name of storage class available in kubernetes cluster
      - Example: `storageClass: default`

      #### *storageCapacity*

      - Description: `storageCapacity` is used to determine how much capacity in GB
      to be allocated for each persistent volume claim when `dataPersistence` is set
      to `true`
      - Supported Values: Any number in Gi
      - Example: `storageCapacity: 20Gi`

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
         container inside peer pods in fabric network when `dbType` is set as `couchdb`.
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
         kafka's in fabric network when `ordererType` is set as `kafka`
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