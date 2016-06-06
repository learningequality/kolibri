Tech Stack
==========

Kolibri is a web application built primarily using `Python <https://www.python.org/>`_ on the server-side and `JavaScript <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference>`_ on the client-side.

We use many run-time, development, and build-related technologies and tools, as outlined below.


Server
------

The server is a `Django 1.9 <https://docs.djangoproject.com/en/1.9/>`_ application, and contains only pure-Python (2.7+) libraries dependencies at run-time.

The server is responsible for:

- Interfacing with the database (`PostgreSQL <https://www.postgresql.org/>`_) containing user, content, and language pack data
- Authentication and permission middleware
- Routing and handling of API calls, using the `Django REST Framework <http://www.django-rest-framework.org/>`_
- Basic top-level URL routing between high-level sections of the application
- Serving basic HTML wrappers for the UI with data bootstrapped into the page
- Serving additional client assets such as fonts and images

*TODO - how does Morango fit into this picture? Logging?*


Client
------

The front-end user interface is built using HTML, the `Stylus <http://stylus-lang.com/>`_ CSS-preprocessing language, and the `ES2015 preset features of ES6 <https://babeljs.io/docs/plugins/preset-es2015/>`_ JavaScript.

The frontend targets IE9 and up, with an emphasis on tablet-size screens. We strive to use accessible, semantic HTML with support for screen readers, keyboard interaction, and right-to-left language support.

The client is responsible for:

- Compositing and rendering the UI using `Vue.js <https://vuejs.org/>`_ components to build nested views
- Managing client-side state using `Vuex <http://vuex.vuejs.org/en/index.html>`_
- Interacting with the server through HTTP requests

`loglevel <http://pimterry.github.io/loglevel/>`_ is used for logging.


Internationalization
--------------------

We leverage the `ICU Message <http://userguide.icu-project.org/formatparse/messages>`_ syntax for formatting all user-facing text.

On the client-side, these strings are rendered using `Format.js <http://formatjs.io/>`_ and integrated with Vue.js using `vue-intl <https://github.com/learningequality/vue-intl>`_.

*TODO: server-side, message extraction, translation*


Developer Docs
--------------

Documentation for Kolibri developers are formatted using `reStructuredText <http://docutils.sourceforge.net/rst.html>`_ and the output is generated using `Sphinx <http://www.sphinx-doc.org/en/stable/rest.html>`_. Most of the content is in the ``/docs`` directory, but some content is also extracted from Python source code and from files in the root directory. We use `Read the Docs <http://kolibri.readthedocs.io/en/latest/>`_ to host a public version of our documentation.

Additionally, information about the design and implementation of Kolibri might be found on Google Drive, Trello, Slack, InVision, mailing lists, office whiteboards, and lurking in the fragmented collective consciousness of our contributors.


Build Infrastructure
--------------------

Client-side Resources
~~~~~~~~~~~~~~~~~~~~~

We use a combination of both `Node.js <https://nodejs.org/en/>`_ and Python scripts to transform our source code as-written to the code that is run in a browser. This process involves `webpack <https://webpack.github.io/>`_, plus a number of both custom and third-party extensions.

Preparation of client-side resources involves:

- ES6 to ES5
- Transforming Vue.js component files (\*.vue) into JS and CSS
- Stylus to CSS
- Auto-prefixing CSS
- Bundling multiple JS dependencies into single files
- Minifying and compressing code
- Bundle resources such as fonts and images
- Generating source maps
- Providing mechanisms for decoupled "Kolibri plugins" to interact with each other and asynchronously load dependencies
- Linting to enforce code styles


Server Setup
~~~~~~~~~~~~

The standard `Django manage.py commands <https://docs.djangoproject.com/en/1.9/ref/django-admin/>`_ are used under-the-hood for database migration and user set-up.

*TODO: is this accurate?*


Installers and Packages
~~~~~~~~~~~~~~~~~~~~~~~

*TODO: introduce stack (sdist, PyPi, Debian, Windows, etc)*


Continuous Integration
~~~~~~~~~~~~~~~~~~~~~~

*TODO: introduce stack (GitHub, CodeCov, Travis, commit hooks)*



Tests and Linting
~~~~~~~~~~~~~~~~~

We use a number of mechanisms to help encourage code quality and consistency. These checks enforce a subset of our :doc:`conventions`.

- `pre-commit <http://pre-commit.com/>`_ is run locally on ``git commit`` and enforces some Python conventions
- We use `EditorConfig <http://editorconfig.org/>`_ to help developers set their editor preferences
- `flake8 <https://flake8.readthedocs.io/en/latest/>`_ is also used to enforce Python conventions
- `tox <https://tox.readthedocs.io/en/latest/>`_ is used to run our test suites under a range of Python and Node environment versions
- ``sphinx-build -b linkcheck`` checks the validity of documentation links
- `pytest <http://pytest.org/latest/>`_ runs our Python unit tests. We also leverage the `Django test framework <https://docs.djangoproject.com/en/1.9/topics/testing/>`_.
- In addition to building client assets, `webpack <https://webpack.github.io/>`_ runs linters on client-side code: `ESLint <http://eslint.org/>`_ for ES6 JavaScript and `Stylint <https://rosspatton.github.io/stylint/>`_ for Stylus.
- Client-side code is tested using a stack of tools including `Karma <https://karma-runner.github.io/0.13/index.html>`_, `Mocha <https://mochajs.org/>`_, `PhantomJS <http://phantomjs.org/>`_, `Sinon <http://sinonjs.org/>`_, and `rewire <https://github.com/jhnns/rewire>`_. *TODO: Explain what each of these do*
- `codecov <https://codecov.io/>`_ reports on the test coverage for Python and Node.js code. *TODO - also client-side?*


Helper Scripts
---------------

*TODO: introduce stack (kolibri command, makefiles, npm commands, sphinx auto-build, etc)*


