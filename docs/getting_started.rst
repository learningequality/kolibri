.. _getting_started:

Getting started
===============

First of all, thank you for your interest in contributing to Kolibri! The project was founded by volunteers dedicated to helping make educational materials more accessible to those in need, and every contribution makes a difference. The instructions below should get you up and running the code in no time!

Setting up Kolibri for development
----------------------------------

Most of the steps below require entering commands into your Terminal, so you should expect to become comfortable with this if you're not already.

If you encounter issues:

* Searching online is often effective: chances are high that someone else encountered similar issues in the past
* Please let us know if our docs can be improved, either by filing an issue or submitting a PR!

.. note::
  Theoretically Windows can be used to develop Kolibri, but we haven't tested this lately. If you're running Windows you are likely to encounter issues with this guide. That said, we'd appreciate any help improving these docs for Windows developers!


Git and GitHub
~~~~~~~~~~~~~~

#. Install and set up `Git <https://help.github.com/articles/set-up-git/>`__ on your computer. Try this `tutorial <http://learngitbranching.js.org/>`__ if you need more practice with Git!
#. `Sign up and configure your GitHub account <https://github.com/join>`__ if you don't have one already.
#. `Fork the main Kolibri repository <https://github.com/learningequality/kolibri>`__. This will make it easier to `submit pull requests <https://help.github.com/articles/using-pull-requests/>`__. Read more details `about forking <https://help.github.com/articles/fork-a-repo/>`__ from GitHub.
#. **Important**: Install and set up the `Git LFS extension <https://git-lfs.github.com/>`__.


.. tip::
  `Register your SSH keys <https://help.github.com/en/articles/connecting-to-github-with-ssh>`__ on GitHub to avoid having to repeatedly enter your password


Checking out the code
~~~~~~~~~~~~~~~~~~~~~

First, clone your Kolibri fork to your local computer. In command below, replace ``$USERNAME`` with your own GitHub username:

.. code-block:: bash

  git clone git@github.com:$USERNAME/kolibri.git

Next, initialize Git LFS:

.. code-block:: bash

  git lfs install

Finally, add the Learning Equality repo as a remote. That way you can keep your local checkout updated with the most recent changes:

.. code-block:: bash

  cd kolibri  # Enter the Kolibri directory
  git remote add upstream git@github.com:learningequality/kolibri.git
  git fetch --all  # Check if there are changes upstream
  git checkout develop # Checkout the development branch



Python and Pip
~~~~~~~~~~~~~~

To develop on Kolibri, you'll need:

* Python 3.4+ or Python 2.7+
* `pip <https://pypi.python.org/pypi/pip>`__

Managing Python installations can be quite tricky. We *highly* recommend using package managers like `Homebrew <http://brew.sh/>`__ on Mac or ``apt`` on Debian for this.

.. warning::
  Never modify your system's built-in version of Python

Python virtual environment
~~~~~~~~~~~~~~~~~~~~~~~~~~

You should use a Python virtual environment to isolate the dependencies of your Python projects from each other and to avoid corrupting your system's Python installation.

There are many ways to set up Python virtual environments: You can use `Pipenv <https://pipenv.readthedocs.io/en/latest/>`__ as shown in the instructions below; you can also use `Virtualenv <https://virtualenv.pypa.io/en/stable/userguide/>`__, `Python 3 venv <https://docs.python.org/3/library/venv.html>`__, `Poetry <https://poetry.eustace.io>`__ etc.

.. note::
  Most virtual environments will require special setup for non-Bash shells such as Fish and ZSH.

Once Pipenv is installed, you can use the following commands to set up and use a virtual environment from within the Kolibri repo:


.. code-block:: bash

  pipenv --python 3  # can also make a python 2 environment
  pipenv shell  # activates the virtual environment

Now, any commands run with will target your virtual environment rather than the global Python installation. To deactivate the virtualenv, simply run:


.. code-block:: bash

  exit

(Note that you'll want to leave it activated for the remainder of project setup)

.. warning::
  Never install project dependencies using ``sudo pip install ...``


.. _EnvVars:


Environment variables
~~~~~~~~~~~~~~~~~~~~~

Environment variables can be set in many ways, including:

* adding them to a ``~/.bash_profile`` file (for Bash) or a similar file in your shell of choice
* using a ``.env`` file for this project, `loaded with Pipenv <https://docs.pipenv.org/en/latest/advanced/#automatic-loading-of-env>`_
* setting them temporarily in the current Bash session using ``EXPORT`` or similar (not recommended except for testing)

There are two environment variables you should plan to set:

* ``KOLIBRI_RUN_MODE`` (required): This variable is sent to our `pingback server <https://github.com/learningequality/nutritionfacts>`_, and you must set it to something besides an empty string. This allows us to filter development work out of our usage statistics. (There are also some `special testing behaviors <https://github.com/learningequality/nutritionfacts/blob/b150ec9fd80cd0f02c087956fd5f16b2592f94d4/nutritionfacts/views.py#L125-L179>`_ that can be triggered for special strings, as described elsewhere in the developer docs and integration testing gherkin stories.)
* ``KOLIBRI_HOME`` (optional): This variable determines where Kolibri will store its content and databases. It is useful to set if you want to have multiple versions of Kolibri running simultaneously.


Install Python dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~

To install Kolibri project-specific dependencies make sure you're in the ``kolibri`` directory and your Python virtual environment is active. Then run:

.. code-block:: bash

  # required
  pip install -r requirements.txt --upgrade
  pip install -r requirements/dev.txt --upgrade
  pip install -e .

  # optional
  pip install -r requirements/build.txt --upgrade
  pip install -r requirements/test.txt --upgrade
  pip install -r requirements/docs.txt --upgrade

Note that the ``--upgrade`` flags above can usually be omitted to speed up the process.

Install Node.js, Yarn and other dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#. Install Node.js (version 10 is required)
#. Install `Yarn <https://yarnpkg.com/>`__
#. Install non-python project-specific dependencies

The Python project-specific dependencies installed above will install ``nodeenv``, which is a useful tool for using specific versions of Node.js and other Node.js tools in Python environments. To setup Node.js and Yarn within the Kolibri project environment, ensure your Python virtual environment is active, then run:

.. code-block:: bash

  # node.js, npm, and yarn
  nodeenv -p --node=10.15.3
  npm install -g yarn

  # other required project dependencies
  yarn install


Running the Kolibri server
--------------------------

Development server
~~~~~~~~~~~~~~~~~~

To start up the development server and build the client-side dependencies, use the following command:

.. code-block:: bash

  yarn run devserver

This will take some time to build the front-end assets, after which you should be able to access the server at ``http://127.0.0.1:8000/``.

Alternatively, you can run the devserver with `hot reload <https://vue-loader.vuejs.org/guide/hot-reload.html>`__ enabled using:

.. code-block:: bash

  yarn run devserver-hot

Note that the default devserver commands above will automatically watch your source files for changes as you edit them, and do formatting and linting fixes on them. If you would prefer to do these on demand (such as with IDE linting tools or using a tool like pre-commit), then it is best to use the following commands, whereby linting and formatting errors will generate warnings, but not be fixed on the fly:

.. code-block:: bash

  yarn run devserver-warn

Or:

.. code-block:: bash

  yarn run devserver-hot-warn

.. warning::

  Some functionality such as right-to-left language support is broken when hot-reload is enabled


Development server - advanced
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The commands above will start multiple concurrent processes: one for the Django web server, and at least one more for the webpack devserver. If you'd like to start these processes separately, you can do it in two separate terminal windows.

In the first terminal you can start the django development server with this command:

.. code-block:: bash

  kolibri manage --debug runserver --settings=kolibri.deployment.default.settings.dev "0.0.0.0:8000"

In the second terminal you can start the webpack build process for frontend assets in 'watch' mode – meaning they will be automatically rebuilt if you modify them – with this command:

.. code-block:: bash

  yarn run watch

If you need to make the development server available through the LAN, you need to do a production build of the assets, so use the following commands:

.. code-block:: bash

  # first build the assets
  yarn run build
  # now, run the Django devserver
  kolibri manage --debug runserver -- 0.0.0.0:8000

Now you can simply use your server's IP from another device in the local network through the port 8000, for example ``http://192.168.1.38:8000/``.


.. tip::

  If get an error similar to "Node Sass could not find a binding for your current environment", try running ``npm rebuild node-sass``



Production
~~~~~~~~~~

In production, content is served through CherryPy. Static assets must be pre-built:

.. code-block:: bash

  # first build the assets
  yarn run build
  # now, run the Django production server
  kolibri start

Now you should be able to access the server at ``http://127.0.0.1:8080/``.




Developing on Kolibri inside Docker
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. note::
  The Docker workflows below have not been fully tested

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


**Building a pex file:**

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


**Starting a demo server:**

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



**Starting a devserver:**

.. code-block:: bash

  # start the Kolibri devserver running inside a container
  make docker-build-base  # only needed first time
  make docker-devserver   # takes a few mins to run pip install -e + webpack build


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


.. _workflow_intro:

Development workflows
---------------------

Design system
~~~~~~~~~~~~~

We have a large number of reusable patterns, conventions, and components built into the application. Review the `Kolibri Design System <http://kolibribeta.learningequality.org/design>`__ to get a sense for the tools at your disposal, and to ensure that new changes stay consistent with established UI patterns.


Linting and auto-formatting
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Linting and code auto-formatting provided by Prettier and Black are run in the background automatically by default when you run the dev server.  It is a good to monitor for linting errors in the build process: while the build may complete, it will also issue warnings to the terminal.

Linting and auto-formatting can also be run by the pre-commit hooks (installed earlier). If those are bypassed or not triggered, our Travis CI builds will also fail for unformatted code.

You can manually run the auto-formatters using:

.. code-block:: bash

  yarn run lint-frontend:format
  yarn run fmt-backend

Or to check the formatting without writing changes, run:

.. code-block:: bash

  yarn run lint-frontend
  yarn run fmt-backend:check

To have code automatically formatted and checked for linting upon commit, you may use `pre-commit <http://pre-commit.com/>`__ this can help ensure clean, consistent code, and will prevent automated build checks due to linting errors. The pip package should already be installed from the Python dev dependency installation, but you need to install the git hooks using this command:

.. code-block:: bash

  pre-commit install


Automated testing
~~~~~~~~~~~~~~~~~


Kolibri comes with a Javascript test suite based on `Jest <https://facebook.github.io/jest/>`__. To run all front-end tests:

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
