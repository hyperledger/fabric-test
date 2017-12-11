# Welcome to Fabric Prototype
Developers will find these mechanisms useful for prototyping variant Hyperledger Fabric based systems.

## Getting started

### Installation

#### Prerequisites
Make sure you have a properly configured Hyperledger Fabric development environment.

#### Clone this repo into fabric root folder
From the fabric root folder
```
git clone https://github.com/jeffgarratt/fabric-prototype.git
cd fabric-prototype
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

This will automaticall switch you to the new environment if successful.  In the future, you can switch to the virtual environment using the workon command as shown below.

```
    workon behave_venv
```


#### Now install required modules into the virtual environment

**NOTE**: If you have issues installing the modules below, and you are running the vagrant environment, consider performing a **vagrant destroy** followed by a **vagrant up**.

You can install either using fixed versions with a requirments file or by installing the latest based upon pip.

##### Installing using a requirements.txt file with fixed versions

```
pip install -r requirements.txt
```

##### Installing using latest versions from pip

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

Behave requires the peer executable for packaging deployments.  To make the peer execute the following command.


```
#Change to the root fabric folder to perform the following commands.
cd ..

# Optionally perform the following clean if you are unsure of your environments state.
make clean
make peer
```

The peer executable will be located in the build/bin folder. Make sure that your PATH enviroment variable contains the location.
Execute the following command if necessary.
```
    export PATH=$PATH:$GOPATH/src/github.com/hyperledger/fabric/build/bin
```

The behave system also uses several docker containers.  Execute the following commands to create the required docker containers.

```
    make peer-docker
    make orderer-docker
```

Change back to the bddtests folder (Where this readme is located) to execute subsequent behave commands.

```
    cd fabric-prototype
```

#### Running all of the behave features and suppressing skipped steps (-k)

The following behave commands should be executed from within this folder.

```
    behave -k
```

#### Running a specific feature

```
    behave -k features/bootstrap.feature
```

### Deactivating your behave virtual environment
Once you are done using behave and you wish to switch back to your normal
python environment, issue the following command.

```
    deactivate
```

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.
s
