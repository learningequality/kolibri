

# Kolibri OpenID Connect Provider plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

OpenID Connect (OIDC) is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server, as well as to obtain basic profile information about the End-User in an interoperable and REST-like manner.). See [openid.net/connect/faq](https://openid.net/connect/faq/) for more info.

This package provides a plugin to convert a  Kolibri server into a OIDC provider that can be use by external applications to authenticate, thus Kolibri becomes the source of truth when integrating it with another applications needing a single-sign-on (SSO) authentication.


## How can I install this plugin?

**For this to work, kolibri >= 0.14 must be installed**

1. Inside your Kolibri virtual environment: `pip install kolibri-oidc-provider-plugin`

2. Activate the plugin: `kolibri plugin enable kolibri_oidc_provider_plugin`

3. Restart Kolibri

4. Create server RSA Keys and  authorization clients that will use the provider, as explained below


## Creating server RSA Keys
Previously to use the server authentication, an internal RSA Key must be created using the commands:
`kolibri manage migrate`
`kolibri manage creatersakey`

## Creating new authorization clients
This plugin adds a management command, `oidccreateclient`, to create new clients that can use Kolibri to authenticate and authorize their users.
The command has these options:
* `name`: (Required) Name of the oidc client application. It can be text with less than 100 chars.
* `clientid`: (Required) OIDC client identifier: It must be a string without spaces nor punctuation marks, with less than 255 chars. This is a required parameter.
* `redirect-uri`: (Required) Url where the user will be redirected after the authentication is granted. If the authentication request does not include exactly this same url authentication will fail. More than one url can be added using this option
* `clientsecret`: OIDC secret. If the command is executed without providing one, it will generate it and output it in the system prompt. It must be a 32 chars hexadecimal value (It's recommended not to provide one and use the secret this commands generates as it's created according to the [best practices](https://www.oauth.com/oauth2-servers/client-registration/client-id-secret/))

Usage examples:
`kolibri manage oidccreateclient  --name=myapp --clientid=myclient.app --redirect-uri="http://localhost:9000/openidconnect/api/callback/"`

or, if the site needs to use different redirect uris in the client server:

```
kolibri manage oidccreateclient --name=myapp --clientid=myclient.app --redirect-uri="http://localhost:9000/oidc/callback/
http://localhost:9000/oidc/callback
https://mysite.com/auth/
http://mysite.com/auth/"
```



### Created clients parameters

Clients created using the `oidccreateclient` command will have these settings (in addition to the parameters added when creating the client). Some of them might be needed when configuring the client server:

- Response_type: `code`
- Scope: `openid profile email`
- Client_type = `public`
- Allowed_responses = `code`, `id_token` or `id_token token`
- Algorithm to sign the jwt = `RS256`

All the server endpoints are available via the `OpenID Provider Discovery` url in the server provider address http://server/.well-known/openid-configuration , for example, if running Kolibri locally, at http://localhost:8080/.well-known/openid-configuration


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
Or supply the `REQUIRE_CONSENT` option setting in an environment variable called `KOLIBRI_OIDC_REQUIRE_CONSENT`.
