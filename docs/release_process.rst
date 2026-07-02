.. _release_process:

Release process
===============

Kolibri releases are `tracked in Notion <https://www.notion.so/learningequality/Kolibri-releases-3119700069ff42e984da88ee11fe13a3>`__. This page contains:

* A 'Kolibri releases' tracker database
* A set of templates in the tracker database for Major/Minor and Final/pre-releases
* Checkslists of release steps
* Additional guidance on performing release steps

We also maintain a small set of `release process automation scripts <https://github.com/learningequality/kolibri-release-utils/>`__ which automate some processes.


npm packages
============

Packages in ``packages/`` are published to npm independently of Kolibri releases. Not all packages are published — those with ``"private": true`` in their ``package.json`` are skipped (currently ``kolibri-common``, ``kolibri-sandbox``, and ``kolibri-zip``).

Automatic publishing
--------------------

When code merging to ``develop`` changes files in ``packages/``, the ``npm_publish.yml`` workflow compares each public package's version against npm and publishes any that are newer. Packages are published in dependency order — if one fails, dependents are not published.

Authentication uses npm OIDC trusted publishing (no API tokens).

The workflow can also be triggered manually from the Actions tab — either for a specific package or for all packages.

Bumping a version
-----------------

.. code-block:: bash

   ./scripts/bump_version.sh <package-name> <patch|minor|major>

Commit the resulting ``package.json`` change and merge to ``develop``.

Workspace dependencies are published with ``^`` ranges, so patch and minor bumps don't require re-publishing dependents. Major bumps are breaking — bump dependents in the same PR.

First publish of a new package
------------------------------

The automated workflow skips packages that don't yet exist on npm. To first-publish:

.. code-block:: bash

   pnpm --filter <package-name> publish --access public

Then configure OIDC trusted publishing for the package on npmjs.com.

Provenance
----------

Every publish includes an SLSA provenance attestation linking the npm version to the exact commit and workflow run:

.. code-block:: bash

   ./scripts/npm_provenance.sh <package-name> [version]


Python packages
===============

Packages in ``python_packages/`` are published to PyPI independently of Kolibri releases and independently of each other. Only publishable packages are published; everything else is workspace-only. A package is publishable if it's listed in ``pypi_packages_publish.yml``'s ``paths:`` filter and ``workflow_dispatch`` options.

Automatic publishing
--------------------

When code merging to ``develop`` changes a listed package's ``pyproject.toml``, the ``pypi_packages_publish.yml`` workflow compares that package's version against PyPI and publishes it if newer.

Authentication uses PyPI OIDC trusted publishing (no API tokens).

The workflow can also be triggered manually from the Actions tab — either for a specific package or for all packages — and can target TestPyPI instead of PyPI via the ``target`` input.

Bumping a version
-----------------

.. code-block:: bash

   uv version --package <package-name> --bump patch

Or set an exact version: ``uv version --package <package-name> <new-version>``. Commit the resulting ``pyproject.toml``/``uv.lock`` change and merge to ``develop``.

First publish of a new package
------------------------------

PyPI and TestPyPI support registering a *pending* trusted publisher for a project that doesn't exist yet. Before merging the PR that adds the package, register a pending publisher on both `pypi.org <https://pypi.org/manage/account/publishing/>`__ and `test.pypi.org <https://test.pypi.org/manage/account/publishing/>`__ for the new project name, with owner ``learningequality``, repository ``kolibri``, and workflow ``pypi_packages_publish.yml``.
