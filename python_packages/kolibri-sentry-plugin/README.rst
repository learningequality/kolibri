
Kolibri Sentry Plugin
======================


How can I install this plugin?
------------------------------

1. Inside your Kolibri virtual environment:
    ``pip install kolibri-sentry-plugin``

2. Activate the plugin:

    ``kolibri plugin enable kolibri_sentry_plugin``

3. Restart Kolibri.

How can I install this plugin for development?
------------------------------------------------

1. From the root of the ``kolibri`` monorepo, install the Python and frontend dependencies:

    ``uv sync --all-packages``

    ``uvx prek install``

    ``pnpm install``

2. Activate the plugin:

    ``KOLIBRI_HOME="$(pwd)/.kolibri" uv run kolibri plugin enable kolibri_sentry_plugin``


How to publish to PyPi?
------------------------------

Publishing is automated by the ``pypi_packages_publish.yml`` GitHub Actions workflow.

- It lives in the monorepo root's ``.github/workflows/`` directory.
- It runs when this plugin's ``pyproject.toml`` version is bumped.
