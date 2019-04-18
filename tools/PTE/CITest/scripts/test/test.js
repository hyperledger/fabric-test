let assert = require('assert');
let helper = require('../test_driver.js')
let config = require('./../config.json')
let PrecfgDir, Chaincode, Channel, SyncUp, Network = ""
let TStart = 0, tests = [], AnchorPeerUpdate = false

describe('Fabric testing', function () {
    beforeEach((done) => {
        Network = config["n"] ? config["n"] : ""
        PrecfgDir = config["m"] ? config["m"] : ""
        Chaincode = config["c"] ? config["c"] : ""
        Channel = config["p"] ? config["p"] : ""
        SyncUp = config["s"] ? config["s"] : ""
        TStart = config["b"] ? config["b"] : TStart
        tests = config["t"] ? config["t"] : tests
        AnchorPeerUpdate = config["a"] ? config["a"] : AnchorPeerUpdate
        done()
    })
    this.timeout(1500000);
    it('1. Installing node_modules', async () => {
        let result = "success"
            console.log('1. Installing node_modules')
            PrecfgDir=PrecfgDir?PrecfgDir:"FAB-test"
            result = await helper.installNodeModules(PrecfgDir)
            assert.equal("success", result);
    });
    it('2. Creating and Launching the Network', async () => {
        let result = "success"
        if (PrecfgDir && Network) {
            console.log('2. Creating and Launching the Network')
            result = await helper.createNetwork(PrecfgDir)
            assert.equal("success", result);
        } else {
            console.log("2. Pre-config directory not set. Skipping network creation")
            assert.equal("success", result);
        }
    });
    it('3. Creating and Joining the Channel', async () => {
        let result = "success"
        if (PrecfgDir && Channel) {
            console.log('3. Creating and Joining the Channel')
            result = await helper.createNJoinChannel(PrecfgDir,AnchorPeerUpdate)
            assert.equal("success", result);
        } else {
            console.log("3. Pre-config directory not set. Skipping channel creation and joining the peers to the channel")
            assert.equal("success", result);
        }
    });
    it('4. Installing and Instantiating Chaincode', async () => {
        let result = "success"
        if (PrecfgDir && Chaincode) {
            console.log('4. Installing and Instantiating Chaincode')
            result = await helper.installNInstantiateCC(Chaincode, PrecfgDir)
            assert.equal("success", result);
        } else {
            console.log("4. Chaincode is not set. Skipping intall and intantiation of chaincode")
            assert.equal("success", result);
        }
    });
    it('5. Ledger SyncUp', async () => {
        let result = "success"
        if (SyncUp == "synchup") {
            console.log('5. Ledger SyncUp')
            result = await helper.ledgerSyncUp(PrecfgDir, TStart)
            assert.equal("success", result);
        } else {
            console.log("5. Ledger SyncUp is not set. Skipping ledger syncup")
            assert.equal("success", result)
        }
    });
    it('6. Execute Tests', async () => {
        let result = "success"
        if (tests) {
            console.log('6. Execute Tests')
            result = await helper.executeTests(PrecfgDir, tests, TStart)
            assert.equal("success", result);
        } else {
            console.log("6. Tests doesn't set. Skipping execute tests")
            assert.equal("success", result);
        }
    });
});
