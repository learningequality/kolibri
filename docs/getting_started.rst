.. _getting_started:

Getting started
===============

First of all, thank you for your interest in contributing to Kolibri! The project was founded by volunteers dedicated to helping make educational materials more accessible to those in need, and every contribution makes a difference. The instructions below should get you up and running the code in no time!

Prerequisites
-------------

Most of the steps below require entering commands into your Terminal, so you should expect to become comfortable with this if you're not already.

If you encounter issues:

* Searching online is often effective: chances are high that someone else encountered similar issues in the past
* Please let us know if our docs can be improved, either by filing an issue or submitting a PR!

.. note::
  Theoretically, Windows can be used to develop Kolibri, but we haven't done much testing with it. If you're running Windows, you are likely to encounter some issues with this guide, and we'd appreciate any help improving these docs for Windows developers!

Git and GitHub
~~~~~~~~~~~~~~

#. Install and set up `Git <https://help.github.com/articles/set-up-git/>`__ on your computer. Try this `tutorial <http://learngitbranching.js.org/>`__ if you need more practice with Git!
#. `Sign up and configure your GitHub account <https://github.com/join>`__ if you don't have one already.
#. `Fork the main Kolibri repository <https://github.com/learningequality/kolibri>`__. This will make it easier to `submit pull requests <https://help.github.com/articles/using-pull-requests/>`__. Read more details `about forking <https://help.github.com/articles/fork-a-repo/>`__ from GitHub.
#. **Important**: Install and set up the `Git LFS extension <https://docs.github.com/en/repositories/working-with-files/managing-large-files/installing-git-large-file-storage>`__.


.. tip::
  `Register your SSH keys <https://help.github.com/en/articles/connecting-to-github-with-ssh>`__ on GitHub to avoid having to repeatedly enter your password


Checking out the code
~~~~~~~~~~~~~~~~~~~~~

First, clone your Kolibri fork to your local computer. In the command below, replace ``$USERNAME`` with your own GitHub username:

.. code-block:: bash

  git clone git@github.com:$USERNAME/kolibri.git

Next, initialize Git LFS:

.. code-block:: bash

  cd kolibri  # Enter the Kolibri directory
  git lfs install

To make git blame more informative, we keep track of commits that make a lot of changes to the codebase but are not directly related to the code itself, like large scale automatic code formatting. To prevent these commits appearing in the blame output, run:

.. code-block:: bash

  git config blame.ignoreRevsFile .git-blame-ignore-revs

Finally, add the Learning Equality repo as a remote called `upstream`. That way you can keep your local checkout updated with the most recent changes:


.. code-block:: bash

  git remote add upstream git@github.com:learningequality/kolibri.git
  git fetch --all  # Check if there are changes upstream
  git checkout -t upstream/develop # Checkout the development branch


Python and Pip
~~~~~~~~~~~~~~

To develop on Kolibri, you'll need:

* Python 3.6+ (Kolibri doesn't currently support Python 3.12.0 or higher)
* `pip <https://pypi.python.org/pypi/pip>`__

Managing Python installations can be quite tricky. We *highly* recommend using `pyenv <https://github.com/pyenv/pyenv>`__ or if you are more comfortable using a package manager, then package managers like `Homebrew <http://brew.sh/>`__ on Mac or ``apt`` on Debian for this.

To install pyenv see the detailed instructions here :doc:`/howtos/installing_pyenv`.

.. warning::
  Never modify your system's built-in version of Python

Python virtual environment
~~~~~~~~~~~~~~~~~~~~~~~~~~

You should use a Python virtual environment to isolate the dependencies of your Python projects from each other and to avoid corrupting your system's Python installation.

There are many ways to set up Python virtual environments: You can use `pyenv-virtualenv <https://github.com/pyenv/pyenv-virtualenv>`__ as shown in the instructions below; you can also use `Virtualenv <https://virtualenv.pypa.io/en/latest/>`__, `Virtualenvwrapper <https://virtualenvwrapper.readthedocs.io/en/latest/>`__ `Pipenv <https://pipenv.readthedocs.io/en/latest/>`__, `Python 3 venv <https://docs.python.org/3/library/venv.html>`__, `Poetry <https://poetry.eustace.io>`__ etc.

.. note::
  Most virtual environments will require special setup for non-Bash shells such as Fish and ZSH.

To setup and start using pyenv-virtualenv, follow the instructions here :doc:`/howtos/pyenv_virtualenv`.

Once pyenv-virtualenv is installed, you can use the following commands to set up and use a virtual environment from within the Kolibri repo:


.. code-block:: bash

  pyenv virtualenv 3.9.9 kolibri-py3.9  # can also make a python 2 environment
  pyenv activate kolibri-py3.9  # activates the virtual environment

Now, any commands you run will target your virtual environment rather than the global Python installation. To deactivate the virtualenv, simply run:


.. code-block:: bash

  pyenv deactivate

(Note that you'll want to leave it activated for the remainder of the setup process)

.. warning::
  Never install project dependencies using ``sudo pip install ...``


.. _EnvVars:


Environment variables
~~~~~~~~~~~~~~~~~~~~~

Environment variables can be set in many ways, including:

* adding them to a ``~/.bash_profile`` file (for Bash) or a similar file in your shell of choice
* using a ``.env`` file for this project, `loaded with Pipenv <https://pipenv.kennethreitz.org/en/latest/advanced/#automatic-loading-of-env>`_
* setting them temporarily in the current Bash session using ``EXPORT`` or similar (not recommended except for testing)

There are two environment variables you should plan to set:

* ``KOLIBRI_RUN_MODE`` is **required**.

  This variable is sent to our `pingback server <https://github.com/learningequality/nutritionfacts>`_ (private repo), and you must set it to something besides an empty string. This allows us to filter development work out of our usage statistics. There are also some `special testing behaviors <https://github.com/learningequality/nutritionfacts/blob/b150ec9fd80cd0f02c087956fd5f16b2592f94d4/nutritionfacts/views.py#L125-L179>`_ that can be triggered for special strings, as described elsewhere in the developer docs and integration testing Gherkin scenarios.
  |br|
  For example, you could add this line at the end of your ``~/.bash_profile`` file:

  .. code-block:: bash

    export KOLIBRI_RUN_MODE="dev"


* ``KOLIBRI_HOME`` is optional.

  This variable determines where Kolibri will store its content and databases. It is useful to set if you want to have multiple versions of Kolibri running simultaneously.


Install Python dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~

To install Kolibri project-specific dependencies make sure you're in the ``kolibri`` directory and your Python virtual environment is active. Then run:

.. code-block:: bash

  # required
  pip install -r requirements.txt --upgrade
  pip install -r requirements/dev.txt --upgrade
  pip install -e .

  # optional
  pip install -r requirements/test.txt --upgrade
  pip install -r requirements/docs.txt --upgrade

Note that the ``--upgrade`` flags above can usually be omitted to speed up the process.

Install Node.js, Yarn and other dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#. Install `Node.js <https://nodejs.org/en/download/>`__ (version 18.x is required)
#. Install `Yarn <https://yarnpkg.com/>`__
#. Install non-python project-specific dependencies

For a more detailed guide to using nodeenv see :doc:`/howtos/nodeenv`.

The Python project-specific dependencies installed above will install ``nodeenv``, which is a useful tool for using specific versions of Node.js and other Node.js tools in Python environments. To setup Node.js and Yarn within the Kolibri project environment, ensure your Python virtual environment is active, then run:

.. code-block:: bash

  # node.js, npm, and yarn
  # If you are setting up the release-v0.15.x branch or earlier:
  nodeenv -p --node=10.17.0
  # If you are setting up the develop branch:
  nodeenv -p --node=18.19.0
  npm install -g yarn

  # other required project dependencies
  yarn install


Database setup
~~~~~~~~~~~~~~

To initialize the database run the following command:

.. code-block:: bash

  kolibri manage migrate


Running the server
------------------

.. _devserver:


Development server
~~~~~~~~~~~~~~~~~~

To start up the development server and build the client-side dependencies, use the following command:

.. code-block:: bash

  yarn run devserver

This will take some time to build the front-end assets, after which you should be able to access the server at ``http://127.0.0.1:8000/``.

Alternatively, you can run the devserver with `hot reload <https://vue-loader.vuejs.org/guide/hot-reload.html>`__ enabled using:

.. code-block:: bash

  yarn run devserver-hot

.. tip::

  Running the development server to compile all client-side dependencies can take up a lot of system resources. To limit the specific frontend bundles that are built and watched, you can pass keywords to either of the above commands to only watch those.

  .. code-block:: bash

    yarn run devserver-hot learn

  Would build all assets that are not currently built, and run a devserver only watching the Learn plugin.

  .. code-block:: bash

    yarn run devserver core,learn

  Would run the devserver not in hot mode, and rebuild the core Kolibri assets and the Learn plugin.


For a complete reference of the commands that can be run and what they do, inspect the ``scripts`` section of the root *./package.json* file.

.. warning::

  Some functionality, such as right-to-left language support, is broken when hot-reload is enabled

.. tip::

  If you get an error similar to "Node Sass could not find a binding for your current environment", try running ``npm rebuild node-sass``


Production server
~~~~~~~~~~~~~~~~~

In production, content is served through `Whitenoise <http://whitenoise.evans.io/en/stable/>`__. Frontend static assets are pre-built:

.. code-block:: bash

  # first build the assets
  yarn run build

  # now, run the Django production server
  kolibri start

Now you should be able to access the server at ``http://127.0.0.1:8080/``.

Kolibri has support for being run as a ``Type=notify`` service under
`systemd <https://www.freedesktop.org/software/systemd/>`__. When doing so, it
is recommended to run ``kolibri start`` with the ``--skip-update`` option, and
to run ``kolibri configure setup`` separately beforehand to handle database
migrations and other one-time setup steps. This avoids the ``kolibri start``
command timing out under systemd if migrations are happening.


Separate servers
~~~~~~~~~~~~~~~~

If you are working mainly on backend code, you can build the front-end assets once and then just run the Python devserver. This may also help with multi-device testing over a LAN.

.. code-block:: bash

  # first build the front-end assets
  yarn run build

  # now, run the Django devserver
  yarn run python-devserver

You can also run the Django development server and webpack devserver independently in separate terminal windows. In the first terminal you can start the django development server:

.. code-block:: bash

  yarn run python-devserver

and in the second terminal, start the webpack build process for frontend assets:

.. code-block:: bash

  yarn run frontend-devserver


Running in App Mode
~~~~~~~~~~~~~~~~~~~

Some of Kolibri's functionality will differ when being run as a mobile app. In order to run the development server in that "app mode" context, you can use the following commands.

.. code-block:: bash

   # run the Python "app mode" server and the frontend server together:
   yarn run app-devserver

   # you may also run the python "app mode" server by itself
   # this will require you to run the frontend server in a separate terminal
   yarn run app-python-devserver

This will run the script located at ``integration_testing/scripts/run_kolibri_app_mode.py``. There you may change the port, register app capabilities (ie, ``os_user``) and make adjustments to meet your needs.

When the app development server is started, you will see a message with a particular URL that you will need to use in order to initialize your browser session properly. Once your browser session has been initialized for use in the app mode, your browser session will remain in this mode until you clear your cookies, even if you've started your normal Kolibri development server.

.. code-block:: bash

   [app-python-devserver] Kolibri running at: http://127.0.0.1:8000/app/api/initialize/6b91ec2b697042c2b360235894ad2632


Editor configuration
--------------------

We have a project-level *.editorconfig* file to help you configure your text editor or IDE to use our internal conventions.

`Check your editor <http://editorconfig.org/#download>`__ to see if it supports EditorConfig out-of-the-box, or if a plugin is available.


Vue development tools
---------------------

`Vue.js devtools (Legacy) <https://devtools.vuejs.org/guide/installation.html>`__ is a browser plugin that is very helpful when working with Vue.js components and Vuex. Kolibri is using Vue 2, so be sure to find the "Legacy" plugin as the latest version of the extension is for Vue 3.

To ensure a more efficient workflow, install appropriate editor plugins for Vue.js, ESLint, and stylelint.


Sample resources and data
-------------------------

Once you have the server running, proceed to import some channels and resources. To quickly import all available and supported Kolibri resource types, `import with the token <https://kolibri.readthedocs.io/en/latest/manage/resources.html?highlight=import#import-with-token>`__  ``nakav-mafak`` for the `Kolibri QA channel <https://kolibri-beta.learningequality.org/en/learn/#/topics/95a52b386f2c485cb97dd60901674a98>`__ (~350MB).


Now you can create users, classes, lessons, etc manually. To auto-generate some sample user data you can also run:

.. code-block:: bash

  kolibri manage generateuserdata



Linting and auto-formatting
---------------------------

.. _linting:

Manual linting and formatting
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Linting and code auto-formatting are done by Prettier and Black.

You can manually run the auto-formatters for the frontend using:

.. code-block:: bash

  yarn run lint-frontend:format

Or to check the formatting without writing changes, run:

.. code-block:: bash

  yarn run lint-frontend

The linting and formatting for the backend is handled using ``pre-commit`` below.


Pre-commit hooks
~~~~~~~~~~~~~~~~

A full set of linting and auto-formatting can also be applied by pre-commit hooks. The pre-commit hooks are identical to the automated build check by Travis CI in Pull Requests.

`pre-commit <http://pre-commit.com/>`__ is used to apply a full set of checks and formatting automatically each time that ``git commit`` runs. If there are errors, the Git commit is aborted and you are asked to fix the error and run ``git commit`` again.

Pre-commit is already installed as a development dependency, but you also need to enable it:

.. code-block:: bash

  pre-commit install

To run all pre-commit checks in the same way that they will be run on our Github CI servers, run:

.. code-block:: bash

  pre-commit run --all-files

.. tip:: As a convenience, many developers install linting and formatting plugins in their code editor (IDE). Installing ESLint, Prettier, Black, and Flake8 plugins in your editor will catch most (but not all) code-quality checks.

.. tip:: Pre-commit can have issues running from alternative Git clients like GitUp. If you encounter problems while committing changes, run ``pre-commit uninstall`` to disable pre-commit.

.. warning:: If you do not use any linting tools, your code is likely fail our server-side checks and you will need to update the PR in order to get it merged.


Design system
-------------

We have a large number of reusable patterns, conventions, and components built into the application. Review the `Kolibri Design System <https://design-system.learningequality.org/>`__ to get a sense for the tools at your disposal, and to ensure that new changes stay consistent with established UI patterns.


Updating documentation
----------------------

First, install some additional dependencies related to building documentation output:

.. code-block:: bash

  pip install -r requirements/docs.txt
  pip install -r requirements/build.txt

To make changes to documentation, edit the ``rst`` files in the ``kolibri/docs`` directory and then run:

.. code-block:: bash

  make docs

You can also run the auto-build for faster editing from the ``docs`` directory:

.. code-block:: bash

  cd docs
  sphinx-autobuild --port 8888 . _build

Now you should be able to preview the docs at ``http://127.0.0.1:8888/``.


Automated testing
-----------------


Kolibri comes with a Javascript test suite based on `Jest <https://jestjs.io/>`__. To run all front-end tests:

.. code-block:: bash

  yarn run test

Kolibri comes with a Python test suite based on `pytest <https://docs.pytest.org/en/latest/>`__. To run all back-end tests:

.. code-block:: bash

  pytest

To run specific tests only, you can add the filepath of the file. To further filter either by TestClass name or test method name, you can add `-k` followed by a string to filter classes or methods by. For example, to only run a test named ``test_admin_can_delete_membership`` in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  pytest kolibri/auth/test/test_permissions -k test_admin_can_delete_membership

To only run the whole class named ``MembershipPermissionsTestCase`` in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  pytest kolibri/auth/test/test_permissions -k MembershipPermissionsTestCase

For more advanced usage, logical operators can also be used in wrapped strings, for example, the following will run only one test, named ``test_admin_can_delete_membership`` in the ``MembershipPermissionsTestCase`` class in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  pytest kolibri/auth/test/test_permissions -k "MembershipPermissionsTestCase and test_admin_can_delete_membership"

You can also use ``tox`` to setup a clean and disposable environment:

.. code-block:: bash

  tox -e py3.4  # Runs tests with Python 3.4

To run Python tests for all environments, use simply ``tox``. This simulates what our CI also does on GitHub PRs.

.. note::

  ``tox`` reuses its environment when it is run again. If you add anything to the requirements, you will want to either delete the `.tox` directory, or run ``tox`` with the ``-r`` argument to recreate the environment


Manual testing
--------------

All changes should be thoroughly tested and vetted before being merged in. Our primary considerations are:

 * Performance
 * Accessibility
 * Compatibility
 * Localization
 * Consistency

For more information, see the next section on :doc:`/manual_testing/index`.


Submitting a pull request
-------------------------

Here's a very simple scenario. Below, your remote is called ``origin``, and Learning Equality is ``le``.

First, create a new local working branch:

.. code-block:: bash

  # checkout the upstream develop branch
  git checkout le/develop
  # make a new feature branch
  git checkout -b my-awesome-changes

After making changes to the code and committing them locally, push your working branch to your fork on GitHub:

.. code-block:: bash

  git push origin my-awesome-changes

Go to Kolibri's `GitHub page <https://github.com/learningequality/kolibri>`__, and create a the new pull request.

.. note::
  Please fill in all the applicable sections in the PR template and DELETE unecessary headings

Another member of the team will review your code, and either ask for updates on your part or merge your PR to Kolibri codebase. Until the PR is merged you can push new commits to your branch and add updates to it.

Learn more about our :ref:`dev_workflow` and :ref:`release_process`


Development using Docker
------------------------

Engineers who are familiar with Docker can start a Kolibri instance without setting up the full JavaScript and Python development environments on the host machine.

For more information, see the *docker* directory and the ``docker-*`` commands in the *Makefile*.


Development server
~~~~~~~~~~~~~~~~~~

Start the Kolibri devserver running inside a container:

.. code-block:: bash

  # only needed first time
  make docker-build-base

  # takes a few mins to run pip install -e + webpack build
  make docker-devserver


Building a pex file
~~~~~~~~~~~~~~~~~~~

.. note::
  The easiest way to obtain a `pex <https://pex.readthedocs.io/en/latest/whatispex.html>`__ file is to submit a Github PR and download the built assets from buildkite.

If you want to build and run a pex from the Kolibri code in your current local source files without relying on the github and the buildkite integration, you can run the following commands to build a pex file:

.. code-block:: bash

  make docker-whl

The pex file will be generated in the ``dist/`` directory. You can run this pex
file using the production server approach described below.


Production server
~~~~~~~~~~~~~~~~~

You can start a Kolibri instance running any pex file by setting the appropriate
environment variables in your local copy of `docker/env.list` then running the commands:

.. code-block:: bash

  # only needed first time
  make docker-build-base

  # run demo server
  make docker-demoserver

The choice of pex file can be controlled by setting environment variables in the
file *./docker/env.list*:

 * ``KOLIBRI_PEX_URL``: Download URL or the string ``default``
 * ``DOCKERMNT_PEX_PATH``: Local path such as ``/docker/mnt/nameof.pex``
