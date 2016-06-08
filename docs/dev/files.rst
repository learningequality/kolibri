Files and Directories
=====================


.cache/...
  Testing-related, and ignored by git. *TODO - what does it contain?*

.eggs/...
  Packaging-related, and ignored by git. *TODO - what does it contain?*

.github/...
  These are `files used by GitHub <https://help.github.com/articles/helping-people-contribute-to-your-project/>`_ to generate templates for things like new pull requests and issues.

.tox/...
  `Tox <https://tox.readthedocs.io/en/latest/>`_ is a tool for testing software in a range of environments - for example using different versions of Python and Node.

  This directory is ignored by git.

  *TODO - what does it contain?*

assets/...
  Code for integrating Kolibri's plugin system with Webpack's build system. The files here interact closely with the files in the related *webpack_config/...* directory.

dist-packages-cache
  Packaging-related, and ignored by git. *TODO - what does it contain?*

dist-packages-temp
  Packaging-related, and ignored by git. *TODO - what does it contain?*

docs/...
  reStructuredText-based documentation, along with `Sphinx-based build code <http://www.sphinx-doc.org/en/stable/>`_

karma_config/...
  Configuration for `Karma <https://karma-runner.github.io/0.13/index.html>`_, our client-side unit test framework

kolibri/...
  main code-base, a Django application

requirements/...
  Python `dependency files <https://pip.pypa.io/en/stable/user_guide/#requirements-files>`_ for PIP

test/...
  helper files for running tests in `Travic CI <https://travis-ci.org/>`_ *TODO - is this correct?*

webpack_config/...
  `webpack <https://webpack.github.io/>`_ instrumentation for bundling client-side dependencies, coupled with scripts in *assets/...*

.editorconfig
  general `editor configuration file <http://editorconfig.org/>`_

.eslintrc.js
  configuration file for `ESLint <http://eslint.org/>`_, our client-side javascript linter

.gitignore
  standard `.gitignore file <https://git-scm.com/docs/gitignore>`_

.htmlhintrc
  configuration for our HTML linter, `HTMLHint <http://htmlhint.com/>`_

.pre-commit-config.yaml
  configuration for our `pre-commit <http://pre-commit.com/>`_ hooks

.stylintrc
  configuration for our `Stylus <http://stylus-lang.com/>`_ linter, `Stylint <https://rosspatton.github.io/stylint/>`_

.travis.yml
  configuration for `Travis <https://docs.travis-ci.com/user/customizing-the-build/>`_

AUTHORS.rst, CHANGELOG.rst, CONTRIBUTING.rst
  reStructuredText-formatted files. Also imported by the generated */docs*

LICENSE
  plain-text license files

Makefile
  wrapper for some scripts, including building packages and docs

MANIFEST.in
  list of non-python files to include in the Python package

package.json
  javascript dependencies, helper scripts, and configuration

pytest.bdd.ini, pytest.ini
  configuration files for `pytest <http://pytest.org/latest/>`_

pytest_runner-2.7.1-py2.7.egg
  ?

README.rst
  reStructuredText-formatted file readme

requirements.txt
  Python PIP dependency requirements, simply redirects to *requirements/base.txt*

setup.cfg
  ?

setup.py
  configuration for Python package related to `setuptools <https://pythonhosted.org/an_example_pypi_project/setuptools.html>`_

tox.ini
  configuration for our `Tox test environments <https://tox.readthedocs.io/en/latest/>`_



