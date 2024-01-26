# Using nodeenv

## Instructions
Once you've created a python virtual environment, you can use `nodeenv` to install particular versions of node.js within the environment. This allows you to use a different node.js version in the virtual environment than what's available on your host, keep multiple virtual enviroments with different versions of node.js, and to install node.js "global" modules that are only available within the virtual environment.

First make sure your virtual environment is activated. With pyenv you can do this with:
```bash
$ pyenv activate kolibri-py3.9
```

If nodeenv is not already installed in your virtual environment, you can install it using this command:
```bash
$ pip install nodeenv
```

If you don't already know what version you need to install, the first step is to determine the latest node.js version for a major release version. You can use `nodeenv` to list out all versions:
```bash
$ nodeenv -l
```
but this lists out everything. Alternatively, here's a one line bash function that can be used to determine that version:
```bash
$ function latest-node() { curl -s "https://nodejs.org/dist/latest-v$1.x/" | egrep -m 1 -o "$1\.[0-9]+\.[0-9]+" | head -1; }
$ latest-node 18
18.19.0
```

Once you've determined the version, you can install it:
```bash
$ nodeenv --python-virtualenv --node 18.19.0
 * Install prebuilt node (18.19.0) ..... done.
 * Appending data to /home/bjester/Projects/learningequality/kolibri/venv/bin/activate
 * Appending data to /home/bjester/Projects/learningequality/kolibri/venv/bin/activate.fish
```

You'll notice in the output above, the installation modifies the virtual environment activation scripts. Reloading the virtual environment will ensure everything works correctly.
```bash
$ pyenv deactivate
$ pyenv activate kolibri-py3.9
$ npm install -g yarn # success
```
