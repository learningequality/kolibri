
# Kolibri OpenID Connect Client plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

OpenID Connect (OIDC) is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server, as well as to obtain basic profile information about the End-User in an interoperable and REST-like manner.). See [openid.net/connect/faq](https://openid.net/connect/faq/) for more info.

This package provides Kolibri users with the ability to authenticate against an OpenID provider. This is usually a need when integrating it with another applications sharing a single-sign-on (SSO) authentication.


## How can I install this plugin?

1. Inside your Kolibri virtual environment: `pip install kolibri_oidc_client_plugin`

2. Activate the plugin: `kolibri plugin enable kolibri_oidc_client_plugin`

3. Restart Kolibri


## Plugin configuration

This plugin is based on the [Mozilla Django OIDC library](https://mozilla-django-oidc.readthedocs.io/en/stable/). The plugin has been set to work with a standard OpenID Connect provider, so most of the library options have already been set and are not optional.

Below are the only available configuration settings.


### OIDC provider URL

The OIDC provider URL can be set with one of two methods. If this setting is not configured, the plugin will use the default value  `http://127.0.0.1:5002/oauth`.

Either add it to `$KOLIBRI_HOME/options.ini` a new section:

```ini
[OIDCClient]
PROVIDER_URL=url of the OIDC provider
```

Or supply the `PROVIDER_URL` option setting in an environment variable called `KOLIBRI_OIDC_CLIENT_URL`.


### OIDC provider credentials

In order to the client requests to be authorized by the OIDC provider, a client ID and a client password must be used. These values must have been provided by the OIDC server provider.

They can be set using these two environment variables:

* `CLIENT_ID`
* `CLIENT_SECRET`

If they are not set, this plugin use the value `kolibri.app` for both settings.
