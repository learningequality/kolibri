
# Kolibri OpenID Connect Client plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

OpenID Connect (OIDC) is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server, as well as to obtain basic profile information about the End-User in an interoperable and REST-like manner.). See [openid.net/connect/faq](https://openid.net/connect/faq/) for more info.

This package provides Kolibri users with the ability to authenticate against an OpenID provider. This is usually a need when integrating it with another applications sharing a single-sign-on (SSO) authentication.


## How can I install this plugin?

After installing kolibri normally,

1. Install the plugin: `pip install kolibri-oidc-client-plugin`
2. Activate the plugin for kolibri: `kolibri plugin enable kolibri_oidc_client_plugin`
3. Configure the information from the OIDC provider as explained below
4. Restart Kolibri


## Used claims

This plugin will create a new user in the Kolibri database after it authenticates using the OIDC provider.
From the [standard OIDC claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) the plugin will fetch the following fields and add the information to the Kolibri user database:

- `nickname` (or `username`)  **IMPORTANT**: If kolibri >= 0.16 is used, emails can be used as `username`
- `given_name`
- `family_name`
- `email`
- `birthdate`
- `gender`

In case `birthdate`is provided, the accepted format is  [ISO8601‑2004] YYYY-MM-DD. However Kolibri only stores the year of birth.

Apart from these standard claims, the plugin will accept a  `roles` in the user_info token provided as a list. Allowed roles are only `admin` or `coach`.
If the role is not provided the user is created as a learner.

As an user_info token payload example:
```json
{"email":"jhon@doe.com", "username":"jdoe", "roles":"['coach']", "family_name":"Doe"}

```


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


### OIDC endpoints

In case some of the endpoints returned by the OIDC discovery url `.well-known/openid-configuration` are not standard, you can set them using these options either in the `$KOLIBRI_HOME/options.ini` file or by supplying them in an environment variable.

In the `options.ini` file:

```ini
[OIDCClient]
JWKS_URI=
AUTHORIZATION_ENDPOINT=
TOKEN_ENDPOINT=
USERINFO_ENDPOINT=
ENDSESSION_ENDPOINT=
CLIENT_URL=

```

Or, as environment variables:

```
KOLIBRI_OIDC_JWKS_URI
KOLIBRI_OIDC_AUTHORIZATION_ENDPOINT
KOLIBRI_OIDC_TOKEN_ENDPOINT
KOLIBRI_OIDC_USERINFO_ENDPOINT
KOLIBRI_OIDC_ENDSESSION_ENDPOINT
KOLIBRI_OIDC_CLIENT_URL
```

### Ending session in the OIDC provider from kolibri
If kolibri >= 0.14 is used, kolibri will be able to end the user session in the OIDC provider when the use logs out.
For it to work correctly, the `ENDSESSION_ENDPOINT` must contain the OIDC provider url to end the session and another option: `CLIENT_URL` must be set containing the exact base url of the server running Kolibri, for example: http://localhost:9000 . This feature is available only if kolibri version >= 0.14

#### Configuration example
This is the options.ini used to login and logout from a [KeyCloak](https://www.keycloak.org/) server:

```ini
[Deployment]
HTTP_PORT = 9000

[OIDCClient]
PROVIDER_URL = http://localhost:8080/auth/realms/master
AUTHORIZATION_ENDPOINT = http://localhost:8080/auth/realms/master/protocol/openid-connect/auth
TOKEN_ENDPOINT = http://localhost:8080/auth/realms/master/protocol/openid-connect/token
USERINFO_ENDPOINT = http://localhost:8080/auth/realms/master/protocol/openid-connect/userinfo
JWKS_URI = http://localhost:8080/auth/realms/master/protocol/openid-connect/certs
ENDSESSION_ENDPOINT = http://localhost:8080/auth/realms/master/protocol/openid-connect/logout
CLIENT_URL = http://localhost:9000
```

### OIDC provider credentials

In order to the client requests to be authorized by the OIDC provider, a client ID and a client password must be used. These values must have been provided by the OIDC server provider.

They can be set using these two environment variables:

* `CLIENT_ID`
* `CLIENT_SECRET`

**If they are not set**, this plugin use the value `kolibri.app` for **both** settings.