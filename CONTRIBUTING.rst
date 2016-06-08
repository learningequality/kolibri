
Contributing
============

Contributions are welcome, and they are greatly appreciated! Every
little bit helps, and credit will always be given.

You can contribute in many ways:

Types of Contributions
----------------------

Report Bugs
~~~~~~~~~~~

Report bugs at https://github.com/learningequality/kolibri/issues.

If you are reporting a bug, please include:

* Your operating system name and version.
* Any details about your local setup that might be helpful in troubleshooting.
* Detailed steps to reproduce the bug.

Fix Bugs
~~~~~~~~

Look through the GitHub issues for bugs. Anything tagged with "bug"
is open to whoever wants to implement it.

Implement Features
~~~~~~~~~~~~~~~~~~

Look through the GitHub issues for features. Anything tagged with "feature"
is open to whoever wants to implement it.

Write Documentation
~~~~~~~~~~~~~~~~~~~

Kolibri could always use more documentation, whether as part of the
official Kolibri docs, in docstrings, or even on the web in blog posts,
articles, and such.

Submit Feedback
~~~~~~~~~~~~~~~

The best way to send feedback is to file an issue at https://github.com/learningequality/kolibri/issues.

If you are proposing a feature:

* Explain in detail how it would work.
* Keep the scope as narrow as possible, to make it easier to implement.
* Remember that this is a volunteer-driven project, and that contributions
  are welcome :)

Get Started!
------------

Ready to contribute? Here's how to set up `kolibri` for
local development.

1. Fork_ the `kolibri` repo on GitHub.
2. Clone your fork locally::

    $ git clone git@github.com:your_name_here/kolibri.git

3. Create a branch for local development::

    $ git checkout -b name-of-your-bugfix-or-feature

Now you can make your changes locally.

4. When you're done making changes, check that your changes pass style and unit
   tests, including testing other Python versions with tox, and testing any Javascript changes with npm::

    $ tox
    $ npm test

To get tox, just pip install it. To get node (and hence npm) install it from https://nodejs.org.

5. Commit your changes and push your branch to GitHub::

    $ git add .
    $ git commit -m "Your detailed description of your changes."
    $ git push origin name-of-your-bugfix-or-feature

6. Submit a pull request through the GitHub website.

.. _Fork: https://github.com/learningequality/kolibri

Pull Request Guidelines
-----------------------

Before you submit a pull request, check that it meets these guidelines:

1. For your pull request description on Github, consider using our
   template, see :ref:`prtemplate`.
2. Remember to add yourself to ``AUTHORS.rst`` and fill in ``CHANGELOG.rst``
   with your feature or bug fix.
3. The pull request should include tests.
4. If the pull request adds functionality, the docs should be updated. Put
   your new functionality into a function with a docstring, and add the
   feature to the list in README.rst.
5. The pull request should work for Python 2.7, 3.4, and 3.5, and for PyPy.
   PRs will be automatically tested, we recommend running the ``tox`` command
   locally before submitting your PR for review.


.. _prtemplate:

Pull Request Template
~~~~~~~~~~~~~~~~~~~~~

Copy-paste the following to your Pull Request description on Github::

    ## Summary

    *Short description*

    ## TODO

    - [ ] Have tests been written for the new code?
    - [ ] Has documentation been written/updated?
    - [ ] New dependencies (if any) added to requirements file
    - [ ] Add an entry to CHANGELOG.rst
    - [ ] Add yourself it AUTHORS.rst if you don't appear there

    ## Reviewer guidance

    *If you PR has a significant size, give the reviewer some helpful remarks*

    ## Issues addressed

    List the issues solved or partly solved by the PR

    ## Documentation

    If the PR has documentation, link the file here (either .rst in your repo or if built on Read The Docs)

    ## Screenshots (if appropriate)

    They're nice. :)


Tips
----

To run a subset of tests::

	 $ py.test test/test_kolibri.py
