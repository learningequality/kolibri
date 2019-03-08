.. _getting_started:

Getting started
===============

First of all, thank you for your interest in contributing to Kolibri! The project was founded by volunteers dedicated to helping make educational materials more accessible to those in need, and every contribution makes a difference. The instructions below should get you up and running the code in no time!

.. _dev_env_intro:

Setting up Kolibri for development
----------------------------------

Most of the steps below require entering commands into your Terminal (Linux, Mac) or command prompt (``cmd.exe`` on Windows) that you will learn how to use and become more comfortable with.

.. tip::
  In case you run into any problems during these steps, searching online is usually the fastest way out: whatever error you are seeing, chances are good that somebody already had it in the past and posted a solution somewhere... ;)

Git & GitHub
~~~~~~~~~~~~

#. Install and set up `Git <https://help.github.com/articles/set-up-git/>`__ on your computer. Try this `tutorial <http://learngitbranching.js.org/>`__ if you need more practice with Git!
#. `Sign up and configure your GitHub account <https://github.com/join>`__ if you don't have one already.
#. `Fork the main Kolibri repository <https://github.com/learningequality/kolibri>`__. This will make it easier to `submit pull requests <https://help.github.com/articles/using-pull-requests/>`__. Read more details `about forking <https://help.github.com/articles/fork-a-repo/>`__ from GitHub.


Install environment dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#. Install `Python <https://www.python.org/downloads/windows/>`__ if you are on Windows, on Linux and OSX Python is preinstalled (recommended versions 2.7+ or 3.4+).
#. Install `pip <https://pypi.python.org/pypi/pip>`__ package installer.
#. Install `Node.js <https://nodejs.org/en/>`__ (version 10 is required).
#. Install `Yarn <https://yarnpkg.com/>`__ according the `instructions specific for your OS <https://yarnpkg.com/en/docs/install/>`__.
#. Install and set up the `Git LFS extension <https://git-lfs.github.com/>`__. Remember to initialize with ``git lfs install`` after installing.

.. note::
  Installing Node.js version 10.x:

  * On a Mac, you can use the `Homebrew <http://brew.sh/>`__ package manager.
  * On Ubuntu/Debian, either install Node.js via `nvm <https://github.com/creationix/nvm>`__ or use the `apt` package manager to install a system-wide version and block upgrades:

   .. code-block:: bash

     # Add apt sources from nodesource.com
     curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
     # Install latest version 10 nodejs
     sudo apt install nodejs
     # Make sure it doesn't get upgrade to later versions available in
     # the official repos.
     sudo apt-mark hold nodejs

Ready for the fun part in the Terminal? Here we go!


Checking out the code
~~~~~~~~~~~~~~~~~~~~~

#. Make sure you `registered your SSH keys on GitHub <https://help.github.com/articles/generating-ssh-keys>`__.
#. **Clone** your Kolibri fork to your local computer. In the following commands replace ``$USERNAME`` with your own GitHub username:

   .. code-block:: bash

      # using SSH
      git clone git@github.com:$USERNAME/kolibri.git
      # using HTTPS
      git clone https://github.com/$USERNAME/kolibri.git

#. Enable syncing your local repository with **upstream**,  which refers to the Kolibri source from where you cloned your fork. That way you can keep it updated with the changes from the rest of Kolibri team contributors:

  .. code-block:: bash

    cd kolibri  # Change into the newly cloned directory
    git remote add upstream git@github.com:learningequality/kolibri.git  # Add the upstream
    git fetch upstream # Check if there are changes upstream
    git checkout develop

.. warning::
  ``develop`` is the active development branch - do not target the ``master`` branch.


Virtual environment
~~~~~~~~~~~~~~~~~~~

It is best practice to use `Python virtual environment <https://virtualenv.pypa.io/en/latest/>`__ to isolate the dependencies of your Python projects from each other. This also allows you to avoid using ``sudo`` with ``pip``, which is not recommended.

You can learn more about using `virtualenv <https://virtualenv.pypa.io/en/stable/userguide/>`__, or follow these basic instructions:

Initial setup, performed once:

.. code-block:: bash

  $ sudo pip install virtualenv  # install virtualenv globally
  $ mkdir ~/.venvs               # create a common directory for multiple virtual environments
  $ virtualenv ~/.venvs/kolibri  # create a new virtualenv for Kolibri dependencies


.. note::

  We create the virtualenv `outside` of the Kolibri project folder. You can choose another location than ``~/.venvs/kolibri`` if desired.

To activate the virtualenv in a standard Bash shell:

.. code-block:: bash

  $ source ~/.venvs/kolibri/bin/activate  # activate the venv

Now, any commands run with ``pip`` will target your virtualenv rather than the global Python installation.

To deactivate the virtualenv, run the command below. Note, you'll want to leave it activated for the remainder of project setup!

.. code-block:: bash

  $ deactivate


.. tip::

  * Users of Windows and other shells such as Fish should read the `guide <https://virtualenv.pypa.io/en/stable/userguide/>`__ for instructions on activating.
  * If you set the ``PIP_REQUIRE_VIRTUALENV`` environment variable to ``true``, pip will only install packages when a virtualenv is active. This can help prevent mistakes.
  * Bash users might also consider using `virtualenvwrapper <http://virtualenvwrapper.readthedocs.io/en/latest/index.html>`__, which simplifies the process somewhat.



Install project dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. note::

  Make sure your virtualenv is active!

To install Kolibri project-specific dependencies make sure you're in the ``kolibri`` directory and run:

  .. code-block:: bash

    # Python requirements
    (kolibri)$ pip install -r requirements.txt
    (kolibri)$ pip install -r requirements/dev.txt

    # Kolibri Python package in 'editable' mode, so your installation points to your git checkout:
    (kolibri)$ pip install -e .

    # Javascript dependencies
    (kolibri)$ yarn install


.. tip::

  * We've adopted this concatenated version with added cleanup: ``pip install -r requirements/dev.txt --upgrade && make clean && pip install -e . && yarn install``.
  * In case you get webpack compilation error with Node modules build failures, add the flag ``--force`` at the end, to ensure binaries get installed.


Running the Kolibri server
--------------------------

Development
~~~~~~~~~~~

To start up the development server and build the client-side dependencies, use the following command:

.. code-block:: bash

  (kolibri)$ yarn run devserver

Alternatively, you can run the devserver with `hot reload <https://vue-loader.vuejs.org/guide/hot-reload.html>`__ enabled using:

.. code-block:: bash

  (kolibri)$ yarn run devserver-hot

If this does not work, you should run the commands it is invoking in two separate terminal windows, the first runs the django development server:

.. code-block:: bash

  (kolibri)$ kolibri --debug manage runserver --settings=kolibri.deployment.default.settings.dev "0.0.0.0:8000"

The second runs the webpack build process for frontend assets in 'watch' mode, meaning they will be automatically rebuilt if you modify them.

.. code-block:: bash

  (kolibri)$ yarn run watch

Wait for the build process to complete. This takes a while the first time, will complete faster as you make edits and the assets are automatically re-built.

Now you should be able to access the server at ``http://127.0.0.1:8000/``.

.. tip::

  If you need to make the development server available through the LAN, you need to do a production build of the assets, so use the following command:

  .. code-block:: bash

    (kolibri)$ yarn run build
    (kolibri)$ kolibri --debug manage devserver -- 0.0.0.0:8000

  Now you can simply use your server's IP from another device in the local network through the port 8000, for example ``http://192.168.1.38:8000/``.


.. tip::

  If get an error similar to ``Node Sass could not find a binding for your current environment`` try running:

  .. code-block:: bash

    (kolibri)$ npm rebuild node-sass



Production
~~~~~~~~~~

In production, content is served through CherryPy. Static assets must be pre-built:

.. code-block:: bash

  yarn run build
  kolibri start

Now you should be able to access the server at ``http://127.0.0.1:8080/``.




Running Kolibri inside docker
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Users who are familiar with Docker can spin up a Kolibri instance quickly without setting up
the full JavaScript and Python development environments. We provide docker images that contain
all the necessary prerequisites for running Kolibri.



The ``docker/`` directory contains the docker files and startup scripts needed for various tasks.
 * ``docker/base.dockerfile``: the base layer that installs JavaScript and Python dependencies (image tag ``leaningequality:kolibirbase``).
 * ``docker/build_whl.dockerfile``: generates a ``.whl``, ``tar.gz``, and ``.pex`` files in ``dist/``
 * ``docker/build_debian.dockerfile``: used to build Kolibri ``.deb`` package, and additionally
   the docker files ``test_bionic.dockerfile``, ``test_trusty.dockerfile``, and
   ``test_xenial.dockerfile`` can be used for test-installing the ``.deb`` file.
 * ``docker/build_windows.dockerfile``: used to generate the Windows installer.
 * ``docker/dev.dockerfile``: container with full development setup, running devserver.
 * ``docker/demoserver.dockerfile``: runs the pex from ``KOLIBRI_PEX_URL`` with production setup.
 * ``docker/entrypoint.py``: startup script that configures Kolibri based on ENV variables:

    * Set ``KOLIBRI_PEX_URL`` to string ``default`` to run latest pex from Kolibri download page
    * Set ``KOLIBRI_PEX_URL`` to something like ``http://host.org/nameof.pex``
    * Set ``DOCKERMNT_PEX_PATH`` to something like ``/docker/mnt/nameof.pex``
    * ``KOLIBRI_RUN_MODE``: set in Dockerfile
    * ``KOLIBRI_PROVISIONDEVICE_FACILITY``: if this environment variable is set
      the entrypoint script will run the provision device an setup a facility
      with this name. The ``KOLIBRI_LANG`` environment variable and the following
      other environment variables will be used in the process:

        * ``KOLIBRI_PROVISIONDEVICE_PRESET``: defaults to ``formal``, with the other options being ``nonformal`` and ``informal``
        * ``KOLIBRI_PROVISIONDEVICE_SUPERUSERNAME``: default ``devowner``
        * ``KOLIBRI_PROVISIONDEVICE_SUPERUSERPASSWORD``: default ``admin123``

    * ``KOLIBRI_HOME``: default ``/kolibrihome``
    * ``KOLIBRI_HTTP_PORT``: default ``8080``
    * ``KOLIBRI_LANG``: default ``en``
    * ``CHANNELS_TO_IMPORT``: comma-separated list of channel IDs (not set by default)


Building a pex file
^^^^^^^^^^^^^^^^^^^
When simply testing things out or reviewing a pull request, the easiest way to
obtain a pex file is to get the link from the buildkite assets link that is present
for every git branch and every pull request. This is the approach we recommend in
combination with the ``demoserver`` approach for running described in the next section.

However, if you want to build and run a pex from the Kolibri code in your current
local source files without relying on the github and the buildkite integration,
you can run the following commands to build a pex file:

.. code-block:: bash

  make docker-whl

The pex file will be generated in the ``dist/`` directory. You can run this pex
file using the ``demoserver`` approach described below.


Starting a demoserver
^^^^^^^^^^^^^^^^^^^^^
You can start a Kolibri instance running any pex file by setting the appropriate
environment variables in your local copy of `docker/env.list` then running the commands:

.. code-block:: bash

  make docker-build-base      # only needed first time
  make docker-demoserver

The choice of pex file can be controlled by setting environment variables in the
file ``docker/env.list``:

 * Set ``KOLIBRI_PEX_URL`` to string ``default`` to run the latest pex from Kolibri download page
 * Set ``KOLIBRI_PEX_URL`` to something like ``http://host.org/nameof.pex``
 * Set ``DOCKERMNT_PEX_PATH`` to something like ``/docker/mnt/nameof.pex``



Starting a devserver
^^^^^^^^^^^^^^^^^^^^

Use these commands to start the Kolibri devserver running inside a container:

.. code-block:: bash

  make docker-build-base      # only needed first time
  make docker-devserver      # takes a few mins to run pip install -e + webpcak build


Additional Recommended Setup
----------------------------

If you're planning on contributing code to the project, there are a few additional steps you should consider taking.


Editor config
~~~~~~~~~~~~~

We have a project-level *.editorconfig* file to help you configure your text editor or IDE to use our internal conventions.

`Check your editor <http://editorconfig.org/#download>`__ to see if it supports EditorConfig out-of-the-box, or if a plugin is available.


Frontend dev tools
~~~~~~~~~~~~~~~~~~

`Vue.js devtools <https://github.com/vuejs/vue-devtools>`__ is a browser plugin that is very helpful when working with Vue.js components and Vuex.

So ensure an more efficient workflow, install appropriate editor plugins for Vue.js, ESLint, and stylint.


Database setup
~~~~~~~~~~~~~~

You can initialize the server using:

.. code-block:: bash

  kolibri manage migrate


Pre-Commit
~~~~~~~~~~

We use `pre-commit <http://pre-commit.com/>`__ to help ensure consistent, clean code. The pip package should already be installed from a prior setup step, but you need to install the git hooks using this command.

.. code-block:: bash

  pre-commit install




.. _workflow_intro:

Development workflows
---------------------

Linting
~~~~~~~

Javascript linting is always run when you run the dev server. In addition, all frontend assets that are bundled will be linted by our Travis CI builds. It is a good idea, therefore, to monitor for linting errors in the webpack build process, while the build will complete in watch mode, it will issue warnings to the terminal.


Automated testing
~~~~~~~~~~~~~~~~~

First, install some additional dependencies related to running tests:

.. code-block:: bash

  pip install -r requirements/test.txt

Kolibri comes with a Python test suite based on ``py.test``. To run tests in your current environment:

.. code-block:: bash

  pytest  # alternatively, "make test" does the same

You can also use ``tox`` to setup a clean and disposable environment:

.. code-block:: bash

  tox -e py3.4  # Runs tests with Python 3.4

To run Python tests for all environments, lint and documentation tests, use simply ``tox``. This simulates what our CI also does.

To run Python linting tests (pep8 and static code analysis), use ``tox -e lint`` or
``make lint``.

Note that tox reuses its environment when it is run again. If you add anything to the requirements, you will want to either delete the `.tox` directory, or run ``tox`` with the ``-r`` argument to recreate the environment.

We strive for 100% code coverage in Kolibri. When you open a Pull Request, code coverage (and your impact on coverage) will be reported. To test code coverage locally, so that you can work to improve it, you can run the following:

.. code-block:: bash

  tox -e py3.4
  coverage html

Then, open the generated ./htmlcov/index.html file in your browser.

Kolibri comes with a Javascript test suite based on ``mocha``. To run all tests:

.. code-block:: bash

  yarn test

This includes tests of the bundling functions that are used in creating front end assets. To do continuous unit testing for code, and jshint running:

.. code-block:: bash

  yarn run test-karma:watch

To run specific tests only, you can add the filepath of the file. To further filter either by TestClass name or test method name, you can add `-k` followed by a string to filter classes or methods by. For example, to only run a test named ``test_admin_can_delete_membership`` in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  pytest kolibri/auth/test/test_permissions -k test_admin_can_delete_membership

To only run the whole class named ``MembershipPermissionsTestCase`` in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  pytest kolibri/auth/test/test_permissions -k MembershipPermissionsTestCase

For more advanced usage, logical operators can also be used in wrapped strings, for example, the following will run only one test, named ``test_admin_can_delete_membership`` in the ``MembershipPermissionsTestCase`` class in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  pytest kolibri/auth/test/test_permissions -k "MembershipPermissionsTestCase and test_admin_can_delete_membership"


Updating documentation
~~~~~~~~~~~~~~~~~~~~~~

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


Manual testing
~~~~~~~~~~~~~~

All changes should be thoroughly tested and vetted before being merged in. Our primary considerations are:

 * Performance
 * Accessibility
 * Compatibility
 * Localization
 * Consistency

For more information, see the next section on :doc:`/manual_testing`.


Submitting a pull request
-------------------------

The most common situation is working off of ``develop`` branch so we'll take it as an example:

.. code-block:: bash

  $ git checkout upstream/develop
  $ git checkout -b name-of-your-bugfix-or-feature

After making changes to the code, commit and push them to a branch on your fork:

.. code-block:: bash

  $ git add -A  # Add all changed and new files to the commit
  $ git commit -m "Write here the commit message"
  $ git push origin name-of-your-bugfix-or-feature

Go to `Kolibri GitHub page <https://github.com/learningequality/kolibri>`__, and if you are logged-in you will see the link to compare your branch and and create the new pull request. **Please fill in all the applicable sections in the PR template and DELETE unecessary headings**. Another member of the team will review your code, and either ask for updates on your part or merge your PR to Kolibri codebase. Until the PR is merged you can push new commits to your branch and add updates to it.

Learn more about our :ref:`dev_workflow` and :ref:`release_process`
