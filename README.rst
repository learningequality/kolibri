Kolibri – Read Me
=================

.. image:: https://travis-ci.org/learningequality/kolibri.svg
    :target: https://travis-ci.org/learningequality/kolibri
.. image:: http://codecov.io/github/learningequality/kolibri/coverage.svg?branch=master
   :target: http://codecov.io/github/learningequality/kolibri?branch=master
.. image:: https://readthedocs.org/projects/kolibri/badge/?version=latest
   :target: http://kolibri.readthedocs.org/en/latest/

What is Kolibri?
----------------

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of
learners and teachers in contexts with limited infrastructure. A user can install Kolibri and serve the app on a local
network, without an internet connection. Kolibri installations can be linked to one another, so that user data and
content can be shared. Users can create content for Kolibri and share it when there is network access to another
Kolibri installation or the internet.

At its core, Kolibri is about serving educational content. A typical user (called a Learner) will log in to Kolibri
to consume educational content (videos, documents, other multimedia) and test their understanding of the content by
completing exercises and quizzes, with immediate feedback. A user’s activity will be tracked to offer individualized
insight (like "next lesson" recommendations), and to allow user data to be synced across different installations --
thus a Kolibri learner can use his or her credentials on any linked Kolibri installation, for instance on different
devices at a school.

How can I contribute?
---------------------

`Join the mailing list <https://groups.google.com/a/learningequality.org/forum/#!forum/dev>`_ and check out the `contributing <CONTRIBUTING.rst>`_ page


Developing Kolibri
------------------

This is how we typically set up a development environment.
Adjust according to your operating system or personal preferences.

#. Check out the repository::

    $ git clone git@github.com:learningequality/kolibri.git
    $ cd kolibri/

#. Install a virtual environment for development (Python 2 or Python 3, you choose!)::

    $ sudo pip install virtualenvwrapper

#. Follow `these instructions <http://virtualenvwrapper.readthedocs.org/en/latest/install.html#basic-installation>`_. You will need to source the virtualenvwrapper.sh file for the following commands to work::

    $ mkvirtualenv --python=python3 kolibri
    $ workon kolibri

#. Install `Node.js <https://nodejs.org/en/>`_. We test on versions v0.12, v4, and v5.
   (Note: on Ubuntu, you may encounter issues building if you don't use Node.js installed via `nvm <https://github.com/creationix/nvm>`_.)

#. Install all Node.js dependency packages for building the frontend code::

    $ npm install

#. Install the Python packages needed for development::

   $ sudo pip install -r requirements/dev.txt

#. Install the Kolibri Python package in 'editable' mode, meaning your installation will point to your git checkout::

    $ pip install -e .

#. Run the migration script to create and initialize the database::

    $ kolibri manage migrate

#. Run the development server::

    $ kolibri manage devserver --debug

#. To run the development server and build frontend assets synchronously, use the following command::

    $ kolibri manage devserver --debug -- --webpack

#. Install pre-commit hooks to ensure you commit good code::

    $ pre-commit install


Testing
-------

Kolibri comes with a Python test suite based on ``py.test``. To run tests in your
current environment::

    $ python setup.py test  # alternatively, "make test" does the same

You can also use ``tox`` to setup a clean and disposable environment::

    $ tox -e py3.4  # Runs tests with Python 3.4

To run Python tests for all environments, lint and documentation tests,
use simply ``tox``. This simulates what our CI also does.

To run Python linting tests (pep8 and static code analysis), use ``tox -e lint`` or
``make lint``.

Note that tox, by default, reuses its environment when it is run again. If you add anything to the requirements,
you will want to either delete the `.tox` directory, or run ``tox`` with the ``-r`` argument to recreate the environment.

We strive for 100% code coverage in Kolibri. When you open a Pull Request, code coverage (and your impact on coverage)
will be reported. To test code coverage locally, so that you can work to improve it, you can run the following::

    $ tox -e py3.4
    $ coverage html

    <open the generated ./htmlcov/index.html file in your browser>

Kolibri comes with a Javascript test suite based on ``mocha``. To run all tests::

    $ npm test

This includes tests of the bundling functions that are used in creating front end assets.
To do continuous unit testing for code, and jshint running::

    $ npm run test-karma:watch

Alternatively, this can be run as a subprocess in the development server with the following flag::

    $ kolibri manage devserver --debug -- --karma

You can also run tests through Django's ``test`` management command, accessed through the ``kolibri`` command::

    $ kolibri manage test

To run specific tests only, you can add ``--``, followed by a label (consisting of the import path to the test(s)
you want to run, possibly ending in some subset of a filename, classname, and method name). For example, the
following will run only one test, named ``test_admin_can_delete_membership`` in the ``MembershipPermissionsTestCase``
class in kolibri/auth/test/test_permissions.py::

    $ kolibri manage test -- kolibri.auth.test.test_permissions.MembershipPermissionsTestCase.test_admin_can_delete_membership


Documentation
-------------

Usage, development dovs, and API features are taking shape in ``docs/`` and are readable and online on `Read The Docs <http://kolibri.readthedocs.org/en/latest/>`_

Other documents:

* Development documentation is in our `Google Drive <https://drive.google.com/open?id=0B-uSasYw3d7la01HeTlBWl9xdEk>`_, which you can view and comment on.
* `Our governance model <https://drive.google.com/open?id=1Hebvda2YIMed__MDDVrg1iJav2YHK4zYEXJ59ITmCcE>`_
* `The Kolibri dev bible <https://drive.google.com/open?id=1s8kqh1NSbHlzPCtaI1AbIsLsgGH3bopYbZdM1RzgxN8>`_, which is being superseded over time by the documentation in this repo.
