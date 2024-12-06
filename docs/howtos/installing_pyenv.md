# Installing pyenv

## Prerequisites

[Git](https://git-scm.com/) installed.

## Install

First check to see if you already have `pyenv` installed by running this in a terminal window:

```
pyenv
```

If it is already installed, either update it using `pyenv update` or using the package manager that you used to install it.

If it is not installed you can install it using the following command, pasted into a new terminal window:

```
curl https://pyenv.run | bash
```

The output of the command tells you to add certain lines to your startup files for your terminal sessions. Follow the [PyEnv setup instructions](https://github.com/pyenv/pyenv/blob/master/README.md#set-up-your-shell-environment-for-pyenv) copied below - if you are unsure which section to follow, you are probably using a **bash** shell.

- For **bash**:

  Stock Bash startup files vary widely between distributions/operating systems in terms of which of them source
  which startup files, under what circumstances, in what order and what additional configuration they perform.
  As such, the most reliable way to get Pyenv in all environments is to append Pyenv
  configuration commands to both `.bashrc` (for interactive shells)
  and the profile file that Bash would use (for login shells).

  First, add the commands to `~/.bashrc`:

  ```bash
  echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
  echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
  echo 'eval "$(pyenv init -)"' >> ~/.bashrc
  echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc
  ```

  Then, if you have `~/.profile`, `~/.bash_profile` or `~/.bash_login`, add the commands there as well.
  If you have none of these, add them to `~/.profile`.

  * to add to `~/.profile`:

    ```bash
    echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.profile
    echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.profile
    echo 'eval "$(pyenv init -)"' >> ~/.profile
    echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.profile
    ```
  * to add to `~/.bash_profile`:

    ```bash
    echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bash_profile
    echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bash_profile
    echo 'eval "$(pyenv init -)"' >> ~/.bash_profile
    echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bash_profile
    ```
- For **Zsh**:

  ```zsh
  echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
  echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
  echo 'eval "$(pyenv init -)"' >> ~/.zshrc
  echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.zshrc
  ```

  If you wish to get Pyenv in noninteractive login shells as well, also add the commands to `~/.zprofile` or `~/.zlogin`.
- For **Fish shell**:

  Execute this interactively:

  ```fish
  set -Ux PYENV_ROOT $HOME/.pyenv
  set -U fish_user_paths $PYENV_ROOT/bin $fish_user_paths
  ```

  And add this to `~/.config/fish/config.fish`:

  ```fish
  pyenv init - | source
  ```

  **Bash warning**: There are some systems where the `BASH_ENV` variable is configured
  to point to `.bashrc`. On such systems, you should almost certainly put the
  `eval "$(pyenv init -)"` line into `.bash_profile`, and **not** into `.bashrc`. Otherwise, you
  may observe strange behaviour, such as `pyenv` getting into an infinite loop.
  See [#264](https://github.com/pyenv/pyenv/issues/264) for details.

  **Proxy note**: If you use a proxy, export `http_proxy` and `https_proxy`, too.

## Installation of pyenv on Windows

1. Run PowerShell terminal as Administrator
2. Run the following installation command in the PowerShell terminal :

```sh
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"; &"./install-pyenv-win.ps1"
```

If you are getting any **UnauthorizedAccess** error, run:

```sh
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

press Y not A, to execute Policy Change for this power shell only.

then run the previous command again

## Restart your shell

For the `PATH` changes to take effect, run the following command.

```sh
exec "$SHELL"
```

This will give no visual indicator, but the `pyenv` command should now work in the terminal.

To check if pyenv is installed correctly, type:

  `pyenv version`

## Install Python build dependencies

[**Install Python build dependencies**](https://github.com/pyenv/pyenv/wiki#suggested-build-environment) before attempting to install a new Python version.

You can now begin using Pyenv.

## Installing a Python Version with PyEnv

Use the `pyenv` command in your terminal to install a recent version of Python:

```
pyenv install 3.9.9
```

The [PyEnv installation wiki](https://github.com/pyenv/pyenv/wiki/Common-build-problems) provides a list of common issues when installing Python versions on different operating systems.

You can now activate this version of Python just for this shell session:

```
pyenv shell 3.9.9
```

Now if you check the Python version it should be 3.9.9:

```
python --version
```

See the [PyEnv documentation](https://github.com/pyenv/pyenv/blob/master/README.md#usage) for more detailed usage of the `pyenv` command.
