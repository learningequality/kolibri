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

Changes can be built and released in ``kolibri-proposed`` by the `Learning Equality Launchpad team <https://launchpad.net/~learningequality>`__.

Working in the repo
-------------------

You can also make changes in the cloned repository in the following workflow:

#. Install pre-commit hooks (see `Pre-commit`_ below)
#. Make your changes
#. Run ``dch``, carefully noting your release notes.
#. Build the package with ``make deb``
#. Test the package with  ``sudo dpkg -i ../kolibri-server_VERSION.deb``
#. If you have further changes, you can keep editing and invoking ``make dist``
#. Finally, commit your changes and open a PR, including your entry in ``debian/changelog``

Pre-commit
~~~~~~~~~~

This repository uses `pre-commit <https://pre-commit.com/>`__ to run linting checks (yamlfmt, actionlint, trailing whitespace, etc.) before each commit.

To set up pre-commit locally::

  pip install pre-commit
  pre-commit install

After this, pre-commit hooks will run automatically on ``git commit``. To run all hooks manually against all files::

  pre-commit run --all-files

Releasing
---------

Automated release workflow
~~~~~~~~~~~~~~~~~~~~~~~~~~

Publishing a GitHub release triggers the ``build_debian.yml`` workflow, which:

#. Validates the release tag version against ``debian/changelog``
#. Builds, signs, and uploads the source package to the ``kolibri-proposed`` PPA via ``dput``
#. Waits for Launchpad to build the source package
#. Copies the built package to all supported Ubuntu series
#. Waits for all copy builds to complete
#. (Non-prerelease only) Requires manual approval via the ``release`` environment
#. Promotes packages from ``kolibri-proposed`` to ``kolibri`` PPA

Launchpad credentials setup
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The workflow requires Launchpad API credentials stored as a GitHub Actions secret.

To generate credentials:

#. Install launchpadlib: ``pip install launchpadlib``
#. Run the credentials helper script::

     python3 scripts/create_lp_creds.py

#. Approve the authorization request in your browser. This writes a credentials file (default: ``launchpad.credentials``).
#. Copy the full content of the credentials file.
#. In GitHub, go to the repository **Settings > Secrets and variables > Actions > New repository secret**.
#. Create a secret named ``LP_CREDENTIALS`` and paste the credentials file content.

The workflow writes this secret to a temporary file at runtime and cleans it up after each job.

Manual workflow dispatch
~~~~~~~~~~~~~~~~~~~~~~~~

The workflow supports a ``workflow_dispatch`` trigger for manual reruns. This is useful when a release workflow fails partway through — you can fix the issue and rerun the workflow without it breaking because earlier steps already succeeded.

To trigger from the GitHub UI:

#. Go to **Actions > Build Debian source package > Run workflow**
#. Click **Run workflow**

To trigger from the command line::

  gh workflow run build_debian.yml

When triggered via ``workflow_dispatch``:

- The ``build_package`` and ``wait_for_source_builds`` jobs are skipped (no release artifact to upload)
- The version is read from ``debian/changelog`` instead of the release tag
- The ``block_release_step`` manual approval gate is skipped
- All copy and promote steps run normally — they are idempotent and safely handle packages that were already copied in a previous run

Launchpad copy script
~~~~~~~~~~~~~~~~~~~~~

The ``scripts/launchpad_copy.py`` script manages Launchpad PPA operations with three subcommands:

``copy-to-series``
  Copies packages from the source Ubuntu series to all other supported series within the ``kolibri-proposed`` PPA::

    python3 scripts/launchpad_copy.py copy-to-series

``promote``
  Promotes all published packages from ``kolibri-proposed`` to the ``kolibri`` PPA::

    python3 scripts/launchpad_copy.py promote

``wait-for-builds``
  Polls Launchpad until all builds for a source package reach a terminal state::

    python3 scripts/launchpad_copy.py wait-for-builds --package kolibri-server --version 1.0.0

All subcommands are idempotent — rerunning them after a partial success safely skips packages that were already copied or promoted.

Additional flags: ``-v`` / ``-vv`` for verbosity, ``-q`` for quiet mode, ``--debug`` for HTTP-level debugging.

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
