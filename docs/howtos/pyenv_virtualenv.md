# Using pyenv-virtualenv

## Virtual Environments

Virtual environments allow a developer to have an encapsulated Python environment, using a specific version of Python, and with dependencies installed in a way that only affect the virtual environment. This is important as different projects or even different versions of the same project may have different dependencies, and virtual environments allow you to switch between them seamlessly and explicitly.

## Using `pyenv virtualenv` with pyenv

To create a virtualenv for the Python version used with pyenv, run `pyenv virtualenv`, specifying the Python version you want and the name of the virtualenv directory. For example, because we can make a virtual environment for Kolibri using Python 3.9.9:

```sh
$ pyenv virtualenv 3.9.9 kolibri-py3.9
```

If you get 'command not found' or a similar error, and pyenv virtualenv is not installed, [please follow the installation instructions](https://github.com/pyenv/pyenv-virtualenv#installation).

will create a virtualenv based on Python 3.9.9 under `$(pyenv root)/versions` in a
folder called `kolibri-py3.9`.

## List existing virtualenvs

`pyenv virtualenvs` shows you the list of existing virtualenvs and `conda` environments.

```sh
$ pyenv virtualenvs
  3.9.9/envs/kolibri-py3.9 (created from /home/youuuu/.pyenv/versions/3.9.9)
  kolibri-py3.9 (created from /home/youuuu/.pyenv/versions/3.9.9)
```

There are two entries for each virtualenv, and the shorter one is just a symlink.


## Activate virtualenv

If you want a virtual environment to always activate when you enter a certain directory, you can use the [`pyenv local`](https://github.com/pyenv/pyenv/blob/master/COMMANDS.md#pyenv-local) command.

```
pyenv local kolibri-py3.9
```

Now whenever you enter the directory, the virtual environment will be activated.

You can also activate and deactivate a pyenv virtualenv manually:

```sh
pyenv activate kolibri-py3.9
pyenv deactivate
```

## Delete existing virtualenv

Removing the directories in `$(pyenv root)/versions` and `$(pyenv root)/versions/{version}/envs` will delete the virtualenv, or you can run:

```sh
pyenv uninstall kolibri-py3.9
```

You can also delete existing virtualenvs by using `virtualenv-delete` command, e.g. you can run:
```sh
pyenv virtualenv-delete kolibri-py3.9
```
This will delete virtualenv called `kolibri-py3.9`.

For more information on use of virtual environments see the [pyenv-virtualenv documentation](https://github.com/pyenv/pyenv-virtualenv/blob/master/README.md#usage).
