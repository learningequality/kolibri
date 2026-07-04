# Kolibri OpenSearch Plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

This package provides Kolibri users with the endpoints needed to expose a compatible [OpenSearch](https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#opensearch-response-elements) interface, so Kolibri content is searchable from browsers and other OpenSearch clients.

## Limitations

This plugin was developed with the following constraints on the OpenSearch implementation:

- No custom parameters in the search URLs.
- Pagination is not supported.
- Results are returned in Atom format.

## How can I install this plugin?

1. Inside your Kolibri virtual environment:

   `pip install kolibri-opensearch-plugin`

2. Activate the plugin:

   `kolibri plugin enable kolibri_opensearch_plugin`

3. Restart Kolibri.

## Usage

- The OpenSearch XML descriptor is served at `http://your_kolibri_server:port/opensearch`.
- The descriptor's search URL format is `http://your_kolibri_server:port/opensearch/opensearch/search/?q=<search term>`.

## How can I install this plugin for development?

1. From the root of the `kolibri` monorepo, install the Python dependencies:

   `uv sync --all-packages`

   `uvx prek install`

2. Activate the plugin:

   `KOLIBRI_HOME="$(pwd)/.kolibri" uv run kolibri plugin enable kolibri_opensearch_plugin`

## How to publish to PyPI?

Publishing is automated by the `pypi_packages_publish.yml` GitHub Actions workflow, and runs when this plugin's `pyproject.toml` version is bumped.
