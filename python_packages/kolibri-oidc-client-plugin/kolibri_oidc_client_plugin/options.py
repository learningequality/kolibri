option_spec = {
    "OIDCClient": {
        "PROVIDER_URL": {
            "type": "string",
            "default": "http://127.0.0.1:5002/oauth",
            "envvars": ("KOLIBRI_OIDC_CLIENT_URL",),
        }
    }
}
