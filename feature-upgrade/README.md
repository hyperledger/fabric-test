# Welcome to hyperledger/fabric-test/feature-upgrade
Developers will find these mechanisms useful for prototyping variant Hyperledger Fabric based systems.

## Getting started

### Installation

#### Prerequisites Setup
Make sure you have a properly configured Hyperledger Fabric development environment, and have already cloned the fabric-test repository.
Go to the folder that was originally copied from "https://github.com/jeffgarratt/fabric-prototype.git".
```
cd $GOPATH/src/github.com/hyperledger/fabric-test/feature-upgrade
```

#### Setup python virtual environment wrapper usage

```
    sudo pip install virtualenv
    sudo pip install virtualenvwrapper
    export WORKON_HOME=~/Envs
    source /usr/local/bin/virtualenvwrapper.sh
```

#### Setup your virtual environment for behave
[Virtual Environment Guide](http://docs.python-guide.org/en/latest/dev/virtualenvs/)


```
    mkvirtualenv -p /usr/bin/python2.7 behave_venv
```

This will automatically switch you to the new environment if successful.  In the future, you can switch to the virtual environment using the workon command as shown below.

```
    workon behave_venv
```


#### Now install required modules into the virtual environment

**NOTE**: If you have issues installing the modules below, and you are running the vagrant environment, consider performing a **vagrant destroy** followed by a **vagrant up**.

You can install either using fixed versions with a requirements file, or by installing the latest based upon pip.

##### Option 1: Installing using a requirements.txt file with fixed versions

```
pip install -r requirements.txt
```

##### Option 2: Installing using latest versions from pip

```
    pip install behave
    pip install grpcio-tools
    pip install "pysha3==1.0b1"
    pip install b3j0f.aop
    pip install jinja2
    # The pyopenssl install gives errors, but installs succeeds
    pip install pyopenssl
    pip install ecdsa
    pip install python-slugify
    pip install pyyaml
```

### Running behave

#### Peer Executable and Docker containers

Behave requires the peer executable for packaging deployments.  To make the peer, execute the following command.

```
# Change to the fabric folder to perform the following commands.
cd $GOPATH/src/github.com/hyperledger/fabric-test/fabric

# Optionally perform the following clean if you are unsure of your environment state.
make clean

# Build all native binaries
make native
```

The peer executable will be located in the build/bin folder. Make sure that your PATH enviroment variable contains the location.
Execute the following command if necessary.
```
    export PATH=$PATH:$GOPATH/src/github.com/hyperledger/fabric-test/fabric/build/bin
```

The behave system also uses several docker containers.  This includes pulling the latest available docker images for thirdparty docker containers (couchdb, kafka, zookeeper), as well as images for a prior release from which to upgrade.  Execute the following commands to create the required docker containers.

```
    make docker
```

Change back to the upgrade test folder (where this readme is located) to execute subsequent behave commands.

```
    cd $GOPATH/src/github.com/hyperledger/fabric-test/feature-upgrade
```

#### Examples: Run test scenarios in a specific feature file, while suppressing skipped steps (-k)

```
    behave -k features/bootstrap.feature
    behave -k features/upgrade.feature
```

### Deactivating your behave virtual environment
Once you are done using behave and you wish to switch back to your normal
python environment, issue the following command.

```
    deactivate
```

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
s
