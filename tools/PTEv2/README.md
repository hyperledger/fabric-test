
# Performance Traffic Engine v2 - PTEv2

The Performance Traffic Engine v2 (PTEv2) uses high level SDKs [Hyperledger Fabric SDK Node](https://github.com/hyperledger/fabric-sdk-node) to interact with [Hyperledger Fabric](http://hyperledger-fabric.readthedocs.io/en/latest/) networks while retaining all the features of PTE, such as flexibility and scalability. PTEv2 is operated in the same way as [PTE](https://github.com/hyperledger/fabric-test/tree/master/tools/PTE).

## What's New in PTEv2

### queryResult
A new parameter, **queryResult**, is added to the User Input File to write every query transaction result to PTE log when set to `TRUE`.  The default is `FALSE`.  This parameter is set to `TRUE` if `invokeCheck` is `TRUE`.

### transient map
Three transient map related parameters are added in the ccOpt section of the User Input File to alter chaincode transient map.

```
"ccOpt": {
    ... ,
    "transMapKey": [],
    "transMapKeyIdx": [],
    "transMapKeyType": []
}
```

where

* **transMapKey**: the key of the transient map of the payload
* **transMapKeyIdx**: a list of keys in transient map to be altered
* **transMapKeyType**: a list of key types corresponding to the transMapKeyIdx

#### Example

For marbles02 private chaincode, the invoke transient map are 

```
"invoke": {
    "move": {
        "fcn": "initMarble",
        "transientMap": {"marble": {"name": "marble", "color": "blue", "size": 35, "owner": "tom", "price": 99}},
        "args": []
    }
}
```

If the transMap parameters are set to

```
"ccOpt": {
    ... ,
    "transMapKey": ["marble"],
    "transMapKeyIdx": ["name", "owner", "price"],
    "transMapKeyType": ["string", "string", "integer"]
}
```

Then PTEv2 will generate a unique name, a unique owner, and a random number as price for each transaction.  The transient map will be like

```
{"marble": {"name": "<generated-name>", "color": "blue", "size": 35, "owner": "<generated-owner>", "price": <generated-random-number>}}
```

---

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
