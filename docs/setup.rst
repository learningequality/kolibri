Development Environment
=======================

Basic Setup
-------------

This is how we typically set up a development environment.

Note that most of the steps that follow require entering commands into your terminal, so you should be comfortable with that.


Install Environment Dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You'll need to install the following dependencies:

- Python (including pip) - recommended version 2.7+ or 3.4+
- Node.js - recommended version 4+
- git

The process for installing these depends on your operating system.

.. note::

  - On Ubuntu, it is recommended to install Node.js via `nvm <https://github.com/creationix/nvm>`_ to avoid build issues.
  - On a Mac, you may want to consider using the `Homebrew <http://brew.sh/>`_ package manager.



Clone the Repository
~~~~~~~~~~~~~~~~~~~~

First clone the repo:

.. code-block:: bash

  git clone git@github.com:learningequality/kolibri.git

Then, ``cd`` into the new directory:

.. code-block:: bash

  cd kolibri


.. note::

  If you plan on contributing code, you may want to `fork our github repo <https://github.com/learningequality/kolibri>`_ and clone from your repo, rather than cloning from the learningequality repo. That will make it easier to `submit pull requests <https://help.github.com/articles/using-pull-requests/>`_.


Install Project Dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Install project-specific development dependencies.

.. note::

  It is considered best-practice to use a `Python virtual environment <https://virtualenv.pypa.io/en/stable/>`_ to isolate your Python dependencies during development. You may also want to consider using `virtualenvwrapper <http://virtualenvwrapper.readthedocs.io/en/latest/index.html>`_.

  If you're *not* using a Python virtual environment, you may need to use ``sudo`` with the ``pip install`` commands below.

  (``npm install`` automatically isolates project dependencies and works without ``sudo``.)


Run the following commands:

.. code-block:: bash

  # Node.js dependencies
  npm install

  # Python requirements
  pip install -r requirements.txt
  pip install -r requirements/dev.txt

  # Kolibri Python package in 'editable' mode
  pip install -e .


Run the Server
~~~~~~~~~~~~~~

Then, start up the development server and build the client-side dependencies:

.. code-block:: bash

  kolibri manage devserver --debug -- --webpack

Wait for the build process to complete. This takes a while the first time, will complete faster as you make edits and the assets are automatically re-built.

Now you should be able to access certain URLs, in particular:

- ``http://127.0.0.1:8000/learn/``
- ``http://127.0.0.1:8000/management/``


.. warning ::

  Currently no page is set up at the root URL (``http://127.0.0.1:8000/``), so don't be suprised if that returns a 404.


Additional Recommended Setup
----------------------------

If you're planning on contributing code to the project, there are a few additional steps you should consider taking.


Editor Config
~~~~~~~~~~~~~

We have a project-level *.editorconfig* file to help you configure your text editor or IDE to use our internal conventions.

`Check your editor <http://editorconfig.org/#download>`_ to see if it supports EditorConfig out-of-the-box, or if a plugin is available.


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

  npm test

This includes tests of the bundling functions that are used in creating front end assets. To do continuous unit testing for code, and jshint running:

.. code-block:: bash

  npm run test-karma:watch

Alternatively, this can be run as a subprocess in the development server with the following flag:

.. code-block:: bash

  kolibri manage devserver --debug -- --karma

You can also run tests through Django's ``test`` management command, accessed through the ``kolibri`` command:

.. code-block:: bash

  kolibri manage test

To run specific tests only, you can add ``--``, followed by a label (consisting of the import path to the test(s) you want to run, possibly ending in some subset of a filename, classname, and method name). For example, the following will run only one test, named ``test_admin_can_delete_membership`` in the ``MembershipPermissionsTestCase`` class in kolibri/auth/test/test_permissions.py:

.. code-block:: bash

  kolibri manage test -- kolibri.auth.test.test_permissions.MembershipPermissionsTestCase.test_admin_can_delete_membership


Documentation Editing
~~~~~~~~~~~~~~~~~~~~~

To make changes to documentation, make an edit and then run:

.. code-block:: bash

  make docs

You can also ``cd`` into the docs directory and run the auto-build for faster editing:

.. code-block:: bash

  cd docs
  sphinx-autobuild . _build


