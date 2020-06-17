
# Kolibri OpenID Connect Provider plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

OpenID Connect (OIDC) is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server, as well as to obtain basic profile information about the End-User in an interoperable and REST-like manner.). See [openid.net/connect/faq](https://openid.net/connect/faq/) for more info.

This package provides a plugin to convert a  Kolibri server into a OIDC provider that can be use by external applications to authenticate, thus Kolibri becomes the source of truth when integrating it with another applications needing a single-sign-on (SSO) authentication.


## How can I install this plugin?

1. Inside your Kolibri virtual environment: `pip install kolibri_oidc_provider_plugin`

2. Activate the plugin: `kolibri plugin enable kolibri_oidc_provider_plugin`

3. Restart Kolibri

4. Create authorization clients that will use the provider, as explained below


## Plugin configuration

This plugin is based on the [Django OpenID Connect Provider library](https://github.com/juanifioren/django-oidc-provider/).

that can set to work as a standard OpenID Connect provider, so most of the library options have already been set and are not optional.


### Require consent setting

The standard OIDC protocol requires the user to grant permissions the first time an OIDC provider is used. In some special cases the implementation might need to avoid this extra step for the users. This plugin has an optional setting to skip the permission request. To use it:

Either add it to `$KOLIBRI_HOME/options.ini` a new section:

```ini
[OIDCProvider]
REQUIRE_CONSENT = False
```

## Creating new authorization clients
This plugin adds a management command, `oidccreateclient`, to create new clients that can use Kolibri to authenticate and authorize their users.
The command has these options:
* `name` : Name of the oidc client application. It can be text with less than 100 chars
* `clientid`: OIDC client identifier: It must be a string without spaces nor punctuation marks, with less than 255 chars
* `redirect-uri`: Url where the user will be redirected after the authentication is granted. If the authentication request does not include exactly this same url authentication will fail. More than one url can be added using this option
* `clientsecret`: OIDC secret. If the command is executed without providing one, it will generate and output it.

Usage examples:

`kolibri manage oidccreateclient  --name=myapp --clientid=myclient.app --redirect-uri="http://localhost:9000/openidconnect/api/callback/;https://mysite.com/auth;http://mysite.com/auth/"`

or

`kolibri manage oidccreateclient --name=portable_chile --clientid=portable.chile --redirect-uri=https://www.tuoportunidad.org/cms/openid-connect-authorize`


