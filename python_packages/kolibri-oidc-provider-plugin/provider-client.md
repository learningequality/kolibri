# Configuration example to test Kolibri as an OIDC provider and an OIDC client in the same local machine

This example will assume Kolibri is installed in the computer and pip is available for the version matching the Python version Kolibri is using.

For this example, Kolibri will have its home at `/tmp/provider`  for the OIDC provider and `/tmp/client` for the client provider. This can be changed to any other folder, specially if a non-POSIX OS.



## Provider configuration steps


IMPORTANT: For all the steps below you'll want to set your `KOLIBRI_HOME` to an alternate location so you can have another Kolibri running in parallel. This could be e.g. `/tmp/provider` or `~/.kolibri-oidc-provider`



1. `pip install kolibri-oidc-provider-plugin`

2. `kolibri plugin enable kolibri_oidc_provider_plugin`

3. `kolibri manage migrate`

4. `kolibri manage creatersakey`

5. Let's create an authorized client:

   `kolibri manage oidccreateclient --name=myapp --clientid=myclient.app --redirect-uri="http://127.0.0.1:9000/oidccallback/"`

   It will output a client secret code that must be used when configuring the client, replacing the `<secret_given_by_the_provider>` text below.

6. `yarn run build` to build assets

7. Start Kolibri with `kolibri start --foreground`, go through the wizard and create at least one user. Ensure to logout afterwards.

8. As a check, open this url in the browser: http://localhost:8080/.well-known/openid-configuration . It should show all the available OIDC endpoints.

## Client configuration steps

Here you'll need to set `KOLIBRI_HOME` to something different, e.g. `/tmp/client` or `~/.kolibri-oidc-client`.

You'll also need to set these environment variables:

```
CLIENT_ID=myclient.app
CLIENT_SECRET=<secret_given_by_the_provider>
KOLIBRI_OIDC_CLIENT_URL=http://localhost:8080/oidc_provider
KOLIBRI_HTTP_PORT=9000  # need a different port from the provider
```

1. `pip install kolibri-oidc-client-plugin`
2. `kolibri plugin enable kolibri_oidc_client_plugin`
3. Start Kolibri with `kolibri start --foreground`
4. Open a browser in http://127.0.0.1:9000 and use the OIDC authentication button: it should connect to the provider server (check the urls  jump to the urls with port 8080). **It's important to use *127.0.0.1* and not *localhost* in the url to avoid a cookies conflict if the provider has been open in the browser.**
5. Signing in with the user that has been created in the provider should be possible and it will appear as an user in the kolibri client server

