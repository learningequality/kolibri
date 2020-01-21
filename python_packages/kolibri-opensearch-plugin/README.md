
# Kolibri OpenSearch plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

OpenSearch is a collection of simple formats for the sharing of search results.

The OpenSearch description document format can be used to describe a search engine so that it can be used by search client applications.

The [OpenSearch response elements](https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#opensearch-response-elements) can be used to extend existing syndication formats, such as RSS and Atom, with the extra metadata needed to return search results.

This package provides Kolibri users with the needed endpoints to use a compatible OpenSearch interface.


## Limitations

This plugin has been developed with the following constraints of the Open Search implementations:

- There are not custom parameter in the search urls
- Pagination is not supported
- Results are returned in Atom format


## How can I install and use this plugin?

1. Inside your Kolibri virtual environment: `pip install kolibri_opensearch_plugin`

2. Activate the plugin: `kolibri plugin enable kolibri_opensearch_plugin`

3. Restart Kolibri.

4. The endpoint to download the Open Search XML descriptor in the usual application descriptor is `http://your_kolibri_server:port/opensearch`
