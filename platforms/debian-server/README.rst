Kolibri server installer source for Debian
==========================================

This package automates the configuration of a local web server setup to optimize Kolibri for several clients.

It configures and starts Nginx & UWSGI to work together with Kolibri, so caching of static assets is done and use of multicore architecture most servers have is activated when possible.

Building and developing
-----------------------

To fetch and build a new version of this package, the following workflow is suggested:

#. Install the `kolibri-proposed development PPA <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri-proposed>`__
#. Enable source repositories in ``/etc/apt/sources.list.d/learningequality-ubuntu-kolibri-proposed*``
#. Run ``sudo apt update``
#. Fetch the latest source package: ``apt source kolibri-server``
#. Run ``dch`` to edit the changelog. If ``dch`` is not available, then install: ``sudo apt install devscripts``
#. Make changes in ``<unpacked-package>/debian`` and run ``dpkg-buildpackage`` in order to test a new build.
#. Copy your changed files in ``<unpacked-package>/debian`` to your git checkout
#. Create a PR

You can optimize this workflow according to your own needs.

Changes can be built and released in ``kolibri-proposed`` by the `Learning Equality Launchpad team <https://launchpad.net/~learningequality/>`__.

Working in the repo
-------------------

You can also make changes in the cloned repository in the following workflow:

#. Make your changes
#. Run ``dch``, carefully noting your release notes. 
#. Build the package with ``make deb``
#. Test the package with  ``sudo dpkg -i ../kolibri-server_VERSION.deb``
#. If you have further changes, you can keep editing and invoking ``make dist``
#. Finally, commit your changes and open a PR, including your entry in ``debian/changelog``

Releasing
---------

Push new changes to ``kolibri-proposed`` and test them there.

To build packages for all current Ubuntu release series:

#. Install Launchpadlib: ``sudo apt install python-launchpadlib``
#. Run ``ppa-copy-packages.py`` script to copy the builds for Xenial to all other currently active and supported Ubuntu releases on Launchpad. The script is run from command line with ``python2 ppa-copy-packages.py``. After this, you should be prompted to create an API key for your Launchpad account.
#. When a release in ``kolibri-proposed`` should be released as a stable release, use the binary copy function on Launchpad to copy builds from ``kolibri-proposed``.

Overview
--------

This package depends on the main ``kolibri`` Debian package, from versions 0.12 and up.

* ``kolibri.service``: The system service provided by the ``kolibri`` package is configured such that the built-in web server (HTTP server 'Cherry Py') is disabled. The Kolibri service still runs and is responsible for setting up the initial database, keeping it migrated and for handling all channel downloads as the main background worker daemon. The system service is disabled when installing ``kolibri-server``, but is started by the ``kolibri-server.init`` script.
* ``kolibri-server.service``: Starts UWSGI workers. Depends on Nginx running. Intentionally does not depend on ``kolibri.service`` as it is disabled.
* ``kolibri-server.init``: Starts ``kolibri`` and creates 2 dynamic configuration files to include in the configuration of UWSGI workers and Nginx.

Configuration
-------------

You can configure the behavior of the UWSGI workers, by adding ``.ini`` files to ``/etc/kolibri/uwsgi.d/``.

You can configure the main Nginx site and overwrite defaults by adding ``.conf`` files in to ``/etc/kolibri/nginx.d/``.

Testing
-------

To run a build and installation test, you can use the following command to do so with docker::

  docker build --build-arg TARGET_IMAGE=ubuntu:22.04 -f test/Dockerfile --target test .
