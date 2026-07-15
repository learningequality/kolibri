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

#. Set up the monorepo pre-commit hooks (run ``prek install`` at the repository root)
#. Make your changes
#. Build the package with ``make deb``
#. Test the package with  ``sudo dpkg -i ../kolibri-server_VERSION.deb``
#. If you have further changes, you can keep editing and invoking ``make dist``
#. Finally, commit your changes and open a PR

Linting runs through the monorepo's shared prek configuration — see the repository ``AGENTS.md`` for the full development setup.

Releasing
---------

Release workflow
~~~~~~~~~~~~~~~~

Releases are published to Launchpad by the ``platform-debian-server-release.yml`` workflow ("Release kolibri-server"), run manually via ``workflow_dispatch``. It:

#. Resolves the workspace Kolibri version and refuses to publish a dev/local build — only real releases and pre-releases reach the PPA
#. Generates ``debian/changelog`` from that Kolibri version
#. Builds, signs, and uploads the source package to the ``kolibri-proposed`` PPA via ``dput``
#. Waits for Launchpad to build the source package
#. Copies the built package to all supported Ubuntu series
#. Waits for all copy builds to complete
#. Requires manual approval via the ``release`` environment
#. Promotes packages from ``kolibri-proposed`` to the ``kolibri`` PPA

The ``.deb`` version is bound to the Kolibri version, so there is no separate release tag to validate against. Building and publishing the GitHub Pages APT repo is handled separately and is not part of this workflow.

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

Triggering the workflow
~~~~~~~~~~~~~~~~~~~~~~~

To trigger from the GitHub UI:

#. Go to **Actions > Release kolibri-server > Run workflow**
#. Click **Run workflow**

To trigger from the command line::

  gh workflow run platform-debian-server-release.yml

All copy and promote steps are idempotent, so if a release fails partway through you can fix the issue and rerun — packages already copied or promoted in a previous run are safely skipped.

Launchpad copy script
~~~~~~~~~~~~~~~~~~~~~

The ``scripts/launchpad_copy.py`` script manages Launchpad PPA operations with four subcommands:

``check-source``
  Checks whether a source package version already exists in a PPA::

    python3 scripts/launchpad_copy.py check-source --package kolibri-server --version 0.19.0

``wait-for-published``
  Polls Launchpad until published binaries appear for a source package::

    python3 scripts/launchpad_copy.py wait-for-published --package kolibri-server --version 0.19.0

``copy-to-series``
  Copies packages from the source Ubuntu series to all other supported series within the ``kolibri-proposed`` PPA::

    python3 scripts/launchpad_copy.py copy-to-series

``promote``
  Promotes all published packages from ``kolibri-proposed`` to the ``kolibri`` PPA::

    python3 scripts/launchpad_copy.py promote --version 0.19.0

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

Run the Launchpad-tooling unit tests from ``platforms/debian-server`` with::

  uv run python -O -m pytest

The ``pr_build_kolibri.yml`` PR build also builds the ``.deb`` and runs ``tests/serving_smoke_test.sh`` against it, asserting Kolibri is served behind Nginx/UWSGI after installation.
