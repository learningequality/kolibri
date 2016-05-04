Kolibri
=============================

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

`Join the mailing list! <https://groups.google.com/a/learningequality.org/forum/#!forum/dev>`_

The project is just starting, but we want the entire development process, from conception to realization, to be carried
out in the open. More will be added to this section in the very near future!

Running Kolibri
---------------

This is how we typically set up a development environment.
Adjust according to your operating system or personal preferences.

#. Check out the repository::

    $ git clone git@github.com:learningequality/kolibri.git
    $ cd kolibri/

#. Install a virtual environment for development (Python 2 or Python 3, you choose!)::

    $ sudo pip install virtualenvwrapper
    $ mkvirtualenv --python=python3 kolibri
    $ workon kolibri

#. Ensure NodeJS is installed, using a platform-appropriate installer. We test on versions v0.12, v4, and v5.
   On Ubuntu, you may encounter issues building if you don't use NodeJS installed via [nvm](https://github.com/creationix/nvm).

#. Install all NodeJS dependency packages for building the frontend code::

    $ npm install

#. Install kolibri as an editable, meaning your installation will point to your git checkout::

    $ pip install -e .

#. Run the development server::

    $ kolibri manage runserver

# Install pre-commit hooks to ensure you commit good code::

    $ pre-commit install


To build frontend assets for production use the following::

    $ npm run build

To build frontend assets in development mode with sourcemaps and watching::

    $ npm run watch

Testing
-------

Kolibri comes with a Python test suite based on ``py.test``. To run tests in your
current environment::

    $ python setup.py test  # alternatively, "make test" does the same

You can also use ``tox`` to setup a clean and disposable environment::

    $ tox -e py3.4  # Runs tests with Python 3.4

To run Python tests for all environments, lint and documentation tests,
use simply ``tox``. This simulates what our CI also does.

To run linting tests (pep8 and static code analysis), use ``tox -e lint`` or
``make lint``.

Kolibri comes with a Javascript test suite based on ``mocha``. To run all tests::

    $ npm test

This includes tests of the bundling functions that are used in creating front end assets.
To do continuous unit testing for code, and jshint running::

    $ npm run ci

You can also run tests through Django's ``test`` management command, accessed through the ``kolibri`` command::

    $ kolibri manage test

To run specific tests only, you can add ``--``, followed by a label (consisting of the import path to the test(s)
you want to run, possibly ending in some subset of a filename, classname, and method name). For example, the
following will run only one test, named ``test_admin_can_delete_membership`` in the ``MembershipPermissionsTestCase``
class in kolibri/auth/test/test_permissions.py::

    $ kolibri manage test -- kolibri.auth.test.test_permissions.MembershipPermissionsTestCase.test_admin_can_delete_membership


Current Features
----------------

This is a WIP. Architecture is new, and many things are mentioned with the predecessor KA Lite in mind.

Software architecture
~~~~~~~~~~~~~~~~~~~~~

* Using py.test
* Using tox to build py 2.7, 3.4, 3.5 and pypy
* Automatic linting test (pep8)
* Static code analysis check (pyflakes)
* Travis CI (intention to replace with Circle)
* Integration tests are separate from application code in ``test/``
* Unit tests live in ``kolibri/test`` and ``kolibri/plugins/core/plugin_name/tests``
* An example plugin is provided in ``kolibri/plugins/core/example``


Documentation
-------------

Usage and API features are taking shape in ``docs/`` and are readable and online on `Read The Docs <http://kolibri.readthedocs.org/en/latest/>`_

Development documentation is in our `Google Drive <https://drive.google.com/open?id=0B-uSasYw3d7la01HeTlBWl9xdEk>`_,
which you can view and comment on.

You may wish to start with the following documents:

* `Our governance model <https://drive.google.com/open?id=1Hebvda2YIMed__MDDVrg1iJav2YHK4zYEXJ59ITmCcE>`_
* `The Kolibri dev bible <https://drive.google.com/open?id=1s8kqh1NSbHlzPCtaI1AbIsLsgGH3bopYbZdM1RzgxN8>`_, which aims to be the authoritative guide to Kolibri.
