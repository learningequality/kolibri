.. _stack:

Tech stack overview
===================

Kolibri is a web application built primarily using `Python <https://www.python.org/>`__ on the server-side and `JavaScript <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference>`__ on the client-side.


Server
------

The server is a `Django <https://www.djangoproject.com/>`__ application, and contains only pure-Python (2.7+) dependencies at run-time. It is responsible for:

- Interfacing with the database (either `SQLite <https://www.sqlite.org/index.html>`__ or `PostgreSQL <https://www.postgresql.org/>`__)
- Authentication and permission middleware
- Routing and handling of API calls, using the `Django REST Framework <http://www.django-rest-framework.org/>`__
- Top-level URL routing between high-level sections of the application
- Serving basic HTML wrappers for the UI with data bootstrapped into the page
- Serving additional client assets such as fonts and images


Client
------

The frontend user interface is built using `Vue <https://vuejs.org/>`__ and uses ES6 syntax transpiled by `Bublé <https://buble.surge.sh/guide/>`__. The client is responsible for:

- Compositing and rendering the UI
- Managing client-side state using `Vuex <https://vuex.vuejs.org/>`__
- Interacting with the server through the API


Developer docs
--------------

Documentation is formatted using `reStructuredText <http://docutils.sourceforge.net/rst.html>`__ and the output is compiled by `Sphinx <http://www.sphinx-doc.org/en/stable/rest.html>`__ and hosted on `Read the Docs <http://kolibri-dev.readthedocs.io/>`__.

Additionally, information about the design and implementation of Kolibri might be found on Google Drive, Github, Trello, Slack, InVision, mailing lists, office whiteboards, and lurking in the fragmented collective consciousness of our team and contributors.


Build infrastructure
--------------------

We use a combination of both `Node.js <https://nodejs.org/en/>`__ and Python scripts to transform our source code as-written to the code that is run in a browser. This process involves `webpack <https://webpack.github.io/>`__, plus a number of both custom and third-party extensions.

Preparation of client-side resources involves:

- ES6 to ES5
- Transforming Vue.js component files (\*.vue) into JS and CSS
- SCSS to CSS
- Auto-prefixing CSS
- Bundling multiple JS dependencies into single files
- Minifying and compressing code
- Bundle resources such as fonts and images
- Generating source maps
- Providing mechanisms for decoupled "Kolibri plugins" to interact with each other and asynchronously load dependencies

The *Makefile* contains the top-level commands for building Python distributions, in particular `wheel files <https://pythonwheels.com/>`__ (``make dist``) and `pex files <https://pex.readthedocs.io/en/stable/>`__ (``make pex``).

The builds are automated using `buildkite <https://buildkite.com/learningequality>`__, whose top-level configuration lives in the Kolibri repo. Other platform distributions such as `Windows <https://github.com/learningequality/kolibri-installer-windows>`__, `Debian <https://github.com/learningequality/kolibri-installer-debian>`__, and `Android <https://github.com/learningequality/kolibri-installer-android/issues>`__ are built from the wheel files and maintained in their own repositories.

Automated testing
-----------------

We use a number of mechanisms to help encourage code quality and consistency. Most of these are run automatically on Github pull requests, and developers should run them locally too.

- `pre-commit <http://pre-commit.com/>`__ is run locally on ``git commit`` and enforces a variety of code conventions
- We use `EditorConfig <http://editorconfig.org/>`__ to help developers set their editor preferences
- `tox <https://tox.readthedocs.io/en/latest/>`__ is used to run our test suites under a range of Python and Node environment versions
- ``sphinx-build -b linkcheck`` checks the validity of documentation links
- `pytest <http://pytest.org/latest/>`__ runs our Python unit tests. We also leverage the `Django test framework <https://docs.djangoproject.com/en/1.9/topics/testing/>`__.
- In addition to building client assets, `webpack <https://webpack.github.io/>`__ runs linters on client-side code: `ESLint <http://eslint.org/>`__ for ES6 JavaScript, `Stylelint <https://stylelint.io/>`__ for SCSS, and `HTMLHint <http://htmlhint.com/>`__ for HTML and Vue.js components.
- Client-side code is tested using `Jest <https://facebook.github.io/jest/>`__
- `codecov <https://codecov.io/>`__ reports on the test coverage
- We have `Sentry <https://docs.sentry.io/>`__ clients integrated (off by default) for automated error reporting
