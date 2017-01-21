Guide for new Kolibri contributors
==================================

First of all, thank you for your interest in contributing to Kolibri! The project was founded by volunteers dedicated to helping make educational materials more accessible to those in need, and every contribution makes a difference. The instructions below should get you up and running the code in no time! 

Setting up Kolibri for development
----------------------------------

Most of the steps below require entering commands into your Terminal (Linux, Mac) or command prompt (``cmd.exe`` on Windows) that you will learn how to use and become more comfortable with. 

Git & GitHub
~~~~~~~~~~~~

#. Install and set-up `Git <https://help.github.com/articles/set-up-git/>`_ on your computer. Try this `tutorial <http://learngitbranching.js.org/>`_ if you need more practice with Git!
#. `Sign up and configure your GitHub account <https://github.com/join>`_ if you don't have one already.
#. `Fork the main Kolibri repository <https://github.com/learningequality/kolibri>`_. This will make it easier to `submit pull requests <https://help.github.com/articles/using-pull-requests/>`_. Read more details `about forking <https://help.github.com/articles/fork-a-repo/>`_ from GitHub.


Install environment dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#. Install `Python <https://www.python.org/downloads/windows/>`_ if you are on Windows, on Linux and OSX Python is preinstalled (recommended versions 2.7+ or 3.4+).
#. Install `pip <https://pypi.python.org/pypi/pip>`_ package installer.
#. Install `Node <https://nodejs.org/en/>`_ (recommended version 4+).
   
   .. note::
     * On Ubuntu install Node.js via `nvm <https://github.com/creationix/nvm>`_ to avoid build issues.
     * On a Mac, you may want to consider using the `Homebrew <http://brew.sh/>`_ package manager.


.. tip::
  In case you run into any problems during these steps, searching online is usually the fastest way out: whatever error you are seeing, chances are good that somebody alredy had it in the past and posted a solution somewhere... ;)


Ready for the fun part in the Terminal? Here we go!


Checking out the code
~~~~~~~~~~~~~~~~~~~~~

* Make sure you `registered your SSH keys on GitHub <https://help.github.com/articles/generating-ssh-keys>`_.
* **Clone** your Kolibri fork to your local computer. In the following commands replace ``$USERNAME`` with your own GitHub username:

 * using SSH: ``git clone git@github.com:$USERNAME/kolibri.git``

 * using HTTPS: ``git clone https://github.com/$USERNAME/kolibri.git``

* Enable syncing your local repository with **upstream**,  which refers to the Kolibri source from where you cloned your fork. That way you can keep it updated with the changes from the rest of Kolibri team contributors:

.. code-block:: bash

  cd kolibri  # Change into the newly cloned directory
  git remote add upstream git@github.com:learningequality/kolibri.git  # Add the upstream
  git fetch  # Check if there are changes upstream
  git checkout develop

.. warning::
  ``develop`` is the active development branch - do not target the ``master`` branch.


Virtual environment
~~~~~~~~~~~~~~~~~~~

It's generally good practice to use `Python virtual environment <https://virtualenv.pypa.io/en/latest/>`_ to isolate your project(s) and allow you to install different packages, even with different versions. This also allows you to avoid using ``sudo`` with the ``pip`` commands below, which is not recommended.

Follow these `instructions to create a new virtual environment and activate it <http://docs.python-guide.org/en/latest/dev/virtualenvs/>`_. You may also want to consider using `virtualenvwrapper <http://virtualenvwrapper.readthedocs.io/en/latest/index.html>`_.

.. code-block:: bash

  $ sudo pip install virtualenv
  ...
  $ pip install virtualenvwrapper
  ...
  $ export WORKON_HOME=~/Envs
  $ mkdir -p $WORKON_HOME
  $ source /usr/local/bin/virtualenvwrapper.sh
  $ mkvirtualenv --python=python3 kolibri
  $ workon kolibri 
  (kolibri)$ 

.. note::
  In this document we use the name ``kolibri``, but you can name the virtual environment however you wish.


Install Python dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To install Kolibri project-specific dependencies make sure you're in the ``kolibri`` directory and run:

.. code-block:: bash

  (kolibri)$ pip install -r requirements.txt
  (kolibri)$ pip install -r requirements_dev.txt

  # NodeJS dependency packages for building the frontend code:
  (kolibri)$ npm install

  # Kolibri Python package in 'editable' mode, so your installation points to your git checkout:
  (kolibri)$ pip install -e .


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


Wait for the build process to complete. This takes a while the first time, but it will complete faster when you edit the code and the assets are automatically re-built.

Now you should be able to access the server at ``http://127.0.0.1:8000/``.


Production server
~~~~~~~~~~~~~~~~~

In production, content is served through `CherryPy <http://cherrypy.org/>`_ and static assets must be pre-built:

.. code-block:: bash

  $ npm run build
  $ kolibri start

Now you should be able to access the server at ``http://127.0.0.1:8080/`` in your browser.


Adding content channel to Kolibri
---------------------------------

You can use this small channel for testing features in development:

* Channel ID 8b4d3e6d3d4842ba8ea658335b5dd252
* Size 19Mb, 4 level deep hierarchy, 8 videos, 4 PDFs, 4 MP3 files

.. code-block:: bash

  $ kolibri manage importchannel -- network 8b4d3e6d3d4842ba8ea658335b5dd252
  $ kolibri manage importcontent -- network 8b4d3e6d3d4842ba8ea658335b5dd252


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

Update Documentation
~~~~~~~~~~~~~~~~~~~~

First, install some additional dependencies related to building documentation output:

.. code-block:: bash

  $ pip install -r requirements/docs.txt
  $ pip install -r requirements/build.txt

To make changes to documentation, edit the ``rst`` files in the ``kolibri/docs`` directory and then run:

.. code-block:: bash

  $ make html

You can also run the auto-build for faster editing from the ``docs`` directory:

.. code-block:: bash

  $ cd docs
  $ sphinx-autobuild . _build


Manual Testing
~~~~~~~~~~~~~~

All changes should be thoroughly tested and vetted before being merged in. Our primary considerations are:

 * Performance
 * Accessibility
 * Compatibility
 * Localization
 * Consistency

For more information, see the section on :doc:`manual_testing`.