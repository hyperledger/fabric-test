## Fabric Testviewer

[View test results here https://testviewer.mybluemix.net](https://testviewer.mybluemix.net)

Testviewer is a dashboard that displays throughput rate trends of a simple Hyperledger Fabric network on a consistent test platform. *(Note: it is not a network optimized for maximum throughput.)* It shows the transactions per second (TPS) achieved by a few selected traffic tests executed daily as part of the Continuous Improvement automated test suites. The tests are driven by the PTE (full network), OTE (orderer system only), and LTE (ledger code only) test tools from the [hyperledger/fabric-test](https://github.com/hyperledger/fabric-test) repository.

The tool consists of two parts, which can be installed on the same public host:
1. a server, which collects latest test results stored with the builds on Nexus and provides APIs to access them.
2. and an application, which dynamically retrieves the latest test results stored with the builds on Nexus through the server, and displays the latest TPS data.

Once installed, the IP:port address can be shared with users.


### Building the Testviewer Image

To build your own Testviewer image rather than using the one provided, run the following command in the `fabric-test` directory.
```
make test-viewer
```
This creates an image with the tag `hyperledger/fabric-testviewer`. Change directory to `fabric-test/tools/Testviewer` and replace the `image` fields in `docker-compose.yaml` and `k8fabricreport.yaml` with this tag.



## Installation Instructions

### Alternative 1: Running Locally without Docker

1. LTS versions of Node.js and npm are needed. This project uses node@v8.11.2 and npm@6.1.0.

Run the following commands to install Node.js and npm. There are no directory restrictions on where these need to be run.

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
nvm install node@latest
npm install npm@6.1.0
```

2. Then, make sure node modules are installed correctly. Run the following commands from the Testviewer directory.

```
cd server
npm install
cd ../app
npm install
```

3. From the Testviewer directory, open `config.ts`. Make sure `LOCAL` is set to `true`.

4. Once the above steps are done, the application and server are ready to run. From the Testviewer directory, run the following commands.

```
node server/index.js
cd app
npm start
```

5. (OPTIONAL) The app runs on port 4200 and the server runs on port 3000 by default, but you can use custom port numbers.
- To run the app on a custom port, run `npm start --port <INSERT PORT NUMBER HERE>`.
- To run the server on a custom port, change the `LOCAL_PORT` constant in `config.ts` and the `port` constant in `server/index.js` to the desired port number before running `node server/index.js`.


### Alternative 2: Running Locally with Docker

1. [Docker](https://docs.docker.com/) needs to first be installed.

2. The necessary `Dockerfile` and `docker-compose.yaml` files are available in the Testviewer directory.

By default, the Docker image is pulled from Nexus.

3. To create a custom image Run the following command from the Testviewer directory with the desired image name to build an image.

```
docker build -t <insert image name here> .
```

4. Edit `docker-compose.yaml` so that the `image` field under `server` and `app` containers is the image name you chose when it was built.

5. Then, run the following command to start the `server` and `app` containers.

```
docker-compose up
```

(OPTIONAL) The app runs on port 4200 and the server runs on port 3000 by default, but you can use custom port numbers.
Simply edit the `ports` fields in the `docker-compose.yaml` file like below.

```
server
  ports:
    - <INSERT PORT NUMBER HERE>:3000
app
  ports:
    - <INSERT PORT NUMBER HERE>:4200
```


### Alternative 3: Running Remotely on Kubernetes cluster

1. IBM Cloud CLI and Kubernetes CLI need to first be set up along with your Kubernetes cluster. Make sure the KUBECONFIG environment variable on your machine is correctly set up as well.

2. The necessary `k8fabricreport.yaml` and `k8reportservice.yaml` files are available in the Testviewer directory.

3. Find the public IP of the node you wish to use from your cluster. The public IP is availble under the "Worker Nodes" tab on the cluster's page on Bluemix.

4. Edit `config.ts` in the Testviewer directory. LOCAL should be set to false, and REMOTE_IP should be the public IP of the node you wish to use. REMOTE_PORT should be the NodePort you wish to use to access the server (NOT the application). The application uses REMOTE_IP and REMOTE_PORT to use the server's API.

5. Next, rebuild the image and push it to a Dockerhub repository. Make sure that this Dockerhub repository is used under the `image` fields in the `k8fabricreport.yaml` file.

6. Next, edit the `k8reportservice.yaml` file so its `NodePort` field under port-1 (server) has the same port number as REMOTE_PORT in `config.ts`. You may also change the `NodePort` field under port-2 (app). This port is used for the public to access the application from their browsers.

7. Finally, run the following commands from the Testviewer directory to push the deployment and service to your Kubernetes cluster.
```
kubectl create -f k8reportservice.yaml
kubectl create -f k8fabricreport.yaml
```


## App Configuration

### Changing the list of available tests

In the application's data page, the display for each tool (PTE, OTE, and LTE) has a dropdown menu that allows users to select by FAB number the tests they wish to view. The lists of available tests and the lists of preselected tests can be edited in `app/src/app/testlists.ts` under the Testviewer directory.

