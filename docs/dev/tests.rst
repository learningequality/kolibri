Tests
=====

Running the test suite
----------------------

A prerequisite for testing is to have the test environment installed. As a
developer, simply fetch the "dev" requirements::

     $ pip install -r requirements/dev.txt

Running all the tests in your local environment::

     $ py.test

Running tests with a specific Python version:

     $ tox -e py2.7  # or...
     $ tox -e py3.4  # or...
     $ tox -e py3.5  # or... 
     $ tox -e bdd 

The 'bdd' tests are the "Behavior Driven Development" tests, i.e. the heavier
user interface tests.

To run a subset of tests::

     $ py.test test/test_kolibri.py


JS unit tests
-------------

.. note:: TODO! This will be written by one of the JS devs :)
     
Testing philosophy
------------------

.. warning::
    This section an unfinished draft. We should carefully import stuff
    from our Dev Bible. 

We want to achieve a ``>90%`` test coverage! To do that, it's best to do TDD,
meaning to write tests that express what you want to achieve or fix and then
implement that feature or fix the bug.

At all costs? No, definitely not. We don't want too many slow integration tests
that depend on virtual browsers (Selenium) and the like.

Unreliable tests? Are not welcome at all.

Writing tests
-------------

Kolibri has a test discoverer (``py.test``) which automatically detects Python
modules with test cases.

Inside the module that your tests target, place a package ``test`` and files
called ``test_my_module.py``::

    mymodule/
        __init__.py
        test/
            __init__.py
            test_feature.py
