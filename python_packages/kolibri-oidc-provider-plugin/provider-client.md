# Configuration example to test Kolibri as an OIDC provider and an OIDC client in the same local machine

This example will assume Kolibri is installed in the computer and pip is available for the version matching the Python version Kolibri is using.

For this example, Kolibri will have its home at `/tmp/provider`  for the OIDC provider and `/tmp/client` for the client provider. This can be changed to any other folder, specially if a non-POSIX OS.



## Provider configuration steps:

1. `pip install kolibri-oidc-provider-plugin`

2.  `kolibri plugin enable kolibri_oidc_provider_plugin`

3. `kolibri manage migrate`

4. `kolibri manage creatersakey`

5. Let's create an authorized client:

   `kolibri manage oidccreateclient --name=myapp --clientid=myclient.app --redirect-uri="http://localhost:9000/oidc/callback/`

   It will output a client secret code that must be used when configuring the client, replacing the `<secret_given_by_the_provider>` text below.

6. Start Kolibri with  `KOLIBRI_HOME=/tmp/provider kolibri start --foreground`, go through the wizard and create at least one user. Ensure to logout afterwards.

7. As a check, open this url in the browser: http://localhost:8080/.well-known/openid-configuration . It should show all the available OIDC endpoints.



## Client configuration steps:

1. `pip install kolibri-oidc-client-plugin`
2. `kolibri plugin enable kolibri_oidc_client_plugin`
3. Start Kolibri with `KOLIBRI_HOME=/tmp/client CLIENT_ID=myclient.app CLIENT_SECRET=<secret_given_by_the_provider> KOLIBRI_OIDC_CLIENT_URL=http://localhost:8080/oidc_provider KOLIBRI_HTTP_PORT=9000 kolibri start --foreground`
4. Open a browser in http://localhost:9000 and use the OIDC authentication button: it should connect to the provider server (check the urls  jump to the urls with port 8080)
5. Signing in with the user that has been created in the provider should be possible and it will appear as an user in the kolibri client server

