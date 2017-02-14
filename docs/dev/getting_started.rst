Getting started
===============

First of all, thank you for your interest in contributing to Kolibri! The project was founded by volunteers dedicated to helping make educational materials more accessible to those in need, and every contribution makes a difference. The instructions below should get you up and running the code in no time!

Setting up Kolibri for development
----------------------------------

Most of the steps below require entering commands into your Terminal (Linux, Mac) or command prompt (``cmd.exe`` on Windows) that you will learn how to use and become more comfortable with.

.. tip::
  In case you run into any problems during these steps, searching online is usually the fastest way out: whatever error you are seeing, chances are good that somebody alredy had it in the past and posted a solution somewhere... ;)

Git & GitHub
~~~~~~~~~~~~

#. Install and set-up `Git <https://help.github.com/articles/set-up-git/>`_ on your computer. Try this `tutorial <http://learngitbranching.js.org/>`_ if you need more practice with Git!
#. `Sign up and configure your GitHub account <https://github.com/join>`_ if you don't have one already.
#. `Fork the main Kolibri repository <https://github.com/learningequality/kolibri>`_. This will make it easier to `submit pull requests <https://help.github.com/articles/using-pull-requests/>`_. Read more details `about forking <https://help.github.com/articles/fork-a-repo/>`_ from GitHub.


Install Environment Dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#. Install `Python <https://www.python.org/downloads/windows/>`_ if you are on Windows, on Linux and OSX Python is preinstalled (recommended versions 2.7+ or 3.4+).
#. Install `pip <https://pypi.python.org/pypi/pip>`_ package installer.
#. Install `Node <https://nodejs.org/en/>`_ (recommended version 4+).
#. Install Yarn according the `instructions specific for your OS <https://yarnpkg.com/en/docs/install/>`_.

   .. note::
     * On Ubuntu install Node.js via `nvm <https://github.com/creationix/nvm>`_ to avoid build issues.
     * On a Mac, you may want to consider using the `Homebrew <http://brew.sh/>`_ package manager.

Ready for the fun part in the Terminal? Here we go!


Checking out the code
~~~~~~~~~~~~~~~~~~~~~

#. Make sure you `registered your SSH keys on GitHub <https://help.github.com/articles/generating-ssh-keys>`_.
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
    git fetch  # Check if there are changes upstream
    git checkout develop

.. warning::
  ``develop`` is the active development branch - do not target the ``master`` branch.


Virtual environment
~~~~~~~~~~~~~~~~~~~

It is best practice to use `Python virtual environment <https://virtualenv.pypa.io/en/latest/>`_ to isolate the dependencies of your Python projects from each other. This also allows you to avoid using ``sudo`` with ``pip``, which is not recommended.

You can learn more about using `virtualenv <https://virtualenv.pypa.io/en/stable/userguide/>`_, or follow these basic instructions:

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

  * Users of Windows and other shells such as Fish should read the `guide <https://virtualenv.pypa.io/en/stable/userguide/>`_ for instructions on activating.
  * If you set the ``PIP_REQUIRE_VIRTUALENV`` environment variable to ``true``, pip will only install packages when a virtualenv is active. This can help prevent mistakes.
  * Bash users might also consider using `virtualenvwrapper <http://virtualenvwrapper.readthedocs.io/en/latest/index.html>`_, which simplifies the process somewhat.



Install Project Dependencies
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



Running Kolibri server
----------------------

Development server
~~~~~~~~~~~~~~~~~~

To start up the development server and build the client-side dependencies, use the following commands:

Linux and Mac:

.. code-block:: bash

  (kolibri)$ kolibri manage devserver --debug -- --webpack --qcluster

Windows:

.. code-block:: bash

  (kolibri)$ kolibri manage devserver --debug -- --webpack


Wait for the build process to complete. This takes a while the first time, will complete faster as you make edits and the assets are automatically re-built.

Now you should be able to access the server at ``http://127.0.0.1:8000/``.

.. tip::

  If you need to make the development server available through the LAN, you must leave out the ``--webpack`` flag, and use the following command:

  .. code-block:: bash

    (kolibri)$ yarn run build
    (kolibri)$ kolibri manage devserver --debug -- 0.0.0.0:8000 --qcluster

  Now you can simply use your server's IP from another device in the local network through the port 8000, for example ``http://192.168.1.38:8000/``.


Running the Production Server
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

In production, content is served through CherryPy. Static assets must be pre-built:

.. code-block:: bash

  yarn run build
  kolibri start

Now you should be able to access the server at ``http://127.0.0.1:8080/``.


Contributing code to Kolibri
----------------------------

* Once you've toyed around with things, read through the rest of the :doc:`index`, especially topics in :ref:`architecture` and :ref:`themes` to understand more about the Kolibri structure.
* When you're up to speed with that, you're probably itching to make some contributions! Head over to the `issues page on GitHub <https://github.com/learningequality/kolibri/issues>`_ and take a look at the current project priorities. Try filtering by milestone. If you find a bug in your testing, please `submit your own issue <https://github.com/learningequality/kolibri/issues/new>`_
* Once you've identified an issue and you're ready to start hacking on a solution, get ready to :ref:`pull_request`!

Branching and Release Process
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``develop`` branch is reserved for active development. When we get close to releasing a new stable version/release of Kolibri, we generally fork the develop branch into a new branch (like ``release-0.1.x``). If you're working on an issue tagged for example with the ``release-0.1.x`` milestone, then you should target changes to that branch. Changes to those branches will later be pulled into ``develop`` again. If you're not sure which branch to target, ask the dev team!


.. note::
  At a high level, we follow the 'Gitflow' model. Some helpful references:
  * http://nvie.com/posts/a-successful-git-branching-model/
  * https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow/

.. _pull_request:

Submit Pull Requests
~~~~~~~~~~~~~~~~~~~~~

The most common situation is working off of ``develop`` branch so we'll take it as an example:

.. code-block:: bash

  $ git checkout upstream/develop
  $ git checkout -b name-of-your-bugfix-or-feature

After making changes to the code, commit and push them to a branch on your fork:

.. code-block:: bash

  $ git add -A  # Add all changed and new files to the commit
  $ git commit -m "Write here the commit message"
  $ git push origin name-of-your-bugfix-or-feature

Go to `Kolibri GitHub page <https://github.com/learningequality/kolibri>`_, and if you are logged-in you will see the link to compare your branch and and create the new pull request. **Please fill in all the aplicable sections in the PR template and DELETE unecessary headings**. Another member of the team will review your code, and either ask for updates on your part or merge your PR to Kolibri codebase. Until the PR is merged you can push new commits to your branch and add updates to it.


Additional Recommended Setup
----------------------------

If you're planning on contributing code to the project, there are a few additional steps you should consider taking.


Editor Config
~~~~~~~~~~~~~

We have a project-level *.editorconfig* file to help you configure your text editor or IDE to use our internal conventions.

`Check your editor <http://editorconfig.org/#download>`_ to see if it supports EditorConfig out-of-the-box, or if a plugin is available.


Front-end Dev Tools
~~~~~~~~~~~~~~~~~~~

If you're working with front-end Vue.js and use Google Chrome Dev Tools, you may find the `Vue.js devtools <https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd?hl=en>`_ helpful


DB Setup
~~~~~~~~

You can initialize the server using:

.. code-block:: bash

  kolibri manage migrate


Pre-Commit Install
~~~~~~~~~~~~~~~~~~

We use `pre-commit <http://pre-commit.com/>`_ to help ensure consistent, clean code. The pip package should already be installed from a prior setup step, but you need to install the git hooks using this command.

.. code-block:: bash

  pre-commit install


Development
----------

Linting
~~~~~~~

To improve build times, and facilitate rapid development, Javascript linting is turned off by default when you run the dev server. However, all frontend assets that are bundled will be linted by our Travis CI builds. It is a good idea, therefore, to test your linting before submitting code for PR. To run the devserver in this mode you can run the following command.

.. code-block:: bash

  kolibri manage devserver --debug -- --webpack --qcluster --lint


Code Testing
~~~~~~~~~~~~

Kolibri comes with a Python test suite based on ``py.test``. To run tests in your current environment:

.. code-block:: bash

  python setup.py test  # alternatively, "make test" does the same

You can also use ``tox`` to setup a clean and disposable environment:

.. code-block:: bash

  tox -e py3.4  # Runs tests with Python 3.4

To run Python tests for all environments, lint and documentation tests, use simply ``tox``. This simulates what our CI also does.

To run Python linting tests (pep8 and static code analysis), use ``tox -e lint`` or
``make lint``.

Note that tox, by default, reuses its environment when it is run again. If you add anything to the requirements, you will want to either delete the `.tox` directory, or run ``tox`` with the ``-r`` argument to recreate the environment.

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

Alternatively, this can be run as a subprocess in the development server with the following flag:

.. code-block:: bash

  kolibri manage devserver --debug -- --karma

You can also run tests through Django's ``test`` management command, accessed through the ``kolibri`` command:

.. code-block:: bash

  kolibri manage test

To run specific tests only, you can add ``--``, followed by a label (consisting of the import path to the test(s) you want to run, possibly ending in some subset of a filename, classname, and method name). For example, the following will run only one test, named ``test_admin_can_delete_membership`` in the ``MembershipPermissionsTestCase`` class in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  kolibri manage test -- kolibri.auth.test.test_permissions.MembershipPermissionsTestCase.test_admin_can_delete_membership


Updating Documentation
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
  sphinx-autobuild . _build


Manual Testing
~~~~~~~~~~~~~~

All changes should be thoroughly tested and vetted before being merged in. Our primary considerations are:

 * Performance
 * Accessibility
 * Compatibility
 * Localization
 * Consistency

For more information, see the next section on :doc:`manual_testing`.
