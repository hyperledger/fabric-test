Welcome to fabric-test
-------
You are in the right place if you are interested in testing the Hyperledger Fabric and related repositories.

## Getting Started
Here are some recommended setup steps.

#### Clone the repositories.

```
  cd $GOPATH/github.com/hyperledger
  clone the fabric-ca
  clone the fabric
  clone the cello
  clone the fabric-test
```

#### Update git submodules

Execute this command the first time after cloning the repo.

```
  cd fabric-test
  git submodule update --init --recursive
```

All subsequent times, to update, execute:

```
  cd $GOPATH/github.com/hyperledger/fabric-test
  git submodule foreach git pull origin master
```

#### Get and build the latest code in the targeted repositories
Note: Currently, this must be done in the corresponding repos, outside of this fabric-test repo (not in the fabric-test submodules).
We have hopeful plans to modify the makefiles in the targeted repositories to allow building them from here,
which would reduce inconsistencies and complexity by eliminating the necessary coordination of the commit levels used to
build the targeted repositories and the commit levels of those repositories that are set here.

```
  cd ../fabric-ca
  make docker

  cd ../fabric
  make docker configtxgen cryptogen

  # cello instructions coming soon  #WIP
```

## Run some tests

#### Run test suites or individual tests in behave

```
  cd $GOPATH/hyperledger/fabric-test/feature
  behave -t smoke
  behave -t daily
  behave -n 4770
```

#### Start a network using networkLauncher tool, save logs, and clean up afterwards

```
  cd $GOPATH/hyperledger/fabric-test/tools/NL
  ./networkLauncher.sh -h
  ./networkLauncher.sh -o 3 -x 6 -r 6 -p 2 -k 3 -z 3 -n 3 -t kafka -f test -w localhost -S enabled
  ./savelogs.sh   ### script to save all logs ### WIP ###
  ./cleanup.sh    ### script to tear down network and remove artifacts ### WIP ###
```

